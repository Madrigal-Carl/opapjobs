import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compileFunction } from 'node:vm';
import ts from 'typescript';
import * as zod from 'zod';

const exports = {};
compileFunction(
    ts.transpileModule(
        readFileSync('resources/js/data/staff-account-form.ts', 'utf8'),
        {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2022,
            },
        },
    ).outputText,
    ['require', 'exports'],
)((name) => (name === 'zod' ? zod : {}), exports);

const valid = () => ({
    name: 'New Staff',
    email: 'new.staff@example.test',
    phone: '+63 917 123 4567',
    notes: 'Handles placements.',
});
const messageFor = (overrides, field) =>
    exports.staffAccountFormSchema
        .safeParse({ ...valid(), ...overrides })
        .error?.issues.find((issue) => issue.path[0] === field)?.message;

await test('staff account rules reject what the server rejects with the same wording', () => {
    assert.equal(
        exports.staffAccountFormSchema.safeParse(valid()).success,
        true,
    );
    for (const [overrides, field, message] of [
        [{ name: '  ' }, 'name', 'Enter the staff member’s full name.'],
        [{ email: '' }, 'email', 'Enter a work email.'],
        [{ email: 'not-an-email' }, 'email', 'Enter a valid email address.'],
        [{ phone: 'call me' }, 'phone', 'Enter a valid mobile number.'],
        [
            { notes: 'x'.repeat(1001) },
            'notes',
            'Keep notes to 1,000 characters or fewer.',
        ],
    ]) {
        assert.equal(messageFor(overrides, field), message, field);
    }
});

await test('an untouched phone field holding only a dial code is valid and sent as empty', () => {
    assert.equal(messageFor({ phone: '+966' }, 'phone'), undefined);
    assert.equal(messageFor({ phone: '' }, 'phone'), undefined);

    const payload = exports.toStaffAccountPayload({
        ...valid(),
        name: '  New Staff  ',
        phone: '+966',
        notes: '   ',
    });
    assert.equal(payload.name, 'New Staff');
    assert.equal(payload.phone, null);
    assert.equal(payload.notes, null);
});

await test('editing prefills the form from the account and keeps empty optionals as blank strings', () => {
    assert.deepEqual(
        exports.staffAccountFormFromAccount({
            id: '7',
            fullName: 'Maria Santos',
            email: 'maria@example.test',
            phone: null,
            notes: null,
            status: 'Active',
            jobsCreated: 3,
        }),
        {
            name: 'Maria Santos',
            email: 'maria@example.test',
            phone: '',
            notes: '',
        },
    );
});
