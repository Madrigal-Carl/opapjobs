import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { compileFunction } from 'node:vm';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';

function loadModule(path, imports) {
    const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
        },
    }).outputText;
    const exports = {};
    compileFunction(compiled, ['require', 'exports'])((name) => {
        if (imports) return imports[name] ?? {};
        // The unrelated agency directory imports UI components.
        if (name === '@/data/agencies') return { agencies: [] };
        const dependency = name.startsWith('@/')
            ? resolve('resources/js', name.slice(2))
            : resolve(dirname(path), name);
        return loadModule(`${dependency}.ts`);
    }, exports);
    return exports;
}

const selectors = loadModule('resources/js/data/selectors.ts');
const ids = (query) =>
    selectors
        .getApplicationPage({ perPage: 100, ...query })
        .items.map(({ application }) => application.id);

await test('application search matches trimmed applicant names and job titles only', () => {
    assert.deepEqual(ids({ q: '  mARIA LOURDES  ' }), [1]);
    assert.deepEqual(ids({ q: ' eLECTRICIAN ' }), [7, 6, 10, 5, 4]);
    assert.deepEqual(ids({ q: 'Quezon City' }), []);
    assert.deepEqual(ids({ q: 'Al Muhaidib' }), []);
});

await test('application sorting orders dates and breaks ties by id before pagination', () => {
    assert.deepEqual(ids({}).slice(0, 2), [15, 3]);
    assert.deepEqual(ids({ sort: 'newest' }).slice(-4), [30, 21, 14, 4]);
    assert.deepEqual(ids({ sort: 'oldest' }).slice(0, 4), [4, 14, 21, 30]);
    assert.deepEqual(ids({ sort: 'oldest' }).slice(-2), [3, 15]);
    const result = selectors.getApplicationPage({ perPage: 1, page: 2 });
    assert.equal(result.items[0].application.id, 3);
    assert.equal(result.total, 30);
    assert.equal(result.totalPages, 30);
    assert.equal(result.page, 2);
});

await test('application stages filter using the new pipeline labels', () => {
    assert.deepEqual(
        ids({ stage: 'Under review', sort: 'oldest' }),
        [24, 16, 10, 2],
    );
    assert.deepEqual(selectors.getApplicationStageCounts(), {
        Pending: 12,
        'Under review': 4,
        Shortlisted: 4,
        Interviewed: 7,
        Hired: 3,
    });
});

await test('application KPIs count the entire dataset using today in local time', () => {
    const today = new Date(2026, 9, 11, 0, 1);
    assert.deepEqual(selectors.getApplicationDashboardKpis(today), {
        totalApplicants: 30,
        newApplicationsToday: 2,
        underReview: 4,
        shortlistedApplicants: 4,
    });
    assert.equal(
        selectors.getApplicationDashboardKpis(new Date(2026, 9, 12, 23, 59))
            .newApplicationsToday,
        0,
    );
});

await test('application pagination follows clamped results after a debounced search', () => {
    const states = [];
    let stateIndex = 0;
    let debouncedQ = '';
    const { default: Applications } = loadModule(
        'resources/js/pages/dashboard/applications.tsx',
        {
            'react/jsx-runtime': jsxRuntime,
            react: {
                useState(initial) {
                    const index = stateIndex++;
                    if (!(index in states)) states[index] = initial;
                    return [
                        states[index],
                        (value) => {
                            states[index] =
                                typeof value === 'function'
                                    ? value(states[index])
                                    : value;
                        },
                    ];
                },
            },
            '@/data/selectors': selectors,
            '@/hooks/use-debounced-value': {
                useDebouncedValue: () => debouncedQ,
            },
            '@/routes/dashboard': { applications: () => ({ url: '/' }) },
        },
    );
    function renderTable() {
        stateIndex = 0;
        return Applications().props.children[1].props.children[2].props;
    }

    let table = renderTable();
    table.toolbar.props.children[0].props.children.props.onChange(
        'Maria Lourdes',
    );
    table = renderTable();
    table.pagination.onPageChange(3);
    debouncedQ = 'Maria Lourdes';
    table = renderTable();

    assert.equal(table.pagination.totalPages, 1);
    assert.equal(table.pagination.page, 1);
    assert.deepEqual(
        table.data.map(({ application }) => application.id),
        [1],
    );
});
