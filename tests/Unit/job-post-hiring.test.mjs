import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compileFunction } from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

await test('the jobs column shows endorsed applicants over vacancies instead of total applications', () => {
    const exports = {};
    const imports = {
        'react/jsx-runtime': jsxRuntime,
        'lucide-react': { Users: () => null },
        '@/routes/dashboard': { jobs: () => '/dashboard/jobs' },
    };
    compileFunction(
        ts.transpileModule(
            readFileSync('resources/js/pages/dashboard/jobs.tsx', 'utf8') +
                '\nexport { jobPostColumns };',
            {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    jsx: ts.JsxEmit.ReactJSX,
                },
            },
        ).outputText,
        ['require', 'exports'],
    )((name) => imports[name] ?? {}, exports);
    const column = exports.jobPostColumns.find(
        (column) => column.key === 'applicants',
    );

    for (const hired of [0, 2, 5]) {
        const html = renderToStaticMarkup(
            React.createElement(
                React.Fragment,
                null,
                column.cell({
                    applicants_count: 9,
                    hired_count: hired,
                    vacant_positions: 4,
                }),
            ),
        );
        assert.match(html, new RegExp(`>${hired}/4<`));
        assert.match(
            html,
            new RegExp(`aria-label="${hired} endorsed / 4 vacancies"`),
        );
    }
});
