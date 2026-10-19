import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compileFunction } from 'node:vm';
import ts from 'typescript';

await test('JSON server outcomes re-enter the existing Sonner flash listener exactly once', () => {
    const notifications = [];
    let listener;
    let removed = false;
    const router = {
        on(name, callback) {
            assert.equal(name, 'flash');
            listener = callback;
            return () => {
                removed = true;
            };
        },
        flash(key, value) {
            listener({ detail: { flash: { [key]: value } } });
        },
    };
    let cleanup;
    const exports = {};
    compileFunction(
        ts.transpileModule(
            readFileSync('resources/js/hooks/use-flash-toast.ts', 'utf8'),
            {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    target: ts.ScriptTarget.ES2022,
                },
            },
        ).outputText,
        ['require', 'exports'],
    )(
        (name) =>
            ({
                '@inertiajs/react': { router },
                react: {
                    useEffect: (callback) => {
                        cleanup = callback();
                    },
                },
                sonner: {
                    toast: { error: (message) => notifications.push(message) },
                },
            })[name] ?? {},
        exports,
    );

    exports.useFlashToast();
    assert.equal(
        exports.flashServerToast({
            toast: {
                type: 'error',
                message: 'Your account is not linked to an agency yet.',
            },
        }),
        true,
    );
    assert.deepEqual(notifications, [
        'Your account is not linked to an agency yet.',
    ]);
    for (const value of [
        null,
        {},
        { message: 'raw exception' },
        { toast: { type: 'invalid', message: 'bad' } },
        { toast: { type: 'error', message: {} } },
    ]) {
        assert.equal(exports.flashServerToast(value), false);
    }
    assert.equal(notifications.length, 1);
    cleanup();
    assert.equal(removed, true);
});
