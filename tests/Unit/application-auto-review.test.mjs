import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compileFunction } from 'node:vm';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';

const requests = [];
let refs = [];
let refIndex = 0;
const exports = {};
compileFunction(
    ts.transpileModule(
        readFileSync(
            'resources/js/components/dashboard/application-actions.tsx',
            'utf8',
        ),
        {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2022,
                jsx: ts.JsxEmit.ReactJSX,
            },
        },
    ).outputText,
    ['require', 'exports'],
)(
    (name) =>
        ({
            'react/jsx-runtime': jsxRuntime,
            react: {
                useState: (initial) => [initial, () => {}],
                // One component instance: every render sees the same refs.
                useRef: (initial) =>
                    (refs[refIndex++] ??= { current: initial }),
                useEffect: (callback) => callback(),
            },
            '@inertiajs/react': {
                router: {
                    patch: (url, data, options) =>
                        requests.push({ url, data, options }),
                },
            },
            '@/routes/dashboard/applications': {
                review: {
                    url: (id) => `/dashboard/applications/${id}/review`,
                },
            },
        })[name] ?? {},
    exports,
);

/** Renders the hook once on a fresh or reused component instance. */
function renderHook(applicationId, eligible, { fresh = false } = {}) {
    if (fresh) {
        refs = [];
    }
    refIndex = 0;
    exports.useAutoReviewOnOpen(applicationId, eligible);
}

await test('an eligible open sends one review request even when effects run twice', () => {
    requests.length = 0;
    renderHook(7, true, { fresh: true });
    renderHook(7, true);
    renderHook(7, true);

    assert.deepEqual(requests, [
        {
            url: '/dashboard/applications/7/review',
            data: {},
            options: { preserveScroll: true, only: ['application'] },
        },
    ]);
    assert.equal(
        'onStart' in requests[0].options,
        false,
        'the Proceed/Reject processing state is untouched',
    );
});

await test('an ineligible viewer sends nothing', () => {
    requests.length = 0;
    renderHook(7, false, { fresh: true });
    renderHook(7, false);

    assert.deepEqual(requests, []);
});

await test('opening another application on the same page instance reviews that one once', () => {
    requests.length = 0;
    renderHook(7, true, { fresh: true });
    renderHook(8, true);
    renderHook(8, true);

    assert.deepEqual(
        requests.map(({ url }) => url),
        [
            '/dashboard/applications/7/review',
            '/dashboard/applications/8/review',
        ],
    );
});
