import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compileFunction } from 'node:vm';
import ts from 'typescript';

function loadModule(path, imports) {
    // Vite supplies import.meta.env in the app entry; Node does not.
    const source = readFileSync(path, 'utf8').replaceAll(
        'import.meta.env',
        '({})',
    );
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
        },
    }).outputText;
    const exports = {};
    compileFunction(compiled, ['require', 'exports'])(
        (name) => imports[name] ?? {},
        exports,
    );
    return exports;
}

await test('table pagination uses the server page when a request clamps back to the previous page', () => {
    const states = [],
        refs = [],
        dependencies = [],
        effects = [];
    let stateIndex, refIndex, effectIndex;
    const react = {
        useState(initial) {
            const index = stateIndex++;
            if (!(index in states)) states[index] = initial;
            return [
                states[index],
                (value) => {
                    states[index] = value;
                },
            ];
        },
        useRef(initial) {
            return (refs[refIndex++] ??= { current: initial });
        },
        useCallback(callback) {
            return callback;
        },
        useEffect(callback, deps) {
            const index = effectIndex++;
            if (
                !dependencies[index]?.every((value, key) =>
                    Object.is(value, deps[key]),
                )
            ) {
                effects.push(callback);
                dependencies[index] = deps;
            }
        },
    };
    const { useServerTable } = loadModule(
        'resources/js/hooks/use-server-table.ts',
        {
            react,
            '@inertiajs/react': { router: { get() {} } },
            '@/hooks/use-debounced-value': {
                useDebouncedValue: (value) => value,
            },
        },
    );
    const filters = {
        q: null,
        status: 'active',
        recruitment_type: null,
        sort: 'newest',
        per_page: 10,
    };
    const props = {
        url: '/dashboard/jobs',
        filters,
        page: 1,
        defaults: { ...filters, status: null },
        only: ['jobPosts', 'filters'],
    };
    function render() {
        stateIndex = refIndex = effectIndex = 0;
        const table = useServerTable(props);
        while (effects.length) effects.shift()();
        return table;
    }

    let table = render();
    table.setPage(2);
    table = render();
    // The response remains page 1 with the same filters object after rows expire.
    props.page = 1;
    table = render();

    assert.equal(table.page, 1);
});

await test('a delayed Jobs KPI response preserves the newer filtered URL and history', async () => {
    const document = new EventTarget();
    document.querySelectorAll = () => [];
    document.querySelector = () => null;
    document.documentElement = { scrollTop: 0, scrollLeft: 0 };
    document.body = { scrollTop: 0, scrollLeft: 0 };
    const window = new EventTarget();
    window.location = new URL('http://localhost/dashboard/jobs');
    window.navigator = { userAgent: 'node-test' };
    window.performance = { getEntriesByType: () => [] };
    window.scrollX = window.scrollY = 0;
    window.scrollTo = () => {};
    window.requestAnimationFrame = (callback) =>
        setTimeout(() => callback(), 0);
    window.sessionStorage = {
        getItem: () => null,
        setItem() {},
        removeItem() {},
    };
    let pushes = 0;
    window.history = {
        state: null,
        replaceState(state, title, url) {
            this.state = state;
            if (url) window.location = new URL(url, window.location);
        },
        pushState(state, title, url) {
            pushes += 1;
            this.replaceState(state, title, url);
        },
    };
    globalThis.document = document;
    globalThis.window = window;
    globalThis.CustomEvent = class extends Event {
        constructor(type, options) {
            super(type, options);
            this.detail = options?.detail;
        }
    };
    const { router, http, config } = await import('@inertiajs/core');
    let appOptions;
    loadModule('resources/js/app.tsx', {
        '@inertiajs/react': {
            createInertiaApp: (options) => {
                appOptions = options;
            },
        },
        '@/routes/dashboard': { jobs: () => ({ url: '/dashboard/jobs' }) },
    });
    config.set('visitOptions', appOptions.defaults?.visitOptions);
    const initial = {
        component: 'dashboard/jobs',
        url: '/dashboard/jobs',
        props: {
            errors: {},
            filters: { status: null },
            jobPosts: { meta: { current_page: 1 } },
        },
        version: null,
        clearHistory: false,
        encryptHistory: false,
    };
    let latest = initial;
    router.init({
        initialPage: initial,
        resolveComponent: () => ({}),
        swapComponent: async ({ page }) => {
            latest = page;
        },
    });
    const pending = [];
    http.setClient({
        request: (requestConfig) =>
            new Promise((resolve) => pending.push({ requestConfig, resolve })),
    });
    const waitFor = async (condition) => {
        for (let attempt = 0; attempt < 100; attempt++) {
            if (condition()) return;
            await new Promise((resolve) => setTimeout(resolve, 5));
        }
        assert.fail('Inertia did not finish the expected request');
    };
    const reply = (request, props, url) =>
        request.resolve({
            data: { ...initial, props, url },
            status: 200,
            statusText: 'OK',
            headers: { 'x-inertia': 'true' },
            config: request.requestConfig,
        });
    await waitFor(() => window.history.state !== null);
    router.reload({ only: ['kpis'], preserveErrors: true });
    router.get(
        '/dashboard/jobs',
        { status: 'closed' },
        {
            only: ['jobPosts', 'filters'],
            replace: true,
            preserveState: true,
            preserveScroll: true,
        },
    );
    await waitFor(() => pending.length === 2);
    reply(
        pending[1],
        {
            filters: { status: 'closed' },
            jobPosts: { meta: { current_page: 1 } },
        },
        '/dashboard/jobs?status=closed',
    );
    await waitFor(() => latest.props.filters.status === 'closed');
    const pushesBeforeKpis = pushes;
    reply(pending[0], { kpis: { active_jobs: 3 } }, '/dashboard/jobs');
    await waitFor(() => latest.props.kpis !== undefined);

    assert.equal(window.location.search, '?status=closed');
    assert.equal(latest.props.filters.status, 'closed');
    assert.equal(latest.props.kpis.active_jobs, 3);
    assert.equal(pushes, pushesBeforeKpis);
    assert.deepEqual(
        appOptions.defaults.visitOptions('/dashboard/jobs', {
            only: ['jobPosts', 'filters'],
        }),
        {},
    );
    assert.deepEqual(
        appOptions.defaults.visitOptions('/dashboard/candidates', {
            only: ['kpis'],
        }),
        {},
    );
});
