import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { compileFunction } from 'node:vm';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';

function loadModule(path, imports) {
    const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
        },
    }).outputText;
    const exports = {};
    compileFunction(compiled, ['require', 'exports'])((name) => {
        if (imports) return imports[name] ?? {};
        // The unrelated agency directory imports UI components.
        if (name === '@/data/agencies') return { agencies: [] };
        const dependency = name.startsWith('@/')
            ? resolve('resources/js', name.slice(2))
            : resolve(dirname(path), name);
        return loadModule(`${dependency}.ts`);
    }, exports);
    return exports;
}

const selectors = loadModule('resources/js/data/selectors.ts');
const ids = (query) =>
    selectors
        .getApplicationPage({ perPage: 100, ...query })
        .items.map(({ application }) => application.id);

await test('application search matches trimmed applicant names and job titles only', () => {
    assert.deepEqual(ids({ q: '  mARIA LOURDES  ' }), [1]);
    assert.deepEqual(ids({ q: ' eLECTRICIAN ' }), [7, 6, 10, 5, 4]);
    assert.deepEqual(ids({ q: 'Quezon City' }), []);
    assert.deepEqual(ids({ q: 'Al Muhaidib' }), []);
});

await test('application sorting orders dates and breaks ties by id before pagination', () => {
    assert.deepEqual(ids({}).slice(0, 2), [15, 3]);
    assert.deepEqual(ids({ sort: 'newest' }).slice(-4), [30, 21, 14, 4]);
    assert.deepEqual(ids({ sort: 'oldest' }).slice(0, 4), [4, 14, 21, 30]);
    assert.deepEqual(ids({ sort: 'oldest' }).slice(-2), [3, 15]);
    const result = selectors.getApplicationPage({ perPage: 1, page: 2 });
    assert.equal(result.items[0].application.id, 3);
    assert.equal(result.total, 30);
    assert.equal(result.totalPages, 30);
    assert.equal(result.page, 2);
});

await test('application stages filter using the new pipeline labels', () => {
    assert.deepEqual(
        ids({ stage: 'Reviewed', sort: 'oldest' }),
        [24, 16, 10, 2],
    );
    assert.deepEqual(selectors.getApplicationStageCounts(), {
        Pending: 12,
        Reviewed: 4,
        Shortlisted: 4,
        'For Interview': 7,
        Endorsed: 3,
        'Not Selected': 0,
    });
});

await test('application KPIs count the entire dataset using today in local time', () => {
    const today = new Date(2026, 9, 11, 0, 1);
    assert.deepEqual(selectors.getApplicationDashboardKpis(today), {
        totalApplicants: 30,
        newApplicationsToday: 2,
        reviewed: 4,
        shortlistedApplicants: 4,
    });
    assert.equal(
        selectors.getApplicationDashboardKpis(new Date(2026, 9, 12, 23, 59))
            .newApplicationsToday,
        0,
    );
});

await test('application table uses server rows, pagination, stage labels and deferred KPIs', () => {
    let tableOptions;
    const filterChanges = [];
    const filters = { q: null, stage: null, sort: 'newest', per_page: 10 };
    const serverTable = {
        values: filters,
        page: 2,
        loading: true,
        setFilter: (...args) => filterChanges.push(args),
        reset: () => {},
        setPage: () => {},
    };
    const { default: Applications } = loadModule(
        'resources/js/pages/dashboard/applications.tsx',
        {
            'react/jsx-runtime': jsxRuntime,
            react: {
                useState: (initial) => [initial, () => {}],
            },
            '@/components/dashboard/application-actions': {
                RejectApplicationDialog: () => null,
                useApplicationStageTransition: () => ({
                    processing: false,
                    proceed: () => {},
                    reject: () => {},
                }),
            },
            '@/components/ui/dropdown-menu': {
                DropdownMenu: ({ children }) =>
                    jsxRuntime.jsx('div', { children }),
                DropdownMenuTrigger: () => null,
                DropdownMenuContent: () => null,
                DropdownMenuItem: () => null,
            },
            '@/hooks/use-server-table': {
                useServerTable(options) {
                    tableOptions = options;
                    return serverTable;
                },
            },
            '@/routes/dashboard': {
                applications: () => ({ url: '/dashboard/applications' }),
            },
            '@/routes/dashboard/applications': {
                show: (id) => ({ url: `/dashboard/applications/${id}` }),
            },
            '@/types/dashboard-application': loadModule(
                'resources/js/types/dashboard-application.ts',
            ),
        },
    );
    const row = {
        id: 42,
        applicant_name: 'Maria Santos',
        job_title: 'Welder',
        employer_name: null,
        stage: 'reviewed',
        submitted_at: new Date(2026, 9, 1, 12).toISOString(),
        available_transitions: ['proceed', 'reject'],
        can_proceed: true,
        next_stage: 'shortlisted',
        can_reject: true,
    };
    const props = {
        applications: { data: [row], meta: { current_page: 2, last_page: 3 } },
        filters,
        canManageApplications: true,
    };
    const render = (kpis) =>
        Applications({ ...props, kpis }).props.children[1].props.children;
    const [, kpiGrid, tableElement] = render();
    const table = tableElement.props;

    assert.equal(tableOptions.url, '/dashboard/applications');
    assert.deepEqual(tableOptions.only, ['applications', 'filters']);
    assert.equal(tableOptions.page, 2);
    assert.equal(tableOptions.filters, filters);
    assert.deepEqual(tableOptions.defaults, filters);
    assert.equal(table.data[0], row);
    assert.equal(table.loading, true);
    assert.equal(table.pagination.totalPages, 3);
    assert.equal(table.pagination.page, 2);
    assert.equal(table.pagination.onPageChange, serverTable.setPage);
    assert.equal(table.getRowId(row), '42');
    assert.equal(table.columns[0].cell(row).props.children, 'Maria Santos');
    assert.equal(table.columns[1].cell(row).props.children, 'Welder');
    for (const [stage, label] of Object.entries({
        pending: 'Pending',
        reviewed: 'Reviewed',
        shortlisted: 'Shortlisted',
        for_interview: 'For Interview',
        endorsed: 'Endorsed',
        not_selected: 'Not Selected',
    })) {
        assert.equal(
            table.columns[2].cell({ ...row, stage }).props.stage,
            label,
        );
    }
    assert.equal(table.columns[3].cell(row), 'Oct 1, 2026');
    const fields = table.toolbar.props.children;
    fields[0].props.children.props.onChange('Maria');
    fields[1].props.children.props.onValueChange('oldest');
    fields[2].props.children.props.onValueChange('reviewed');
    fields[2].props.children.props.onValueChange('all');
    assert.deepEqual(filterChanges, [
        ['q', 'Maria'],
        ['sort', 'oldest'],
        ['stage', 'reviewed'],
        ['stage', null],
    ]);
    assert.equal(fields[3].props.onClick, serverTable.reset);
    assert.equal(fields[3].props.spinning, true);
    assert.ok(kpiGrid.props.children.every((card) => card.props.loading));
    const loaded = render({
        total_applicants: 12,
        new_today: 2,
        reviewed: 4,
        shortlisted: 3,
    });
    assert.deepEqual(
        loaded[1].props.children.map((card) => card.props.value),
        [12, 2, 4, 3],
    );
    assert.ok(loaded[1].props.children.every((card) => !card.props.loading));
    assert.equal(loaded[1].props.children[2].props.label, 'Reviewed');
    const menu = table.renderRowActions(row);
    const dropdown = menu.type(menu.props).props.children[0];
    const [viewItem, proceedItem, rejectItem] = dropdown.type(dropdown.props)
        .props.children[1].props.children;
    assert.deepEqual(viewItem.props.children.props.href, {
        url: '/dashboard/applications/42',
    });
    assert.equal(
        viewItem.props.children.props['data-testid'],
        'button-view-application-42',
    );
    assert.equal(
        proceedItem.props['data-testid'],
        'button-proceed-application-42',
    );
    assert.equal(
        proceedItem.props.children
            .filter((child) => typeof child === 'string')
            .join(''),
        'Proceed to Shortlisted',
    );
    assert.equal(proceedItem.props.disabled, false);
    assert.equal(
        rejectItem.props['data-testid'],
        'button-reject-application-42',
    );
    assert.equal(rejectItem.props.variant, 'destructive');

    const terminalMenu = table.renderRowActions({
        ...row,
        can_proceed: false,
        next_stage: null,
        can_reject: false,
    });
    const terminalDropdown = terminalMenu.type(terminalMenu.props).props
        .children[0];
    const terminalItems = terminalDropdown.type(terminalDropdown.props).props
        .children[1].props.children;
    assert.equal(terminalItems.filter(Boolean).length, 1);
});

await test('application detail uses the server application prop and keeps hooks before the missing-application return', () => {
    const transitionCalls = [];
    const autoReviewCalls = [];
    let layoutProps;
    let selectedState = 0;
    const { default: ShowApplication } = loadModule(
        'resources/js/pages/dashboard/applications/show.tsx',
        {
            'react/jsx-runtime': jsxRuntime,
            '@inertiajs/react': {
                Head: () => null,
                Link: () => null,
                setLayoutProps: (props) => {
                    layoutProps = props;
                },
                usePage: () => ({
                    props: {
                        auth: { user: { id: 50, agency_id: 9 }, roles: [] },
                    },
                }),
            },
            react: {
                useState(initial) {
                    selectedState += 1;
                    return [initial, () => {}];
                },
            },
            '@/components/dashboard/application-actions': {
                RejectApplicationDialog: () => null,
                useApplicationStageTransition(only, id) {
                    transitionCalls.push([only, id]);
                    return {
                        processing: false,
                        proceed: () => {},
                        reject: () => {},
                    };
                },
                useAutoReviewOnOpen(id, eligible) {
                    autoReviewCalls.push([id, eligible]);
                },
            },
            '@/data/job-attributes': {
                CONTRACT_LABELS: {},
                EDUCATION_LABELS: {},
            },
            '@/data/job-questions': {
                getQuestionAnswerType: () => ({ label: 'Short answer' }),
            },
            '@/lib/application-utils': {
                elapsedSince: () => 'Applied today',
            },
            '@/routes/dashboard': {
                applications: () => ({ url: '/dashboard/applications' }),
            },
            '@/types/applicant-profile': { SKILL_LEVEL_DOTS: {} },
            '@/types/dashboard-application': loadModule(
                'resources/js/types/dashboard-application.ts',
            ),
        },
    );
    const application = {
        id: 7,
        stage: 'shortlisted',
        submitted_at: '2026-10-01T09:00:00.000Z',
        cover_letter: null,
        expected_monthly_salary: null,
        availability: null,
        applicant: {
            id: 1,
            name: 'Maria Santos',
            initials: 'MS',
            email: 'maria@example.com',
            phone: null,
            headline: null,
            location: null,
            pathway: null,
        },
        job: {
            id: 3,
            title: 'Welder',
            employer: null,
            agency: null,
            pathway: null,
            location: null,
            salary: 'PHP 30,000',
            salary_currency: 'PHP',
            category: null,
            sub_category: null,
            posting_type: 'joborder',
            job_order_number: null,
            contract_type: null,
            vacancies: 2,
            education: null,
            gender_requirement: null,
            min_experience_years: null,
            max_experience_years: null,
            closing_date: null,
            posted_at: null,
            other_requirements: null,
            job_description: null,
            required_documents: [],
            application_instructions: null,
            contact_person_name: null,
            contact_email: null,
            contact_phone: null,
            status: 'active',
            is_urgent: false,
            posted_by_user_id: 50,
            agency_id: 9,
            poster_is_admin: false,
            languages: [],
        },
        questions: [],
        documents: [],
        resume_document_id: null,
        history: [],
        available_transitions: ['proceed', 'reject'],
        can_proceed: true,
        next_stage: 'for_interview',
        can_reject: true,
        can_manage: true,
    };

    ShowApplication({});
    assert.deepEqual(transitionCalls[0], [['application'], 0]);
    assert.deepEqual(autoReviewCalls[0], [0, false]);
    assert.equal(layoutProps.breadcrumbs[1].title, 'Application not found');

    ShowApplication({ application });
    assert.deepEqual(transitionCalls[1], [['application'], 7]);
    assert.deepEqual(autoReviewCalls[1], [7, false]);
    assert.equal(selectedState, 2);
    assert.deepEqual(layoutProps.breadcrumbs, [
        { title: 'Applications', href: { url: '/dashboard/applications' } },
        { title: 'Maria Santos', href: '#' },
    ]);
});

await test('application details are deterministic, candidate-specific and do not mutate source records', () => {
    const { getApplicationDetail } = loadModule(
        'resources/js/data/application-details.ts',
    );
    const { application, applicant, job } = selectors.getApplicationRow(1);
    const before = structuredClone({ application, applicant, job });

    const detail = getApplicationDetail(application, applicant, job);

    assert.deepEqual(detail, getApplicationDetail(application, applicant, job));
    assert.deepEqual({ application, applicant, job }, before);
    assert.equal(detail.email, 'maria.lourdes.santos@example.com');
    assert.equal(detail.headline, applicant.role);
    assert.equal(detail.availability, applicant.availability);
    assert.equal(detail.experiences[0].role, applicant.role);
    assert.equal(detail.experiences[0].location, applicant.location);
    assert.deepEqual(
        detail.skills.map((skill) => skill.name),
        applicant.skills,
    );
    assert.equal(detail.documents[0].id, detail.resumeId);
    assert.equal(detail.documents[0].primary, true);
    assert.equal(detail.documents.length, 3);
    assert.ok(detail.documents.every((document) => document.url === ''));
    assert.notEqual(
        detail.phone,
        getApplicationDetail(application, { ...applicant, id: 2 }, job).phone,
    );
});

await test('application answers use the candidate rather than job examples and omit only one optional answer', () => {
    const { getApplicationDetail } = loadModule(
        'resources/js/data/application-details.ts',
    );
    const { application, applicant, job } = selectors.getApplicationRow(2);
    const questions = [
        {
            id: 'yes',
            type: 'yesno',
            label: 'Available?',
            answer: 'EXAMPLE',
            required: true,
        },
        {
            id: 'short',
            type: 'short',
            label: 'Experience?',
            answer: 'EXAMPLE',
            required: true,
        },
        {
            id: 'paragraph',
            type: 'paragraph',
            label: 'Describe your work',
            answer: 'EXAMPLE',
            required: true,
        },
        {
            id: 'optional-1',
            type: 'short',
            label: 'Anything else?',
            answer: 'EXAMPLE',
        },
        {
            id: 'optional-2',
            type: 'short',
            label: 'Further notes?',
            answer: 'EXAMPLE',
        },
    ];

    const detail = getApplicationDetail(application, applicant, {
        ...job,
        questions,
    });

    assert.equal(detail.answers.yes, 'Yes');
    assert.ok(detail.answers.short.includes(applicant.experience));
    assert.ok(detail.answers.paragraph.includes(applicant.role));
    assert.ok(
        Object.values(detail.answers).every(
            (answer) => !answer.includes('EXAMPLE'),
        ),
    );
    assert.equal(detail.answers['optional-1'], undefined);
    assert.ok(detail.answers['optional-2']);
    assert.equal(
        Object.keys(
            getApplicationDetail({ ...application, id: 1 }, applicant, {
                ...job,
                questions,
            }).answers,
        ).length,
        5,
    );
    assert.deepEqual(
        getApplicationDetail(application, applicant, { ...job, questions: [] })
            .answers,
        {},
    );
});
