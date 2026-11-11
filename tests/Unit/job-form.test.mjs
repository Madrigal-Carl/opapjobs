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
    answer_types: ['yesno', 'short', 'selection', 'number', 'paragraph'],
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
    // The base fixture is a job order posting, so it needs its number.
    jobOrderNumber: 'JO-2026-0001',
    questions: [],
    languages: [],
});
const question = (label = 'Qualified?') => ({
    label,
    type: 'yesno',
    answer: 'yes',
    required: true,
});

await test('new posts prefill removable salary and start questions without injecting them into edits', () => {
    const defaults = structuredClone(exports.emptyJobForm);
    assert.deepEqual(
        defaults.questions.map(({ type }) => type),
        ['number', 'selection'],
    );
    assert.deepEqual(defaults.questions[1].options, [
        'Immediately',
        'Within 2 weeks',
        'Within 1 month',
        'More than 1 month',
    ]);
    assert.equal(
        exports
            .createJobFormSchema(options, '2026-10-19', categories)
            .safeParse({ ...valid(), questions: defaults.questions }).success,
        true,
    );
    assert.deepEqual(
        exports.toJobPostPayload({ ...valid(), questions: [] }).questions,
        [],
    );
    assert.deepEqual(
        exports.fromJobPostPayload(
            { ...exports.toJobPostPayload(valid()), id: 42 },
            categories,
        ).questions,
        [],
    );
});

await test('the job location dropdown searches the job-search countries and stores the selected country', () => {
    const countries = {};
    compileFunction(
        ts.transpileModule(
            readFileSync('resources/js/data/countries.ts', 'utf8'),
            {
                compilerOptions: { module: ts.ModuleKind.CommonJS },
            },
        ).outputText,
        ['exports'],
    )(countries);
    const component = {};
    const state = [];
    let cursor = 0;
    let value = 'Riyadh, Saudi Arabia';
    const jsx = (type, props) => ({ type, props });
    const imports = {
        react: {
            useEffect() {},
            useState(initial) {
                const index = cursor++;
                if (!(index in state)) state[index] = initial;
                return [
                    state[index],
                    (next) => {
                        state[index] =
                            typeof next === 'function'
                                ? next(state[index])
                                : next;
                    },
                ];
            },
        },
        'react/jsx-runtime': { jsx, jsxs: jsx },
        'lucide-react': { MapPin: 'span' },
        '@/components/ui/input': { Input: 'input' },
        '@/data/countries': countries,
        '@/lib/utils': {
            cn: (...classes) => classes.filter(Boolean).join(' '),
        },
    };
    compileFunction(
        ts.transpileModule(
            readFileSync(
                'resources/js/components/dashboard/job-location-combobox.tsx',
                'utf8',
            ),
            {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    jsx: ts.JsxEmit.ReactJSX,
                },
            },
        ).outputText,
        ['require', 'exports'],
    )((name) => imports[name], component);
    const render = () => {
        cursor = 0;
        const nodes = [];
        const visit = (node) => {
            if (!node || typeof node !== 'object') return;
            if (Array.isArray(node)) return node.forEach(visit);
            nodes.push(node);
            visit(node.props?.children);
        };
        visit(
            component.JobLocationCombobox({
                id: 'job-location',
                value,
                onChange: (next) => {
                    value = next;
                },
            }),
        );
        return nodes;
    };
    const input = () => render().find((node) => node.type === 'input');
    assert.equal(
        input().props.value,
        'Riyadh, Saudi Arabia',
        'legacy job locations stay prefilled',
    );
    input().props.onChange({ target: { value: 'uni' } });
    assert.equal(
        value,
        '',
        'typing alone must not silently keep the previous location',
    );
    const matches = render().filter((node) => node.props?.role === 'option');
    assert.deepEqual(
        matches.map((node) => node.props.children),
        ['United Arab Emirates'],
    );
    input().props.onKeyDown({ key: 'Enter', preventDefault() {} });
    assert.equal(value, 'United Arab Emirates');
    input().props.onFocus();
    assert.equal(
        render().filter((node) => node.props?.role === 'option').length,
        countries.countryOptions.length,
    );
    input().props.onKeyDown({ key: 'Escape', preventDefault() {} });
    assert.equal(input().props['aria-expanded'], false);
});

await test('system-admin configured answer types support the prefilled screening questions', () => {
    const seeds = {};
    compileFunction(
        ts.transpileModule(
            readFileSync('resources/js/data/system/seeds/config.ts', 'utf8'),
            {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    target: ts.ScriptTarget.ES2022,
                },
            },
        ).outputText,
        ['require', 'exports'],
    )(() => ({ countryOptions: [] }), seeds);
    const answer_types = seeds
        .seedOptionLists()
        .question_answer_types.filter(
            (entry) => entry.active && entry.value !== 'paragraph',
        )
        .map((entry) => entry.value);
    assert.deepEqual(answer_types, ['yesno', 'short', 'selection', 'number']);
    const schema = exports.createJobFormSchema(
        { ...options, answer_types },
        '2026-10-19',
        categories,
    );
    assert.equal(
        schema.safeParse({
            ...valid(),
            questions: structuredClone(exports.emptyJobForm.questions),
        }).success,
        true,
    );
});

await test('selection choices survive validation payload editing and copying in order', () => {
    const questions = [
        {
            ...question('When can you start?'),
            type: 'selection',
            answer: '',
            options: [' Now ', 'Next month'],
        },
    ];
    const parsed = exports
        .createJobFormSchema(options, '2026-10-19', categories)
        .parse({ ...valid(), questions });
    const payload = exports.toJobPostPayload(parsed);
    assert.deepEqual(payload.questions[0].options, ['Now', 'Next month']);
    const edited = exports.fromJobPostPayload(
        { ...payload, id: 42, questions: [{ ...payload.questions[0], id: 7 }] },
        categories,
    );
    assert.deepEqual(edited.questions[0].options, ['Now', 'Next month']);
    const copied = exports.copyQuestion(edited.questions[0]);
    assert.deepEqual(copied.options, ['Now', 'Next month']);
    copied.options.push('Later');
    assert.deepEqual(edited.questions[0].options, ['Now', 'Next month']);
    assert.equal(
        exports.serverErrorField('questions.1.options.0'),
        'questions.1.options',
    );
});

for (const choices of [
    undefined,
    [],
    ['Only'],
    ['Now', ' '],
    ['Now', ' now '],
    ['Now', 'x'.repeat(256)],
    Array.from({ length: 21 }, (_, i) => `Choice ${i}`),
]) {
    await test(`selection rejects invalid choices: ${JSON.stringify(choices)}`, () => {
        const result = exports
            .createJobFormSchema(options, '2026-10-19', categories)
            .safeParse({
                ...valid(),
                questions: [
                    {
                        ...question(),
                        type: 'selection',
                        answer: '',
                        options: choices,
                    },
                ],
            });
        assert.equal(result.success, false);
        assert.ok(
            result.error.issues.some(
                ({ path }) => path.join('.') === 'questions.0.options',
            ),
        );
    });
}

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
            questions: [{ ...question(), type: 'short', answer: '' }],
        }).success,
        true,
    );
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
        'paragraph answer type',
        { questions: [{ ...question(), type: 'paragraph', answer: '' }] },
        'questions.0.type',
    ],
    [
        'short expected answer',
        {
            questions: [
                { ...question(), type: 'short', answer: 'Expected response' },
            ],
        },
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
                answer: 'Stale answer from an earlier question type',
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
    // The base fixture is a job order posting, so its number passes through.
    // An empty document list is still sent so the server can clear a stale one.
    assert.equal(payload.job_order_number, 'JO-2026-0001');
    assert.deepEqual(payload.required_documents, []);
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
            'job_order_number',
            'required_documents',
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

await test('only a job order posting requires and sends its order number', () => {
    const schema = exports.createJobFormSchema(
        options,
        '2026-10-19',
        categories,
    );
    assert.equal(
        schema.safeParse({
            ...valid(),
            jobOrderNumber: '',
        }).success,
        false,
        'a job order posting without a number must not validate',
    );
    assert.equal(
        schema.safeParse({
            ...valid(),
            postingType: 'joborder',
            jobOrderNumber: 'JO-2026-0184',
        }).success,
        true,
    );
    assert.equal(
        schema.safeParse({
            ...valid(),
            postingType: 'manpooling',
        }).success,
        true,
        'manpooling must not demand a job order number',
    );

    const jobOrder = exports.toJobPostPayload({
        ...valid(),
        postingType: 'joborder',
        jobOrderNumber: '  JO-2026-0184  ',
        requiredDocuments: ['  COC  ', 'PSNC'],
    });
    assert.equal(jobOrder.job_order_number, 'JO-2026-0184');
    assert.deepEqual(jobOrder.required_documents, ['COC', 'PSNC']);

    // A number typed before the toggle moved must not survive the switch.
    const manpooling = exports.toJobPostPayload({
        ...valid(),
        postingType: 'manpooling',
        jobOrderNumber: 'JO-2026-0184',
    });
    assert.equal(manpooling.job_order_number, null);
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

function screeningFieldNodes(questions, overrides = {}) {
    const component = {};
    const jsx = (type, props) => ({ type, props });
    const imports = {
        react: { useState: (value) => [value, () => {}] },
        'react/jsx-runtime': { jsx, jsxs: jsx },
        'react-hook-form': {
            useFieldArray: () => ({
                fields: questions.map((question, id) => ({ ...question, id })),
            }),
            useWatch: () => questions,
        },
        '@/data/job-form': exports,
    };
    compileFunction(
        ts.transpileModule(
            readFileSync(
                'resources/js/components/dashboard/job-post-questions-field.tsx',
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
    )((name) => imports[name] ?? {}, component);
    const tree = component.JobPostQuestionsField({
        control: {},
        register: () => ({}),
        setValue() {},
        errors: {},
        options: ['yesno', 'short', 'selection', 'number'],
        ...overrides,
    });
    const nodes = [];
    const visit = (node) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(visit);
        nodes.push(node);
        visit(node.props?.children);
    };
    visit(tree);
    return nodes;
}

await test('screening fields show an expected-answer control only for yes/no questions', () => {
    const nodes = screeningFieldNodes([
        { ...question('Describe your experience'), type: 'short', answer: '' },
        question('Do you hold a license?'),
        {
            ...question('When can you start?'),
            type: 'selection',
            answer: '',
            options: ['Now', 'Later'],
        },
        { ...question('Expected salary?'), type: 'number', answer: '' },
    ]);

    assert.equal(
        nodes.some(
            (node) => node.props?.['data-field'] === 'questions.0.answer',
        ),
        false,
    );
    assert.equal(
        nodes.some(
            (node) =>
                node.props?.['data-testid'] === 'input-question-option-2-0',
        ),
        true,
    );
    for (const index of [0, 2, 3]) {
        assert.equal(
            nodes.some(
                (node) =>
                    node.props?.['data-testid'] ===
                    `select-question-answer-${index}`,
            ),
            false,
        );
    }
    assert.equal(
        nodes.some(
            (node) =>
                node.props?.['data-testid'] === 'select-question-answer-1',
        ),
        true,
    );
    assert.equal(
        nodes.some(
            (node) =>
                node.props?.['data-testid'] === 'question-type-0-paragraph',
        ),
        false,
    );
});

await test('selection choices can be edited added and removed individually without changing other choices', () => {
    const questions = [
        {
            ...question('When?'),
            type: 'selection',
            answer: '',
            options: ['Now', 'Next month'],
        },
    ];
    const previousFrame = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = () => 0;
    try {
        const render = () =>
            screeningFieldNodes(questions, {
                setValue(path, value) {
                    const [, index, field] = path.split('.');
                    questions[Number(index)][field] = value;
                },
            });
        const get = (id) =>
            render().find((node) => node.props?.['data-testid'] === id);
        assert.equal(get('input-question-option-0-0').props.value, 'Now');
        assert.equal(
            get('input-question-option-0-1').props.value,
            'Next month',
        );
        assert.equal(
            render().some((node) => node.props?.rows),
            false,
            'no multiline choices control',
        );

        get('input-question-option-0-0').props.onChange({
            target: { value: 'Next week' },
        });
        assert.deepEqual(questions[0].options, ['Next week', 'Next month']);
        get('button-add-question-option-0').props.onClick();
        assert.deepEqual(questions[0].options, ['Next week', 'Next month', '']);
        get('input-question-option-0-2').props.onChange({
            target: { value: 'Later' },
        });
        get('button-remove-question-option-0-1').props.onClick();
        assert.deepEqual(questions[0].options, ['Next week', 'Later']);
        assert.deepEqual(
            exports.toJobPostPayload({ ...valid(), questions }).questions[0]
                .options,
            ['Next week', 'Later'],
        );

        questions[0].options = Array.from(
            { length: 20 },
            (_, i) => `Choice ${i}`,
        );
        assert.equal(get('button-add-question-option-0').props.disabled, true);
        render()
            .find(
                (node) =>
                    node.props?.onValueChange &&
                    node.props.value === 'selection',
            )
            .props.onValueChange('short');
        assert.deepEqual(questions[0].options, []);
        render()
            .find(
                (node) =>
                    node.props?.onValueChange && node.props.value === 'short',
            )
            .props.onValueChange('selection');
        assert.deepEqual(questions[0].options, ['', '']);
        get('button-remove-question-option-0-0').props.onClick();
        get('button-remove-question-option-0-0').props.onClick();
        assert.deepEqual(questions[0].options, []);
        get('button-add-question-option-0').props.onClick();
        assert.deepEqual(questions[0].options, ['']);
    } finally {
        globalThis.requestAnimationFrame = previousFrame;
    }
});

await test('editing legacy text questions clears expected answers and makes paragraph questions short answers', () => {
    const post = {
        ...exports.toJobPostPayload(valid()),
        id: 42,
        questions: [
            {
                id: 7,
                question_text: 'Describe your experience',
                answer_type: 'short',
                expected_answer: 'Old expected answer',
                is_required: true,
            },
            {
                id: 8,
                question_text: 'Describe your skills',
                answer_type: 'paragraph',
                expected_answer: 'Old paragraph answer',
                is_required: false,
            },
        ],
    };

    const form = exports.fromJobPostPayload(post, categories);
    const parsed = exports
        .createJobFormSchema(options, '2026-10-19', categories)
        .parse(form);
    const payload = exports.toJobPostPayload(parsed);

    assert.deepEqual(payload.questions, [
        {
            id: 7,
            question_text: 'Describe your experience',
            answer_type: 'short',
            expected_answer: null,
            is_required: true,
        },
        {
            id: 8,
            question_text: 'Describe your skills',
            answer_type: 'short',
            expected_answer: null,
            is_required: false,
        },
    ]);
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

await test('editing maps server values back and preserves database question ids through validation and submission', () => {
    const post = {
        ...exports.toJobPostPayload(valid()),
        id: 42,
        monthly_salary_min: '2500.50',
        monthly_salary_max: null,
        min_experience_years: 0,
        required_documents: ['COC'],
        closing_date: '2026-11-01',
        is_urgent: true,
        languages: [{ language: 'english', proficiency: 'fluent' }],
        questions: [
            {
                id: 7,
                question_text: 'Qualified?',
                answer_type: 'yesno',
                expected_answer: null,
                is_required: true,
            },
        ],
    };
    const form = exports.fromJobPostPayload(post, categories);
    assert.equal(form.categoryId, 1);
    assert.equal(form.salaryMin, '2500.50');
    assert.equal(form.salaryMax, '');
    assert.equal(form.minExperienceYears, '0');
    assert.equal(form.closingDate, '2026-11-01');
    assert.equal(form.urgent, true);
    assert.deepEqual(form.requiredDocuments, ['COC']);
    const parsed = exports
        .createJobFormSchema(options, '2026-10-19', categories)
        .parse(form);
    const payload = exports.toJobPostPayload(parsed);
    assert.deepEqual(payload.questions, post.questions);
    assert.deepEqual(payload.languages, post.languages);
    assert.equal(payload.monthly_salary_min, 2500.5);
    assert.equal(payload.job_order_number, 'JO-2026-0001');
    assert.equal('id' in payload, false);
    assert.deepEqual(exports.copyQuestion(form.questions[0]), {
        ...question(),
        answer: '',
    });
});

await test('client rules reject what the server rejects with the same wording', () => {
    const schema = exports.createJobFormSchema(
        options,
        '2026-10-19',
        categories,
    );
    const messageFor = (overrides, path) =>
        schema
            .safeParse({ ...valid(), ...overrides })
            .error?.issues.find((issue) => issue.path.join('.') === path)
            ?.message;

    for (const quantity of [Number.NaN, 0, 1.5, 65536]) {
        assert.equal(
            messageFor({ quantity }, 'quantity'),
            'Enter between 1 and 65,535 vacant positions.',
        );
    }
    assert.equal(
        messageFor(
            { requiredDocuments: ['x'.repeat(256)] },
            'requiredDocuments.0',
        ),
        'Keep each document name to 255 characters or fewer.',
    );
    assert.equal(
        messageFor({ location: 'x'.repeat(256) }, 'location'),
        'Keep this to 255 characters or fewer.',
    );
    assert.equal(
        messageFor({ salaryMin: '3000', salaryMax: '2000' }, 'salaryMax'),
        'Maximum salary must be at least the minimum.',
    );
    assert.equal(
        schema.safeParse({ ...valid(), requiredDocuments: ['x'.repeat(255)] })
            .success,
        true,
    );
});
