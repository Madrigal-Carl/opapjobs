import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compileFunction } from 'node:vm';
import { cloneElement, createElement } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const container =
    (tag) =>
    ({ children, className, ...props }) =>
        createElement(
            tag,
            { className, 'aria-label': props['aria-label'] },
            children,
        );
const autoReviewCalls = [];
let pageAuth = { user: { id: 50, agency_id: 9 }, roles: ['agency'] };
const imports = {
    'react/jsx-runtime': jsxRuntime,
    react: { useState: (initial) => [initial, () => {}] },
    'lucide-react': new Proxy({}, { get: () => () => null }),
    '@inertiajs/react': {
        Head: () => null,
        Link: ({ href, children }) =>
            createElement('a', { href: href.url ?? href }, children),
        setLayoutProps: () => {},
        usePage: () => ({ props: { auth: pageAuth } }),
    },
    '@/components/dashboard/application-actions': {
        RejectApplicationDialog: () => null,
        useApplicationStageTransition: () => ({
            processing: false,
            proceed() {},
            reject() {},
        }),
        useAutoReviewOnOpen: (applicationId, eligible) =>
            autoReviewCalls.push({ applicationId, eligible }),
    },
    '@/components/dashboard/badges': {
        StageBadge: ({ stage }) => createElement('span', null, stage),
        PathwayBadge: ({ pathway }) => createElement('span', null, pathway),
    },
    '@/components/dashboard/form-section': {
        FormSection: ({ title, children }) =>
            createElement(
                'section',
                null,
                createElement('h2', null, title),
                children,
            ),
    },
    '@/components/dashboard/listing-fact-grid': {
        ListingFactGrid: ({ facts }) =>
            createElement(
                'dl',
                null,
                facts.map(({ label, value }) =>
                    createElement(
                        'div',
                        { key: label },
                        createElement('dt', null, label),
                        createElement('dd', null, value),
                    ),
                ),
            ),
    },
    '@/components/dashboard/listing-tag': { ListingTag: container('span') },
    '@/components/dashboard/page': { DashboardPage: container('main') },
    '@/components/dashboard/page-header': {
        PageHeader: ({ title, subtitle, actions }) =>
            createElement(
                'header',
                null,
                createElement('h1', null, title),
                subtitle,
                actions,
            ),
    },
    '@/components/ui/avatar': {
        Avatar: container('div'),
        AvatarFallback: container('div'),
    },
    '@/components/ui/button': {
        Button: ({
            asChild,
            children,
            disabled,
            className,
            'data-testid': testId,
        }) =>
            asChild
                ? cloneElement(children, { 'data-testid': testId })
                : createElement(
                      'button',
                      { disabled, className, 'data-testid': testId },
                      children,
                  ),
    },
    '@/components/ui/card': {
        Card: container('section'),
        CardContent: container('div'),
        CardHeader: container('header'),
        CardTitle: container('h2'),
    },
    '@/data/job-attributes': {
        CONTRACT_LABELS: { fixed: 'Fixed-term' },
        EDUCATION_LABELS: {},
        GENDER_LABELS: { any: 'Any' },
    },
    '@/data/job-questions': {
        getQuestionAnswerType: () => ({ label: 'Short answer' }),
    },
    '@/lib/application-utils': { elapsedSince: () => 'Applied today' },
    '@/routes/dashboard': {
        applications: () => ({ url: '/dashboard/applications' }),
    },
    '@/types/dashboard-application': {
        APPLICATION_STAGE_LABELS: {
            pending: 'Pending',
            reviewed: 'Reviewed',
            shortlisted: 'Shortlisted',
            for_interview: 'For Interview',
            endorsed: 'Endorsed',
            not_selected: 'Not Selected',
        },
    },
};
const exports = {};
compileFunction(
    ts.transpileModule(
        readFileSync(
            'resources/js/pages/dashboard/applications/show.tsx',
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

function detail(overrides = {}) {
    return {
        id: 7,
        stage: 'reviewed',
        submitted_at: '2026-10-01T09:00:00.000Z',
        cover_letter: 'My cover letter.',
        expected_monthly_salary: '0.00',
        availability: 'immediately',
        applicant: {
            id: 1,
            name: 'Maria Santos',
            initials: 'MS',
            email: 'maria@example.test',
            phone: null,
            headline: 'Welder',
            location: 'Cebu',
            pathway: null,
        },
        job: {
            id: 3,
            title: 'Senior Welder',
            employer: 'Example employer',
            agency: 'Example agency',
            pathway: null,
            location: 'Riyadh',
            salary: 'SAR 3,000',
            salary_currency: 'SAR',
            category: null,
            sub_category: null,
            posting_type: 'joborder',
            job_order_number: 'JO-2026-100',
            contract_type: 'fixed',
            vacancies: 2,
            education: null,
            gender_requirement: 'any',
            min_experience_years: null,
            max_experience_years: null,
            closing_date: null,
            posted_at: null,
            other_requirements: null,
            job_description: null,
            languages: [],
            required_documents: ['Valid passport'],
            application_instructions: 'Bring certificates.',
            contact_person_name: 'Job coordinator',
            contact_email: 'hiring@example.test',
            contact_phone: null,
            status: 'active',
            is_urgent: false,
            posted_by_user_id: 50,
            agency_id: 9,
            poster_is_admin: false,
        },
        questions: [
            {
                id: 1,
                label: 'Trade experience?',
                type: 'short',
                required: true,
                answer: 'Ten years',
            },
        ],
        documents: [
            {
                id: 1,
                name: 'Current primary.pdf',
                document_type: 'resume',
                size: '2 KB',
                url: '/files/current',
                primary: true,
                uploaded_at: null,
            },
            {
                id: 2,
                name: 'Chosen application CV.pdf',
                document_type: 'resume',
                size: '2 KB',
                url: '/files/chosen',
                primary: false,
                uploaded_at: null,
            },
        ],
        resume_document_id: 2,
        history: [],
        available_transitions: ['proceed', 'reject'],
        can_proceed: true,
        can_reject: true,
        next_stage: 'shortlisted',
        can_manage: true,
        ...overrides,
    };
}
const render = (application = detail()) =>
    renderToStaticMarkup(createElement(exports.default, { application }));

await test('application identity, salary and availability appear before screening details', () => {
    const html = render();
    assert.ok(html.indexOf('Maria Santos') < html.indexOf('Screening answers'));
    assert.ok(
        html.indexOf('Expected monthly salary') <
            html.indexOf('Screening answers'),
    );
    assert.ok(html.indexOf('Immediately') < html.indexOf('Screening answers'));
    assert.match(html, /SAR 0/);
});

await test('the resume chosen for this application is shown before other documents', () => {
    const html = render();
    assert.ok(
        html.indexOf('Chosen application CV.pdf') <
            html.indexOf('Current primary.pdf'),
    );
    assert.match(html, /Submitted resume/);
    assert.match(html, /button-preview-resume/);
    assert.match(html, /button-download-resume/);
});

await test('stored job context is visible without the candidate profile or candidate navigation', () => {
    const html = render();
    for (const value of [
        'JO-2026-100',
        'Valid passport',
        'Bring certificates.',
        'Job coordinator',
        'hiring@example.test',
    ]) {
        assert.ok(html.includes(value), value);
    }
    assert.doesNotMatch(html, /Candidate profile|View candidate/);
});

await test('terminal applications have no decision buttons and unavailable files have no dead links', () => {
    const application = detail({
        stage: 'endorsed',
        can_proceed: false,
        can_reject: false,
        next_stage: null,
        documents: [
            {
                id: 2,
                name: 'Unavailable CV.pdf',
                document_type: 'resume',
                size: '2 KB',
                url: null,
                primary: true,
                uploaded_at: null,
            },
        ],
    });
    const html = render(application);
    assert.doesNotMatch(
        html,
        /button-proceed-application|button-reject-application/,
    );
    assert.match(html, /File unavailable/);
    assert.doesNotMatch(html, /Soon/);
});

await test('stage progress marks the current stage and where a rejection happened', () => {
    assert.match(render(), /Reviewed<span class="sr-only"> \(current stage\)/);

    const rejected = render(
        detail({
            stage: 'not_selected',
            can_proceed: false,
            can_reject: false,
            next_stage: null,
            history: [
                {
                    id: 1,
                    from_stage: 'reviewed',
                    stage: 'not_selected',
                    changed_at: null,
                    changed_by: null,
                    note: null,
                },
            ],
        }),
    );
    assert.match(rejected, /Reviewed<span class="sr-only"> \(completed\)/);
    assert.match(
        rejected,
        /Not Selected<span class="sr-only"> \(current stage\)/,
    );
    assert.match(rejected, /Shortlisted<span class="sr-only"> \(not reached\)/);
});

await test('a previously selected but missing resume is not described as never selected', () => {
    const html = render(detail({ documents: [] }));
    assert.match(html, /The submitted resume is unavailable/);
    assert.doesNotMatch(html, /No resume was selected/);

    const unselected = render(
        detail({ documents: [], resume_document_id: null }),
    );
    assert.match(unselected, /No resume was selected/);
    assert.doesNotMatch(unselected, /The submitted resume is unavailable/);
});

await test('auto-review is requested only for a pending application and an eligible viewer', () => {
    const agencyPost = (overrides = {}) =>
        detail({ stage: 'pending', next_stage: 'shortlisted', ...overrides });
    const adminPost = (overrides = {}) =>
        agencyPost({
            job: {
                ...detail().job,
                posted_by_user_id: 60,
                poster_is_admin: true,
            },
            ...overrides,
        });
    const cases = [
        [
            'the poster',
            { id: 50, agency_id: 9 },
            ['agency'],
            agencyPost(),
            true,
        ],
        [
            'a same-agency admin',
            { id: 70, agency_id: 9 },
            ['admin'],
            agencyPost(),
            true,
        ],
        [
            'the admin poster',
            { id: 60, agency_id: 9 },
            ['admin'],
            adminPost(),
            true,
        ],
        [
            'the superadmin poster',
            { id: 50, agency_id: null },
            ['superadmin'],
            agencyPost(),
            true,
        ],
        [
            'another admin on an admin post',
            { id: 70, agency_id: 9 },
            ['admin'],
            adminPost(),
            false,
        ],
        [
            'an admin of another agency',
            { id: 70, agency_id: 4 },
            ['admin'],
            agencyPost(),
            false,
        ],
        [
            'an admin without an agency',
            { id: 70, agency_id: null },
            ['admin'],
            agencyPost(),
            false,
        ],
        [
            'a non-poster superadmin',
            { id: 80, agency_id: null },
            ['superadmin'],
            agencyPost(),
            false,
        ],
        [
            'a non-poster agency colleague',
            { id: 71, agency_id: 9 },
            ['agency'],
            agencyPost(),
            false,
        ],
        ...[
            'reviewed',
            'shortlisted',
            'for_interview',
            'endorsed',
            'not_selected',
        ].map((stage) => [
            `the poster on a ${stage} application`,
            { id: 50, agency_id: 9 },
            ['agency'],
            agencyPost({ stage }),
            false,
        ]),
    ];

    for (const [label, user, roles, application, eligible] of cases) {
        autoReviewCalls.length = 0;
        pageAuth = { user, roles };
        render(application);
        assert.deepEqual(
            autoReviewCalls,
            [{ applicationId: 7, eligible }],
            label,
        );
    }
});
