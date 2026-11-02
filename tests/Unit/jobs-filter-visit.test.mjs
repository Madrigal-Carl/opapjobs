import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compileFunction } from 'node:vm';
import ts from 'typescript';
import * as publicCatalog from '../../resources/js/lib/public-catalog.ts';

/** Renders the jobs page once with stand-in hooks and records router calls. */
function renderJobsPage(filters) {
    const visits = [];
    const jsx = (type, props) => ({ type, props });
    const imports = {
        react: {
            useState: (initial) => [
                typeof initial === 'function' ? initial() : initial,
                () => {},
            ],
            useRef: (current) => ({ current }),
            useEffect: () => {},
            useMemo: (create) => create(),
            useCallback: (callback) => callback,
        },
        'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
        '@inertiajs/react': {
            Head: 'Head',
            usePage: () => ({ props: { auth: { user: null } } }),
            router: {
                cancelAll: () => {},
                get: (url, data, options) =>
                    visits.push({ url, data, options }),
                reload: () => {},
                visit: () => {},
            },
        },
        '@/contexts/applications-context': {
            useApplications: () => ({
                isApplied: () => false,
                isSaved: () => false,
                toggleSaved: () => {},
            }),
        },
        '@/data/countries': { countryOptions: [] },
        '@/hooks/use-debounced-value': { useDebouncedValue: (value) => value },
        '@/lib/public-catalog': publicCatalog,
        '@/lib/utils': { cn: (...names) => names.filter(Boolean).join(' ') },
        '@/routes': { login: { url: () => '/login' } },
        '@/routes/jobs': {
            index: { url: () => '/jobs' },
            show: { url: (id) => `/job/${id}` },
            apply: { url: (id) => `/job/${id}/apply` },
        },
    };
    const exports = {};

    compileFunction(
        ts.transpileModule(
            readFileSync('resources/js/pages/jobs/index.tsx', 'utf8'),
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

    const props = {
        jobPosts: [],
        jobPostsMeta: { page: 1, hasMore: false, nextPage: null, total: 0 },
        filters,
    };
    const browser = exports.default(props).props.children;
    const tree = browser.type(browser.props);

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

    return { visits, pill: (filter) => find(tree, `filter-${filter}`) };
}

await test('a filter click is a full visit, so the filters and totals come back with the results', () => {
    const page = renderJobsPage({ q: '', country: '', filters: ['landbased'] });

    page.pill('seabased').props.onClick();

    assert.equal(page.visits.length, 1);
    assert.equal(page.visits[0].url, '/jobs');
    assert.deepEqual(page.visits[0].data, { filters: ['seabased'] });
    // `reset` or `only` turn the visit into a partial reload that returns
    // just those props, leaving the pills on the previous search.
    assert.equal(page.visits[0].options.reset, undefined);
    assert.equal(page.visits[0].options.only, undefined);
    assert.equal(page.visits[0].options.preserveState, true);
});

await test('a second click before the page re-renders builds on the first', () => {
    const page = renderJobsPage({ q: 'welder', country: '', filters: [] });

    page.pill('seabased').props.onClick();
    page.pill('urgent').props.onClick();
    page.pill('seabased').props.onClick();

    assert.deepEqual(
        page.visits.map((visit) => visit.data),
        [
            { q: 'welder', filters: ['seabased'] },
            { q: 'welder', filters: ['seabased', 'urgent'] },
            { q: 'welder', filters: ['urgent'] },
        ],
    );
});

await test('the pills show the page filters as active', () => {
    const page = renderJobsPage({
        q: '',
        country: '',
        filters: ['seabased', 'recent'],
    });

    assert.deepEqual(
        ['landbased', 'seabased', 'urgent', 'recent'].map(
            (filter) => page.pill(filter).props['aria-pressed'],
        ),
        [false, true, false, true],
    );
    assert.equal(
        page.pill('seabased').props.className,
        'jobs-filter-pill active',
    );
    assert.equal(page.pill('landbased').props.className, 'jobs-filter-pill');
});
