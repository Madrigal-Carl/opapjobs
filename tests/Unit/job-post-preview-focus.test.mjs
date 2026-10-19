import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compileFunction } from 'node:vm';
import ts from 'typescript';

function preview(onValidationClose, calls) {
    const exports = {};
    const jsx = (type, props) => ({ type, props });
    const imports = {
        react: {
            useRef: () => ({ current: { focus: () => calls.push('restore') } }),
        },
        'react/jsx-runtime': { jsx, jsxs: jsx },
        '@/data/job-attributes': {
            formatSalary: () => ({ amount: '', period: '' }),
            GENDER_LABELS: {},
            formatApplyBy: () => '',
        },
        '@/data/agency-context': { PATHWAY_LABELS: {} },
    };
    compileFunction(
        ts.transpileModule(
            readFileSync(
                'resources/js/components/dashboard/job-post-preview-dialog.tsx',
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
    )((name) => imports[name] ?? {}, exports);
    return exports.JobPostPreviewDialog({
        open: false,
        onOpenChange() {},
        onConfirm() {},
        onValidationClose,
        duplicates: [],
        job: { salary: '', gender: 'any', pathway: 'landbased' },
    }).props.children.props;
}

await test('preview close gives server-validation errors focus instead of restoring the review button', () => {
    const calls = [];
    const dialog = preview(() => {
        calls.push('invalid');
        return true;
    }, calls);
    let prevented = false;
    dialog.onCloseAutoFocus({
        preventDefault() {
            prevented = true;
        },
    });
    assert.equal(prevented, true);
    assert.deepEqual(calls, ['invalid']);
});

await test('ordinary preview dismissal still restores the original control', () => {
    const calls = [];
    const dialog = preview(() => false, calls);
    dialog.onCloseAutoFocus({ preventDefault() {} });
    assert.deepEqual(calls, ['restore']);
});
