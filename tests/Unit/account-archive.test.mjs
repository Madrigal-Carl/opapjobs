import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compileFunction } from 'node:vm';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';

function find(element, predicate) {
    if (!element || typeof element !== 'object') return null;
    if (Array.isArray(element))
        return (
            element.map((child) => find(child, predicate)).find(Boolean) ?? null
        );
    return predicate(element)
        ? element
        : find(element.props?.children, predicate);
}

function accountsPage(canManageAccounts = true) {
    const state = [];
    let cursor = 0;
    const requests = [];
    const exports = {};
    const imports = {
        'react/jsx-runtime': jsxRuntime,
        react: {
            useRef: () => ({ current: null }),
            useState(initial) {
                const index = cursor++;
                if (!(index in state)) state[index] = initial;
                return [
                    state[index],
                    (value) => {
                        state[index] = value;
                    },
                ];
            },
        },
        '@inertiajs/react': {
            router: {
                patch: (url, data, options) =>
                    requests.push({ url, data, options }),
            },
        },
        '@/components/dashboard/data-table': { DataTable: 'data-table' },
        '@/components/ui/dialog': { Dialog: 'dialog' },
        '@/hooks/use-server-table': {
            useServerTable: () => ({ values: {}, reset() {}, setPage() {} }),
        },
        '@/routes/dashboard': {
            accounts: () => ({ url: '/dashboard/accounts' }),
        },
        '@/routes/dashboard/accounts': {
            archive: (id) => ({ url: `/dashboard/accounts/${id}/archive` }),
            status: (id) => ({ url: `/dashboard/accounts/${id}/status` }),
        },
    };
    compileFunction(
        ts.transpileModule(
            readFileSync('resources/js/pages/dashboard/accounts.tsx', 'utf8'),
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
    const row = {
        id: 2,
        name: 'Maria Santos',
        email: 'maria@example.test',
        status: 'active',
        jobs_created: 1,
    };
    const render = () => {
        cursor = 0;
        return exports.default({
            staff: { data: [row], meta: { current_page: 1, last_page: 1 } },
            filters: {},
            seats: { used: 1, limit: 1 },
            canManageAccounts,
        });
    };
    const removeItem = () => {
        const table = find(
            render(),
            (element) => element.type === 'data-table',
        );
        const menu = table.props.renderRowActions(row).props.children[1];
        return find(
            menu.type(menu.props),
            (element) =>
                element.props?.['data-testid'] === 'button-remove-staff-2',
        );
    };
    const dialog = () =>
        find(
            render(),
            (element) =>
                element.type === 'dialog' &&
                Boolean(
                    find(
                        element.props.children,
                        (child) =>
                            child.props?.['data-testid'] ===
                            'dialog-remove-staff',
                    ),
                ),
        );
    const confirm = () =>
        find(
            render(),
            (element) =>
                element.props?.['data-testid'] ===
                'button-confirm-remove-staff',
        );
    return { requests, render, removeItem, dialog, confirm };
}

await test('Remove asks for confirmation before archiving and closes only after success', () => {
    const page = accountsPage();
    const item = page.removeItem();
    assert.ok(item, 'The account actions should include Remove');
    assert.equal(item.props.variant, 'destructive');
    item.props.onSelect();
    assert.equal(page.requests.length, 0);
    assert.equal(page.dialog().props.open, true);

    page.confirm().props.onClick();
    assert.equal(page.requests.length, 1);
    assert.equal(page.requests[0].url, '/dashboard/accounts/2/archive');
    assert.deepEqual(page.requests[0].data, {});
    assert.equal(page.requests[0].options.preserveScroll, true);
    page.requests[0].options.onSuccess();
    page.requests[0].options.onFinish();
    assert.equal(page.dialog().props.open, false);
});

await test('failed removal keeps confirmation open and busy removal cannot be repeated or dismissed', () => {
    const page = accountsPage();
    const item = page.removeItem();
    assert.ok(item, 'The account actions should include Remove');
    item.props.onSelect();
    page.confirm().props.onClick();
    assert.equal(page.confirm().props.loading, true);
    page.confirm().props.onClick();
    assert.equal(page.requests.length, 1);
    page.dialog().props.onOpenChange(false);
    assert.equal(page.dialog().props.open, true);

    page.requests[0].options.onFinish();
    assert.equal(page.dialog().props.open, true);
    assert.equal(page.confirm().props.loading, false);
});

await test('accounts cannot be removed without the management capability', () => {
    const page = accountsPage(false);
    assert.equal(page.removeItem(), null);
    assert.equal(page.requests.length, 0);
});
