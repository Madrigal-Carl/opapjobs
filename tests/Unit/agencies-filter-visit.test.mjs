import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compileFunction } from 'node:vm';
import ts from 'typescript';

/** Renders the directory once with stand-in hooks and records router calls. */
function renderDirectory(filters, { typed = null, listOpen = false } = {}) {
    const visits = [];
    const jsx = (type, props) => ({ type, props });
    const effects = [];
    const imports = {
        react: {
            // `false` initials are the open / busy flags: `listOpen` shows the list.
            useState: (initial) => [
                initial === false ? listOpen : initial,
                () => {},
            ],
            useRef: (current) => ({ current }),
            useEffect: (effect) => effects.push(effect),
            useMemo: (create) => create(),
            useCallback: (callback) => callback,
        },
        'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
        '@inertiajs/react': {
            Head: 'Head',
            router: {
                get: (url, data, options) =>
                    visits.push({ url, data, options }),
            },
        },
        '@/hooks/use-debounced-value': {
            useDebouncedValue: (value) => typed ?? value,
        },
        '@/routes/agencies': { index: { url: () => '/agencies' } },
    };
    const exports = {};

    compileFunction(
        ts.transpileModule(
            readFileSync('resources/js/pages/agencies/index.tsx', 'utf8'),
            {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    target: ts.ScriptTarget.ES2022,
                    jsx: ts.JsxEmit.ReactJSX,
                },
            },
        ).outputText,
        ['require', 'exports'],
    )((name) => imports[name] ?? {}, exports);

    const tree = exports.default({
        agencies: { items: [], total: 0, totalPages: 1, page: filters.page },
        countryOptions: ['Qatar', 'Saudi Arabia'],
        filters,
    });

    const find = (node, testId) => {
        if (!node || typeof node !== 'object') {
            return null;
        }

        if (Array.isArray(node)) {
            return (
                node.map((child) => find(child, testId)).find(Boolean) ?? null
            );
        }

        if (node.props?.['data-testid'] === testId) {
            return node;
        }

        return find(node.props?.children, testId);
    };

    return {
        visits,
        runEffects: () => effects.forEach((effect) => effect()),
        control: (testId) => find(tree, testId),
        find: (type) => {
            const search = (node) => {
                if (!node || typeof node !== 'object') {
                    return null;
                }

                if (Array.isArray(node)) {
                    return node.map(search).find(Boolean) ?? null;
                }

                return node.type === type ? node : search(node.props?.children);
            };

            return search(tree);
        },
    };
}

const noFilters = { pathway: 'landbased', q: '', country: '', page: 1 };

await test('a typed country reaches the server once it settles', () => {
    const page = renderDirectory(noFilters, {
        typed: { q: '', country: ' Qatar ' },
    });

    page.runEffects();

    assert.deepEqual(
        page.visits.map((visit) => visit.data),
        [{ pathway: 'landbased', country: 'Qatar' }],
    );
});

await test('emptying the country input clears the filter', () => {
    const page = renderDirectory(
        { ...noFilters, country: 'Qatar' },
        { typed: { q: '', country: '' } },
    );

    page.runEffects();

    assert.deepEqual(
        page.visits.map((visit) => visit.data),
        [{ pathway: 'landbased' }],
    );
});

await test('a keyword landing mid-request keeps a pathway just clicked', () => {
    const page = renderDirectory(noFilters, {
        typed: { q: 'global', country: '' },
    });

    page.control('filter-agencies-seabased').props.onClick();
    page.runEffects();

    assert.deepEqual(
        page.visits.map((visit) => visit.data),
        [{ pathway: 'seabased' }, { pathway: 'seabased', q: 'global' }],
    );
});

await test('a country picked from the list is requested straight away and survives the next visit', () => {
    const page = renderDirectory(noFilters, { listOpen: true });

    page.control('option-agencies-country-Qatar').props.onClick();
    page.control('filter-agencies-seabased').props.onClick();

    assert.deepEqual(
        page.visits.map((visit) => visit.data),
        [
            { pathway: 'landbased', country: 'Qatar' },
            { pathway: 'seabased', country: 'Qatar' },
        ],
    );
});

await test('a new search starts again from the first page', () => {
    const page = renderDirectory({ ...noFilters, q: 'global', page: 3 });

    page.control('filter-agencies-seabased').props.onClick();

    assert.deepEqual(page.visits[0].data, {
        pathway: 'seabased',
        q: 'global',
    });
});

await test('submitting sends what is in both inputs', () => {
    const page = renderDirectory({
        ...noFilters,
        q: 'global',
        country: 'Qatar',
    });

    page.find('form').props.onSubmit({ preventDefault: () => {} });

    assert.deepEqual(page.visits[0].data, {
        pathway: 'landbased',
        q: 'global',
        country: 'Qatar',
    });
});
