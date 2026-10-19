import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compileFunction } from 'node:vm';
import ts from 'typescript';
import * as zod from 'zod';

const exports = {};
compileFunction(
    ts.transpileModule(readFileSync('resources/js/data/job-form.ts', 'utf8'), {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
        },
    }).outputText,
    ['require', 'exports'],
)((name) => (name === 'zod' ? zod : {}), exports);

const options = {
    currencies: ['SAR', 'USD'],
    contract_types: ['fixed', 'permanent', 'seasonal'],
    education_levels: ['secondary', 'vocational', 'bachelor', 'master'],
    genders: ['any', 'male', 'female'],
    recruitment_types: ['joborder', 'manpooling'],
    languages: ['english', 'arabic'],
    proficiencies: ['basic', 'conversational', 'fluent'],
    answer_types: ['yesno', 'short', 'paragraph'],
};
const categories = [
    { id: 1, name: 'Trades', subcategories: [{ id: 2, name: 'Electrician' }] },
];
const valid = () => ({
    ...exports.emptyJobForm,
    title: 'Electrician',
    categoryId: 1,
    subcategoryId: 2,
    location: 'Riyadh',
    description: '**Install** safely.',
    education: 'vocational',
    questions: [],
    languages: [],
});
const question = (label = 'Qualified?') => ({
    label,
    type: 'yesno',
    answer: 'yes',
    required: true,
});

await test('the real job post schema accepts optional experience and zero or twenty questions', () => {
    const schema = exports.createJobFormSchema(
        options,
        '2026-10-19',
        categories,
    );
    assert.equal(schema.safeParse(valid()).success, true);
    assert.equal(
        schema.safeParse({
            ...valid(),
            questions: Array.from({ length: 20 }, (_, i) =>
                question(`Question ${i}`),
            ),
        }).success,
        true,
    );
});

/** @type {Array<[string, Record<string, unknown>, string]>} */
const invalidCases = [
    ['missing title', { title: ' ' }, 'title'],
    ['long title', { title: 'x'.repeat(256) }, 'title'],
    ['wrong category relationship', { subcategoryId: 99 }, 'subcategoryId'],
    ['zero quantity', { quantity: 0 }, 'quantity'],
    ['large quantity', { quantity: 65536 }, 'quantity'],
    ['contract enum', { contractDuration: 'invalid' }, 'contractDuration'],
    ['education enum', { education: 'any' }, 'education'],
    ['gender enum', { gender: 'unknown' }, 'gender'],
    ['recruitment enum', { postingType: 'unknown' }, 'postingType'],
    ['past closing date', { closingDate: '2026-10-18' }, 'closingDate'],
    ['invalid date', { closingDate: '2026-02-30' }, 'closingDate'],
    ['salary range', { salaryMin: '3,000', salaryMax: '2,000' }, 'salaryMax'],
    [
        'salary currency',
        { salaryMin: '0', salaryCurrency: '' },
        'salaryCurrency',
    ],
    ['salary precision', { salaryMin: '1.001' }, 'salaryMin'],
    ['salary bound', { salaryMax: '10,000,000,000' }, 'salaryMax'],
    [
        'experience range',
        { minExperienceYears: '5', maxExperienceYears: '3' },
        'maxExperienceYears',
    ],
    ['experience bound', { maxExperienceYears: '256' }, 'maxExperienceYears'],
    ['bad email', { contactEmail: 'invalid' }, 'contactEmail'],
    ['HTML', { description: '<script>alert(1)</script>' }, 'description'],
    [
        'HTML other requirements',
        { otherRequirements: '<b>Qualifications</b>' },
        'otherRequirements',
    ],
    [
        'HTML instructions',
        { applyInstructions: '<script' },
        'applyInstructions',
    ],
    ['long description', { description: 'x'.repeat(20001) }, 'description'],
    [
        'long requirements',
        { otherRequirements: 'x'.repeat(20001) },
        'otherRequirements',
    ],
    [
        'long instructions',
        { applyInstructions: 'x'.repeat(20001) },
        'applyInstructions',
    ],
    [
        'unknown language',
        { languages: [{ language: 'invented', proficiency: 'basic' }] },
        'languages.0.language',
    ],
    [
        'unknown proficiency',
        { languages: [{ language: 'english', proficiency: 'expert' }] },
        'languages.0.proficiency',
    ],
    [
        'duplicate language',
        {
            languages: Array(2).fill({
                language: 'english',
                proficiency: 'basic',
            }),
        },
        'languages.1.language',
    ],
    ['blank question', { questions: [question(' ')] }, 'questions.0.label'],
    [
        'long question',
        { questions: [question('x'.repeat(256))] },
        'questions.0.label',
    ],
    [
        'long answer',
        {
            questions: [
                { ...question(), type: 'short', answer: 'x'.repeat(2001) },
            ],
        },
        'questions.0.answer',
    ],
    [
        'yesno answer',
        { questions: [{ ...question(), answer: 'maybe' }] },
        'questions.0.answer',
    ],
    [
        'duplicate text',
        { questions: [question('Qualified? '), question(' qualified?')] },
        'questions.1.label',
    ],
    [
        '21 questions',
        {
            questions: Array.from({ length: 21 }, (_, i) =>
                question(`Question ${i}`),
            ),
        },
        'questions',
    ],
];
for (const [name, changes, path] of invalidCases) {
    await test(`job post schema rejects ${name} at the correct field`, () => {
        const result = exports
            .createJobFormSchema(options, '2026-10-19', categories)
            .safeParse({ ...valid(), ...changes });
        assert.equal(result.success, false);
        assert.ok(
            result.error.issues.some((issue) => issue.path.join('.') === path),
            JSON.stringify(result.error.issues),
        );
    });
}

await test('the payload maps every field to the server contract and strips client authority and question metadata', () => {
    const payload = exports.toJobPostPayload({
        ...valid(),
        employerId: 7,
        salaryMin: '2,500.50',
        salaryMax: '',
        otherRequirements: ' Qualifications ',
        questions: [
            { ...question(' First '), id: 'client', sort_order: 50 },
            {
                ...question('Second'),
                type: 'short',
                answer: '',
                required: false,
            },
        ],
        agency_id: 999,
        posted_by_user_id: 999,
        status: 'archived',
    });
    assert.equal(payload.employer_id, 7);
    assert.equal(payload.job_title, 'Electrician');
    assert.equal(payload.job_subcategory_id, 2);
    assert.equal(payload.monthly_salary_min, 2500.5);
    assert.equal(payload.monthly_salary_max, null);
    assert.equal(payload.other_requirements, 'Qualifications');
    assert.equal(payload.application_instructions, null);
    assert.equal(payload.min_experience_years, null);
    assert.equal(payload.contact_phone, null);
    assert.deepEqual(payload.questions, [
        {
            question_text: 'First',
            answer_type: 'yesno',
            expected_answer: 'yes',
            is_required: true,
        },
        {
            question_text: 'Second',
            answer_type: 'short',
            expected_answer: null,
            is_required: false,
        },
    ]);
    assert.deepEqual(
        Object.keys(payload).sort(),
        [
            'recruitment_type',
            'employer_id',
            'job_title',
            'job_subcategory_id',
            'work_location',
            'vacant_positions',
            'contract_type',
            'salary_currency',
            'monthly_salary_min',
            'monthly_salary_max',
            'education_level',
            'min_experience_years',
            'max_experience_years',
            'gender_requirement',
            'job_description',
            'other_requirements',
            'application_instructions',
            'contact_person_name',
            'contact_email',
            'contact_phone',
            'closing_date',
            'is_urgent',
            'languages',
            'questions',
        ].sort(),
    );
});

await test('question helpers preserve values but never duplicate field-array ids or move beyond bounds', () => {
    assert.deepEqual(
        exports.copyQuestion({ ...question(), id: 'old' }),
        question(),
    );
    assert.equal(exports.questionMoveTarget(0, -1, 3), null);
    assert.equal(exports.questionMoveTarget(2, 1, 3), null);
    assert.equal(exports.questionMoveTarget(1, -1, 3), 0);
    assert.equal(exports.questionMoveTarget(1, 1, 3), 2);
});

await test('nested backend error keys map to the matching form row without inventing fields', () => {
    assert.equal(
        exports.serverErrorField('questions.2.question_text'),
        'questions.2.label',
    );
    assert.equal(
        exports.serverErrorField('questions.6.expected_answer'),
        'questions.6.answer',
    );
    assert.equal(
        exports.serverErrorField('questions.6.answer_type'),
        'questions.6.type',
    );
    assert.equal(
        exports.serverErrorField('languages.0.language'),
        'languages.0.language',
    );
    assert.equal(exports.serverErrorField('monthly_salary_max'), 'salaryMax');
    assert.equal(
        exports.serverErrorField('other_requirements'),
        'otherRequirements',
    );
    assert.equal(exports.serverErrorField('agency_id'), null);
});
