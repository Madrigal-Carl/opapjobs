import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { compileFunction } from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

globalThis.requestAnimationFrame ??= (callback) => callback();
globalThis.document ??= { getElementById: () => null };

function load(path, overrides = {}, cache = new Map()) {
    if (cache.has(path)) return cache.get(path);
    const exports = {};
    cache.set(path, exports);
    const imports = {
        react: React,
        'react/jsx-runtime': jsxRuntime,
        'lucide-react': new Proxy({}, { get: () => () => null }),
        '@/components/ui/button': { Button: 'button' },
        '@/components/ui/textarea': { Textarea: 'textarea' },
        '@/components/ui/skeleton': { Skeleton: 'div' },
        '@/components/ui/dialog': {
            Dialog: ({ open, children }) => (open ? children : null),
            DialogContent: 'section',
            DialogHeader: 'header',
            DialogTitle: 'h2',
            DialogDescription: 'p',
            DialogFooter: 'footer',
        },
        '@/components/form/form-select': {
            FormSelect: ({ options, placeholder, selectClassName, ...props }) =>
                React.createElement(
                    'select',
                    { ...props, className: selectClassName },
                    React.createElement('option', { value: '' }, placeholder),
                    options.map((option) =>
                        React.createElement(
                            'option',
                            { key: option.value, value: option.value },
                            option.label,
                        ),
                    ),
                ),
        },
        '@inertiajs/react': { Head: () => null, Link: 'a' },
        '@/routes': { applications: { url: () => '/applications' } },
        '@/routes/jobs': {
            index: { url: () => '/jobs' },
            show: { url: () => '/jobs/1' },
        },
        ...overrides,
    };
    const source =
        readFileSync(path, 'utf8') +
        (path.endsWith('/apply.tsx') ? '\nexport { JobApplyBody };' : '');
    compileFunction(
        ts.transpileModule(source, {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2022,
                jsx: ts.JsxEmit.ReactJSX,
            },
        }).outputText,
        ['require', 'exports'],
    )((name) => {
        if (name in imports) return imports[name];
        if (name.startsWith('@/')) {
            const base = `resources/js/${name.slice(2)}`;
            const file = ['.tsx', '.ts']
                .map((ext) => base + ext)
                .find(existsSync);
            if (file) return load(file, overrides, cache);
        }
        throw new Error(`Unexpected import ${name} in ${path}`);
    }, exports);
    return exports;
}

function find(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node))
        return (
            node.map((child) => find(child, predicate)).find(Boolean) ?? null
        );
    return predicate(node) ? node : find(node.props?.children, predicate);
}

const questions = [
    { id: 'optional', label: 'Anything else?', type: 'paragraph' },
    {
        id: 'license',
        label: 'Do you hold a license?',
        type: 'yesno',
        required: true,
    },
    {
        id: 'experience',
        label: 'Describe your experience',
        type: 'short',
        required: true,
    },
];
const empty = {
    resumeId: null,
    uploadedResume: null,
    coverLetter: '',
    salary: '',
    availability: '',
    answers: {},
    furthestStep: 1,
};

function wizard(
    initial = empty,
    {
        closed = false,
        jobId = '1',
        draftStore = {},
        debouncePending = false,
        jobQuestions = questions,
        submission = 'success',
        applicantId = '42',
        requiredDocuments = [],
        restoreOnMount = true,
    } = {},
) {
    const state = [];
    const refs = [];
    const effects = [];
    const requests = [];
    let cursor = 0;
    let refCursor = 0;
    const hooks = {
        ...React,
        useState(initialValue) {
            const index = cursor++;
            if (!(index in state))
                state[index] =
                    typeof initialValue === 'function'
                        ? initialValue()
                        : initialValue;
            return [
                state[index],
                (value) => {
                    state[index] =
                        typeof value === 'function'
                            ? value(state[index])
                            : value;
                },
            ];
        },
        useRef(value) {
            const index = refCursor++;
            return (refs[index] ??= { current: value });
        },
        useMemo: (callback) => callback(),
        useCallback: (callback) => callback,
        useEffect(callback) {
            effects.push(callback);
        },
    };
    const job = {
        id: jobId,
        title: 'Welder',
        agency: 'Agency',
        location: 'Dubai',
        salary: 'AED 6,000',
        quantity: 3,
        questions: jobQuestions,
    };
    const module = load('resources/js/pages/jobs/apply.tsx', {
        react: hooks,
        '@inertiajs/react': {
            Head: () => null,
            Link: 'a',
            router: {
                post(url, data, options) {
                    requests.push({ url, data, options });
                    if (submission === 'success') {
                        options.onSuccess({
                            props: { jobId, submittedApplicationId: '99' },
                        });
                        options.onFinish();
                    } else if (submission === 'error') {
                        options.onError({ application: 'Please try again.' });
                        options.onFinish();
                    }
                },
            },
        },
        '@/routes/jobs': {
            index: { url: () => '/jobs' },
            show: { url: () => `/job/${jobId}` },
            submit: { url: () => `/job/${jobId}/apply` },
        },
        '@/contexts/applications-context': {
            useApplications: () => ({
                markApplied() {},
                toggleSaved() {},
                isSaved: () => false,
                isApplied: () => false,
            }),
        },
        '@/contexts/applicant-profile-context': {
            useApplicantProfile: () => ({
                profile: {
                    name: 'Maria',
                    documents: [],
                    phone: '',
                    email: 'maria@example.test',
                },
            }),
        },
        '@/components/applicant/applicant-scope': { ApplicantScope: 'div' },
        '@/components/applicant/job-not-found': { JobNotFound: 'div' },
        '@/hooks/use-debounced-value': {
            useDebouncedValue: (value) => (debouncePending ? initial : value),
        },
        '@/data/application-draft-store': {
            ...load('resources/js/data/application-draft-store.ts'),
            readApplicationDraft: () => structuredClone(initial),
            writeApplicationDraft() {},
            ...draftStore,
        },
        '@/lib/public-catalog': { toApplyJob: () => job },
        '@/data/match-analysis': {
            generateMatchAnalysis: () => ({ overall: 80 }),
            overallMatchMeta: () => ({}),
        },
    });
    const render = () => {
        cursor = 0;
        refCursor = 0;
        effects.length = 0;
        return module.JobApplyBody({
            jobId,
            applicantId,
            jobPost: { isAcceptingApplications: !closed, requiredDocuments },
        });
    };
    render();
    state[0] = structuredClone(initial);
    if (restoreOnMount) effects[0]();
    return {
        render,
        requests,
        sync() {
            effects.forEach((effect) => effect());
        },
        restore() {
            effects[0]();
        },
        save() {
            effects[1]();
        },
        click(id) {
            const button = find(
                render(),
                (node) => node.props?.['data-testid'] === id,
            );
            assert.ok(button, `Missing ${id}`);
            button.props.onClick();
        },
    };
}

await test('loading the application hides the wrong step until the saved draft is restored', () => {
    for (const savedStep of [1, 2, 3, 4]) {
        const page = wizard(
            {
                ...empty,
                resumeId: 'doc-7',
                furthestStep: savedStep,
                answers: { license: 'Yes', experience: 'Five years' },
            },
            { restoreOnMount: false },
        );

        const loading = renderToStaticMarkup(page.render());
        assert.match(loading, /aria-busy="true"/);
        assert.match(loading, /Loading your application/);
        assert.doesNotMatch(loading, /aria-current="step"/);
        assert.doesNotMatch(loading, /button-apply-submit/);

        page.restore();

        assert.doesNotMatch(
            renderToStaticMarkup(page.render()),
            /skeleton-apply-page/,
        );
        assert.equal(
            find(
                page.render(),
                (node) => node.props?.['aria-current'] === 'step',
            ).props['data-testid'],
            `apply-step-${savedStep}`,
        );
    }
});

await test('jobs without questions show three steps and skip Q&A in both directions and restored drafts', () => {
    const page = wizard({ ...empty, resumeId: 'doc-7' }, { jobQuestions: [] });
    assert.equal(
        find(
            page.render(),
            (node) => node.props?.['data-testid'] === 'apply-step-3',
        ),
        null,
    );
    page.click('button-apply-next-1');
    page.click('button-apply-next-2');
    assert.equal(
        find(page.render(), (node) => node.props?.['aria-current'] === 'step')
            .props['aria-label'],
        'Step 3: Review and submit',
    );
    page.click('button-apply-back');
    assert.equal(
        find(page.render(), (node) => node.props?.['aria-current'] === 'step')
            .props['data-testid'],
        'apply-step-2',
    );
    const restored = wizard(
        { ...empty, resumeId: 'doc-7', furthestStep: 3 },
        { jobQuestions: [] },
    );
    restored.restore();
    assert.ok(
        find(
            restored.render(),
            (node) => node.props?.['data-testid'] === 'button-apply-submit',
        ),
    );
});

await test('review omits Q&A for jobs without questions but keeps the submitted document details', () => {
    const { ReviewStep } = load(
        'resources/js/components/applicant/apply-review.tsx',
    );
    const html = renderToStaticMarkup(
        React.createElement(ReviewStep, {
            draft: {
                ...empty,
                resumeId: 'doc-7',
                coverLetter: 'Please consider me.',
            },
            questions: [],
            jobTitle: 'Welder',
            agency: 'Agency',
            documents: [{ id: 'doc-7', name: 'My resume.pdf' }],
            onEditSection() {},
        }),
    );
    assert.doesNotMatch(html, /Q&amp;A|apply-details/);
    assert.match(html, /My resume.pdf/);
    assert.match(html, /Please consider me\./);
});

await test('removing a job’s questions while applying cannot leave the applicant on a hidden Q&A step', () => {
    const currentQuestions = [...questions];
    const page = wizard(
        { ...empty, resumeId: 'doc-7' },
        { jobQuestions: currentQuestions },
    );
    page.restore();
    page.click('button-apply-next-1');
    page.click('button-apply-next-2');
    currentQuestions.length = 0;
    page.render();
    page.sync();
    assert.equal(
        find(page.render(), (node) => node.props?.['aria-current'] === 'step')
            .props['data-testid'],
        'apply-step-4',
    );
});

await test('a submitted restored draft no longer offers Start over or claims nothing was sent', () => {
    const page = wizard(
        { ...empty, resumeId: 'doc-7', furthestStep: 4 },
        { jobQuestions: [] },
    );
    page.restore();
    assert.ok(
        find(
            page.render(),
            (node) => node.props?.['data-testid'] === 'status-apply-restored',
        ),
    );
    page.click('button-apply-submit');
    const tree = page.render();
    assert.ok(find(tree, (node) => node.type?.name === 'SubmittedCard'));
    assert.equal(
        find(
            tree,
            (node) => node.props?.['data-testid'] === 'status-apply-restored',
        ),
        null,
    );
    assert.equal(
        find(
            tree,
            (node) => node.props?.['data-testid'] === 'button-apply-start-over',
        ),
        null,
    );
});

await test('submission sends only the current job answers and keeps the draft until confirmed success', () => {
    const cleared = [];
    const page = wizard(
        {
            ...empty,
            resumeId: 'doc-7',
            coverLetter: 'My cover letter',
            salary: '2500.50',
            availability: 'Within 2 weeks',
            answers: {
                license: 'No',
                experience: 'Five years',
                oldJob: 'Do not send',
            },
        },
        {
            submission: 'pending',
            draftStore: { clearApplicationDraft: (id) => cleared.push(id) },
        },
    );
    page.click('button-apply-next-1');
    page.click('button-apply-next-2');
    page.click('button-apply-next-3');
    page.click('button-apply-submit');
    assert.equal(page.requests.length, 1);
    const { url, data, options } = page.requests[0];
    assert.equal(url, '/job/1/apply');
    assert.equal(data.resume_document_id, '7');
    assert.equal(data.cover_letter, 'My cover letter');
    assert.equal('availability' in data, false);
    assert.equal('expected_monthly_salary' in data, false);
    assert.deepEqual(data.answers, {
        optional: '',
        license: 'No',
        experience: 'Five years',
    });
    assert.deepEqual(cleared, []);
    options.onSuccess({ props: { jobId: '1', submittedApplicationId: null } });
    assert.deepEqual(cleared, []);
    find(
        page.render(),
        (node) => node.props?.onEditSection,
    ).props.onEditSection('apply-resume');
    assert.equal(
        find(page.render(), (node) => node.props?.['aria-current'] === 'step')
            .props['data-testid'],
        'apply-step-4',
    );
    page.click('button-apply-submit');
    assert.equal(page.requests.length, 1);
    options.onError({ application: 'Please try again.' });
    options.onFinish();
    assert.deepEqual(cleared, []);
    assert.ok(
        find(
            page.render(),
            (node) =>
                node.props?.['data-testid'] === 'status-apply-submit-errors',
        ),
    );
    page.click('button-apply-submit');
    page.requests[1].options.onSuccess({
        props: { jobId: '1', submittedApplicationId: '99' },
    });
    page.requests[1].options.onFinish();
    assert.deepEqual(cleared, ['42:1']);
});

await test('refreshing an upload draft requires the actual file again without losing typed answers', () => {
    const page = wizard(
        {
            ...empty,
            uploadedResume: { name: 'resume.pdf', size: '1 KB' },
            coverLetter: 'Keep this',
            furthestStep: 4,
        },
        { jobQuestions: [] },
    );
    page.restore();
    const form = find(page.render(), (node) => node.props?.onPatch);
    assert.equal(form.props.step, 2);
    assert.equal(form.props.draft.coverLetter, 'Keep this');
    assert.equal(form.props.draft.uploadedResume.name, '');
});

await test('a new upload sends the actual file and skips an absent Q&A step', () => {
    const page = wizard(empty, { jobQuestions: [], submission: 'pending' });
    page.click('button-apply-next-1');
    const form = find(page.render(), (node) => node.props?.onFileChange);
    const file = new File(['%PDF-1.4 resume'], 'resume.pdf', {
        type: 'application/pdf',
    });
    form.props.onFileChange(file);
    form.props.onPatch({ uploadedResume: { name: file.name, size: '1 KB' } });
    page.click('button-apply-next-2');
    page.click('button-apply-submit');
    assert.equal(page.requests[0].data.resume, file);
    assert.equal(page.requests[0].data.resume_document_id, null);
    assert.deepEqual(page.requests[0].data.answers, {});
});

await test('submission has no progress loader and prevents duplicate submits until a failed request finishes', () => {
    const page = wizard(empty, { jobQuestions: [], submission: 'pending' });
    page.click('button-apply-next-1');
    const form = find(page.render(), (node) => node.props?.onFileChange);
    const file = new File(['%PDF-1.4 resume'], 'resume.pdf', {
        type: 'application/pdf',
    });
    form.props.onFileChange(file);
    form.props.onPatch({ uploadedResume: { name: file.name, size: '1 KB' } });
    page.click('button-apply-next-2');
    assert.equal(
        find(page.render(), (node) => node.props?.role === 'progressbar'),
        null,
    );

    page.click('button-apply-submit');
    assert.equal(
        find(page.render(), (node) => node.props?.role === 'progressbar'),
        null,
    );
    assert.equal(
        find(
            page.render(),
            (node) => node.props?.['data-testid'] === 'button-apply-submit',
        ).props.disabled,
        true,
    );
    page.click('button-apply-submit');
    assert.equal(page.requests.length, 1);

    page.requests[0].options.onError({ application: 'Please try again.' });
    page.requests[0].options.onFinish();
    assert.equal(
        find(
            page.render(),
            (node) => node.props?.['data-testid'] === 'button-apply-submit',
        ).props.disabled,
        false,
    );
    const dialog = find(
        page.render(),
        (node) => node.props?.variant === 'error' && node.props?.open,
    );
    assert.ok(dialog);
    dialog.props.onOpenChange(false);
    page.click('button-apply-submit');
    assert.equal(page.requests.length, 2);
    assert.equal(page.requests[1].data.resume, file);
});

await test('confirmed submission opens a dismissible reusable success dialog', () => {
    const page = wizard({ ...empty, resumeId: 'doc-7' }, { jobQuestions: [] });
    page.click('button-apply-next-1');
    page.click('button-apply-next-2');
    page.click('button-apply-submit');

    const dialog = find(
        page.render(),
        (node) => node.props?.variant === 'success' && node.props?.open,
    );
    assert.ok(dialog, 'Confirmed success should open a result dialog');
    assert.match(dialog.props.title, /submitted/i);
    dialog.props.onOpenChange(false);
    assert.equal(
        find(
            page.render(),
            (node) => node.props?.variant === 'success' && node.props?.open,
        ),
        null,
    );
});

await test('validation errors open the error dialog while preserving files and answers', () => {
    const page = wizard(
        { ...empty, resumeId: 'doc-7', coverLetter: 'Keep my letter' },
        { jobQuestions: [], submission: 'pending' },
    );
    page.click('button-apply-next-1');
    page.click('button-apply-next-2');
    page.click('button-apply-submit');
    page.requests[0].options.onError({
        cover_letter: 'Please shorten your cover letter.',
    });
    page.requests[0].options.onFinish();

    const dialog = find(
        page.render(),
        (node) => node.props?.variant === 'error' && node.props?.open,
    );
    assert.ok(dialog, 'Validation failure should open a result dialog');
    assert.match(dialog.props.description, /Please shorten your cover letter/);
    dialog.props.onOpenChange(false);
    assert.equal(
        find(page.render(), (node) => node.props?.onPatch).props.draft
            .coverLetter,
        'Keep my letter',
    );
    assert.equal(
        find(page.render(), (node) => node.props?.onPatch).props.draft.resumeId,
        'doc-7',
    );
});

await test('unconfirmed responses, network failures, and HTTP failures show an error without clearing the draft', () => {
    for (const failure of ['unconfirmed', 'network', 'http']) {
        const cleared = [];
        const page = wizard(
            { ...empty, resumeId: 'doc-7' },
            {
                jobQuestions: [],
                submission: 'pending',
                draftStore: { clearApplicationDraft: (id) => cleared.push(id) },
            },
        );
        page.click('button-apply-next-1');
        page.click('button-apply-next-2');
        page.click('button-apply-submit');
        const options = page.requests[0].options;
        if (failure === 'unconfirmed') {
            options.onSuccess({
                props: { jobId: '1', submittedApplicationId: null },
            });
        } else if (failure === 'network') {
            assert.equal(typeof options.onNetworkError, 'function');
            assert.equal(
                options.onNetworkError(new Error('Disconnected')),
                false,
            );
        } else {
            assert.equal(typeof options.onHttpException, 'function');
            assert.equal(options.onHttpException({ status: 500 }), false);
        }
        options.onFinish();

        assert.deepEqual(cleared, []);
        assert.ok(
            find(
                page.render(),
                (node) => node.props?.variant === 'error' && node.props?.open,
            ),
            `${failure} should open an error dialog`,
        );
        assert.equal(
            find(
                page.render(),
                (node) => node.props?.['data-testid'] === 'button-apply-submit',
            ).props.disabled,
            false,
        );
    }
});

await test('submitting a saved resume has no progress loader', () => {
    const page = wizard(
        { ...empty, resumeId: 'doc-7' },
        { jobQuestions: [], submission: 'pending' },
    );
    page.click('button-apply-next-1');
    page.click('button-apply-next-2');
    page.click('button-apply-submit');

    const progress = find(
        page.render(),
        (node) => node.props?.role === 'progressbar',
    );
    assert.equal(progress, null);
});

await test('result dialogs render caller-provided messages safely and close through their action', () => {
    const { ResultDialog } = load(
        'resources/js/components/system/result-dialog.tsx',
    );

    for (const variant of ['success', 'error']) {
        const changes = [];
        const props = {
            open: true,
            variant,
            title: 'Application result',
            description: '<script>unsafe()</script>',
            closeLabel: 'Back to application',
            onOpenChange: (open) => changes.push(open),
        };
        const tree = ResultDialog(props);
        const html = renderToStaticMarkup(tree);
        assert.match(html, /Application result/);
        assert.match(html, /&lt;script&gt;/);
        assert.doesNotMatch(html, /<script>/);
        find(tree, (node) => node.type === 'button').props.onClick();
        assert.deepEqual(changes, [false]);
        assert.equal(
            renderToStaticMarkup(ResultDialog({ ...props, open: false })),
            '',
        );
    }
});

await test('expired sessions show recovery instructions without discarding the application draft', () => {
    const page = wizard(
        { ...empty, resumeId: 'doc-7' },
        { jobQuestions: [], submission: 'pending' },
    );
    page.click('button-apply-next-1');
    page.click('button-apply-next-2');
    page.click('button-apply-submit');
    assert.equal(
        page.requests[0].options.onHttpException({ status: 419 }),
        false,
    );
    page.requests[0].options.onFinish();

    const dialog = find(
        page.render(),
        (node) => node.props?.variant === 'error' && node.props?.open,
    );
    assert.match(dialog.props.description, /session expired/);
    assert.match(dialog.props.description, /select files again/);
});

await test('step 2 requires all job documents and preserves the actual PDFs on submission failure', () => {
    const page = wizard(
        { ...empty, resumeId: 'doc-7' },
        {
            jobQuestions: [],
            requiredDocuments: ['NBI', 'Police clearance'],
            submission: 'pending',
        },
    );
    page.click('button-apply-next-1');
    page.click('button-apply-next-2');
    assert.equal(
        find(page.render(), (node) => node.props?.onPatch).props.step,
        2,
    );
    const nbi = new File(['%PDF-1.4 nbi'], 'nbi.pdf', {
        type: 'application/pdf',
    });
    const police = new File(['%PDF-1.4 police'], 'police.pdf', {
        type: 'application/pdf',
    });
    find(
        page.render(),
        (node) => node.props?.onDocumentChange,
    ).props.onDocumentChange('NBI', nbi);
    page.click('button-apply-next-2');
    assert.equal(
        find(page.render(), (node) => node.props?.onPatch).props.step,
        2,
    );
    find(
        page.render(),
        (node) => node.props?.onDocumentChange,
    ).props.onDocumentChange('Police clearance', police);
    page.click('button-apply-next-2');
    const review = find(page.render(), (node) => node.props?.onEditSection);
    assert.equal(review.props.supportingFiles.get('NBI'), nbi);
    page.click('button-apply-submit');
    assert.deepEqual(page.requests[0].data.documents, [
        { name: 'NBI', file: nbi },
        { name: 'Police clearance', file: police },
    ]);
    page.requests[0].options.onError({
        'documents.0.file': 'Try the PDF again.',
    });
    page.requests[0].options.onFinish();
    const form = find(page.render(), (node) => node.props?.onDocumentChange);
    assert.equal(form.props.step, 2);
    assert.equal(form.props.supportingFiles.get('NBI'), nbi);
    form.props.onDocumentChange('NBI', null);
    page.click('button-apply-next-2');
    assert.equal(
        find(page.render(), (node) => node.props?.onPatch).props.step,
        2,
    );
});

await test('refreshing a review draft reopens documents when the job requires PDF uploads', () => {
    const page = wizard(
        {
            ...empty,
            resumeId: 'doc-7',
            coverLetter: 'Keep this letter',
            furthestStep: 4,
        },
        { jobQuestions: [], requiredDocuments: ['NBI'] },
    );
    page.restore();
    const form = find(page.render(), (node) => node.props?.onDocumentChange);
    assert.equal(form.props.step, 2);
    assert.equal(form.props.draft.coverLetter, 'Keep this letter');
});

await test('the review shows each required PDF filename without adding Q&A', () => {
    const { ReviewStep } = load(
        'resources/js/components/applicant/apply-review.tsx',
    );
    const html = renderToStaticMarkup(
        React.createElement(ReviewStep, {
            draft: { ...empty, resumeId: 'doc-7' },
            questions: [],
            jobTitle: 'Welder',
            agency: 'Agency',
            documents: [{ id: 'doc-7', name: 'resume.pdf' }],
            requiredDocuments: ['NBI'],
            supportingFiles: new Map([
                [
                    'NBI',
                    new File(['%PDF-1.4'], 'nbi.pdf', {
                        type: 'application/pdf',
                    }),
                ],
            ]),
            onEditSection() {},
        }),
    );
    assert.match(html, /NBI/);
    assert.match(html, /nbi\.pdf/);
    assert.doesNotMatch(html, /Q&amp;A/);
});

await test('the first step shows fixed demo guidance without criterion cards and keeps the actual agency', () => {
    const page = wizard();
    const step = find(page.render(), (node) => node.type?.name === 'MatchStep');

    assert.equal(step.props.match.overall, 31.2);
    const html = renderToStaticMarkup(step);

    assert.match(html, /Overall match 31 out of 100/);
    assert.match(html, /role with Agency/);
    assert.match(html, /What works in your favor/);
    assert.match(html, /Education matches at 63\.3%/);
    assert.match(html, /Languages matches at 40%/);
    assert.match(html, /0 years of experience against a 2-year minimum/);
    assert.match(html, /What to prepare next/);
    assert.match(html, /Skills scores lowest at 0%/);
    assert.match(html, /Certifications scores lowest at 25%/);
    assert.match(html, /This listing asks for 2 years; your resume shows 0/);
    assert.match(
        html,
        /The listing asks for a qualification above your highest/,
    );
    assert.doesNotMatch(html, /match-row|Review this area before applying/);
});

await test('the first step actions sit in a footer outside the content columns', () => {
    const tree = wizard().render();
    const footer = find(tree, (node) => node.type === 'footer');
    const columns = find(
        tree,
        (node) => node.props?.className === 'apply-columns',
    );

    assert.ok(footer);
    assert.equal(
        find(columns, (node) => node.type === 'footer'),
        null,
    );
    assert.ok(
        find(
            footer,
            (node) => node.props?.['data-testid'] === 'button-apply-save-match',
        ),
    );
    assert.ok(
        find(
            footer,
            (node) => node.props?.['data-testid'] === 'button-apply-next-1',
        ),
    );
});

await test('draft edits survive an immediate refresh, stay separate by job and clear only on submission', (t) => {
    const previous = globalThis.window;
    const storage = new Map();
    globalThis.window = {
        localStorage: {
            getItem: (key) => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: (key) => storage.delete(key),
        },
    };
    t.after(() => {
        globalThis.window = previous;
    });
    const draftStore = load('resources/js/data/application-draft-store.ts');
    const page = wizard(empty, { draftStore, debouncePending: true });
    page.restore();
    page.render();
    page.save();
    page.click('button-apply-next-1');
    find(page.render(), (node) => node.props?.onPatch).props.onPatch({
        resumeId: 'resume-1',
        coverLetter: 'Keep my latest edit',
    });
    page.render();
    page.save();

    assert.equal(
        draftStore.readApplicationDraft('42:1').coverLetter,
        'Keep my latest edit',
    );
    const refreshed = wizard(empty, { draftStore });
    const otherApplicant = wizard(empty, { draftStore, applicantId: '43' });
    otherApplicant.restore();
    assert.equal(
        find(
            otherApplicant.render(),
            (node) => node.props?.['aria-current'] === 'step',
        ).props['data-testid'],
        'apply-step-1',
    );
    otherApplicant.click('button-apply-next-1');
    assert.equal(
        find(otherApplicant.render(), (node) => node.props?.onPatch).props.draft
            .coverLetter,
        '',
    );
    refreshed.restore();
    const restored = find(refreshed.render(), (node) => node.props?.onPatch);
    assert.equal(restored.props.draft.coverLetter, 'Keep my latest edit');
    assert.equal(restored.props.draft.resumeId, 'resume-1');

    const other = wizard(empty, { draftStore, jobId: '2' });
    other.restore();
    other.click('button-apply-next-1');
    const otherForm = find(other.render(), (node) => node.props?.onPatch);
    assert.equal(otherForm.props.draft.coverLetter, '');
    assert.equal(otherForm.props.draft.resumeId, null);
    draftStore.writeApplicationDraft('42:2', {
        ...empty,
        coverLetter: 'Other job',
    });

    restored.props.onAnswer('license', 'No');
    restored.props.onAnswer('experience', 'Five years');
    refreshed.click('button-apply-next-2');
    refreshed.click('button-apply-next-3');
    refreshed.click('button-apply-submit');
    assert.equal(storage.has('opap-application-draft-42:1'), false);
    assert.equal(
        draftStore.readApplicationDraft('42:2').coverLetter,
        'Other job',
    );
});

await test('the stepper cannot bypass required fields and both forward paths show field-level errors', (t) => {
    const previous = globalThis.document;
    const previousFrame = globalThis.requestAnimationFrame;
    const focused = [];
    globalThis.document = {
        getElementById: (id) => ({
            matches: () => false,
            querySelector: () => ({
                focus: () => focused.push(id),
                scrollIntoView() {},
            }),
            scrollIntoView() {},
        }),
    };
    globalThis.requestAnimationFrame = (callback) => callback();
    t.after(() => {
        globalThis.document = previous;
        globalThis.requestAnimationFrame = previousFrame;
    });
    const page = wizard();
    assert.equal(
        find(
            page.render(),
            (node) => node.props?.['data-testid'] === 'apply-step-3',
        ).props.disabled,
        true,
    );
    page.click('button-apply-next-1');
    assert.equal(
        find(
            page.render(),
            (node) => node.props?.['data-testid'] === 'apply-step-2',
        ).props['aria-current'],
        'step',
    );
    const form = find(page.render(), (node) => node.props?.onAnswer);
    assert.equal(form.props.blocked.length, 0);
    page.click('button-apply-next-2');
    assert.deepEqual(focused, ['apply-resume']);
    assert.equal(
        find(page.render(), (node) => node.props?.onAnswer).props.blocked
            .length,
        1,
    );
});

await test('complete applications can review and backward navigation stays available', () => {
    const page = wizard({
        ...empty,
        resumeId: 'resume-1',
        answers: { license: 'No', experience: 'Five years' },
    });
    page.click('button-apply-next-1');
    page.click('button-apply-next-2');
    page.click('button-apply-next-3');
    assert.ok(
        find(
            page.render(),
            (node) => node.props?.['data-testid'] === 'button-apply-submit',
        ),
    );
    page.click('apply-step-1');
    assert.ok(
        find(
            page.render(),
            (node) => node.props?.['data-testid'] === 'button-apply-next-1',
        ),
    );
});

await test('Q&A reports every missing answer and a removed resume locks later steps again', () => {
    const page = wizard({ ...empty, resumeId: 'resume-1' });
    page.click('button-apply-next-1');
    page.click('button-apply-next-2');
    page.click('button-apply-next-3');
    const form = find(page.render(), (node) => node.props?.onAnswer);
    assert.equal(form.props.step, 3);
    assert.ok(form.props.blocked.length > 0);
    assert.equal(
        find(
            page.render(),
            (node) => node.props?.['data-testid'] === 'apply-step-4',
        ).props.disabled,
        true,
    );
    page.click('apply-step-2');
    find(page.render(), (node) => node.props?.onAnswer).props.onPatch({
        resumeId: null,
    });
    assert.equal(
        find(
            page.render(),
            (node) => node.props?.['data-testid'] === 'apply-step-3',
        ).props.disabled,
        true,
    );
});

await test('legacy review drafts migrate without losing answers and new Q&A drafts stay on Q&A', (t) => {
    const previous = globalThis.window;
    const storage = new Map();
    globalThis.window = {
        localStorage: {
            getItem: (key) => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value),
        },
    };
    t.after(() => {
        globalThis.window = previous;
    });
    const { readApplicationDraft, writeApplicationDraft } = load(
        'resources/js/data/application-draft-store.ts',
    );
    storage.set(
        'opap-application-draft-1',
        JSON.stringify({
            ...empty,
            furthestStep: 3,
            coverLetter: 'Keep me',
            answers: { license: 'No' },
        }),
    );
    const migrated = readApplicationDraft('1');
    assert.equal(migrated.furthestStep, 4);
    assert.equal(migrated.coverLetter, 'Keep me');
    assert.deepEqual(migrated.answers, { license: 'No' });
    writeApplicationDraft('1', { ...migrated, furthestStep: 3 });
    assert.equal(readApplicationDraft('1').furthestStep, 3);
    storage.set(
        'opap-application-draft-2',
        JSON.stringify({ ...empty, furthestStep: 2 }),
    );
    assert.equal(readApplicationDraft('2').furthestStep, 2);
});

await test('restoring a draft reopens its reached step, capped by the current resume and answer gates', () => {
    for (const { draft, expected } of [
        {
            draft: {
                ...empty,
                resumeId: 'resume-1',
                answers: { license: 'No', experience: 'Five years' },
                furthestStep: 4,
            },
            expected: 4,
        },
        {
            draft: { ...empty, resumeId: 'resume-1', furthestStep: 4 },
            expected: 3,
        },
        {
            draft: {
                ...empty,
                uploadedResume: { name: '', size: '' },
                furthestStep: 4,
            },
            expected: 2,
        },
        {
            draft: { ...empty, resumeId: 'resume-1', furthestStep: 2 },
            expected: 2,
        },
    ]) {
        const page = wizard(draft);
        page.restore();
        assert.equal(
            find(
                page.render(),
                (node) => node.props?.['aria-current'] === 'step',
            ).props['data-testid'],
            `apply-step-${expected}`,
        );
        assert.ok(
            find(
                page.render(),
                (node) =>
                    node.props?.['data-testid'] === 'status-apply-restored',
            ),
        );
    }
});

await test('closed listings cannot start an application', () => {
    const page = wizard(empty, { closed: true });
    assert.equal(
        find(
            page.render(),
            (node) => node.props?.['data-testid'] === 'button-apply-next-1',
        ).props.disabled,
        true,
    );
    page.click('button-apply-next-1');
    assert.equal(
        find(page.render(), (node) => node.props?.['aria-current'] === 'step')
            .props['data-testid'],
        'apply-step-1',
    );
});

await test('the documents step shows its own resume error, not employer questions or salary', () => {
    const { ApplicationStepForm } = load(
        'resources/js/components/applicant/apply-form.tsx',
    );
    const html = renderToStaticMarkup(
        React.createElement(ApplicationStepForm, {
            step: 2,
            agency: 'Agency',
            draft: empty,
            questions,
            documents: [],
            profileName: 'Maria',
            blocked: ['Choose a resume'],
            outstanding: ['Choose a resume'],
            onPatch() {},
            onAnswer() {},
        }),
    );
    assert.match(html, /id="apply-resume-error"/);
    assert.match(html, /input-apply-cover-letter/);
    assert.doesNotMatch(
        html,
        /question-block-|input-apply-salary|select-apply-availability/,
    );
});

await test('required answers treat No as answered but not whitespace or empty selections', () => {
    const { missingRequiredAnswers } = load(
        'resources/js/types/application-draft.ts',
    );
    assert.deepEqual(
        missingRequiredAnswers(questions, {
            license: 'No',
            experience: '  ',
        }).map((item) => item.id),
        ['experience'],
    );
    assert.deepEqual(
        missingRequiredAnswers(questions, {
            license: [],
            experience: ['  '],
        }).map((item) => item.id),
        ['license', 'experience'],
    );
});

await test('Q&A shows only saved questions with required questions before optional ones', () => {
    const { ApplicationStepForm } = load(
        'resources/js/components/applicant/apply-form.tsx',
    );
    const html = renderToStaticMarkup(
        React.createElement(ApplicationStepForm, {
            agency: 'Agency',
            step: 3,
            draft: empty,
            questions,
            documents: [],
            profileName: 'Maria',
            blocked: [],
            outstanding: ['Choose a resume'],
            onPatch() {},
            onAnswer() {},
        }),
    );
    assert.ok(
        html.indexOf('Do you hold a license?') < html.indexOf('Anything else?'),
    );
    assert.doesNotMatch(
        html,
        /Expected monthly salary|Select your availability|input-apply-salary|select-apply-availability/,
    );
    assert.doesNotMatch(html, /input-apply-cover-letter/);
    assert.doesNotMatch(html, /aria-invalid="true"/);
});

await test('selection uses one saved choice and number questions use numeric inputs', () => {
    const { ApplyQuestion } = load(
        'resources/js/components/applicant/apply-question.tsx',
    );
    const selected = renderToStaticMarkup(
        React.createElement(ApplyQuestion, {
            question: {
                id: 'start',
                label: 'When can you start?',
                type: 'selection',
                options: ['Now', 'Next month'],
                required: true,
            },
            answer: 'Next month',
            onAnswer() {},
        }),
    );
    assert.match(selected, /<select/);
    assert.match(selected, /<option[^>]*value="Next month"[^>]*selected/);
    assert.doesNotMatch(selected, /multiple|checkbox/);
    const numeric = renderToStaticMarkup(
        React.createElement(ApplyQuestion, {
            question: {
                id: 'salary',
                label: 'Salary?',
                type: 'number',
                required: true,
            },
            answer: '0',
            onAnswer() {},
        }),
    );
    assert.match(numeric, /type="number"/);
    assert.match(numeric, /step="any"/);
    assert.match(numeric, /value="0"/);
});

await test('question controls expose inline errors, selected No, short inputs and paragraph counts', () => {
    const { ApplyQuestion } = load(
        'resources/js/components/applicant/apply-question.tsx',
    );
    const render = (props) =>
        renderToStaticMarkup(
            React.createElement(ApplyQuestion, {
                number: 2,
                onAnswer() {},
                ...props,
            }),
        );
    const invalid = render({ question: questions[1], invalid: true });
    assert.match(invalid, /aria-invalid="true"/);
    assert.match(invalid, /aria-describedby="question-license-error"/);
    assert.match(invalid, /id="question-license-error"/);
    const answered = render({ question: questions[1], answer: 'No' });
    assert.match(
        answered,
        /data-testid="button-answer-license-no"[^>]*checked=""/,
    );
    assert.match(answered, /type="radio"/);
    assert.match(
        render({ question: questions[2] }),
        /<input[^>]*data-testid="input-answer-experience"/,
    );
    assert.match(
        render({ question: questions[0], answer: 'Hello' }),
        /5 characters/,
    );
});

await test('form errors link to every missing required field and scale to zero or twenty questions', () => {
    const { ApplicationStepForm } = load(
        'resources/js/components/applicant/apply-form.tsx',
    );
    const render = (items, blocked) =>
        renderToStaticMarkup(
            React.createElement(ApplicationStepForm, {
                agency: 'Agency',
                step: 3,
                draft: empty,
                questions: items,
                documents: [],
                profileName: 'Maria',
                blocked,
                outstanding: ['Choose a resume'],
                onPatch() {},
                onAnswer() {},
            }),
        );
    const invalid = render(questions, ['missing']);
    assert.doesNotMatch(invalid, /href="#apply-resume"/);
    assert.match(invalid, /href="#question-license"/);
    assert.match(invalid, /href="#question-experience"/);
    assert.doesNotMatch(invalid, /id="apply-resume-error"/);
    assert.doesNotMatch(render([], []), /data-testid="question-block-/);
    const many = Array.from({ length: 21 }, (_, index) => ({
        id: `q${index}`,
        label: `Agency question ${index}`,
        type: 'short',
        required: true,
    }));
    assert.equal(
        (render(many, []).match(/data-testid="question-block-/g) ?? []).length,
        21,
    );
});

await test('choosing the upload card without a file still requires a resume', () => {
    const page = wizard({
        ...empty,
        uploadedResume: { name: '', size: '' },
        answers: { license: 'Yes', experience: 'Five years' },
    });
    page.click('button-apply-next-1');
    page.click('button-apply-next-2');
    assert.equal(
        find(
            page.render(),
            (node) => node.props?.['data-testid'] === 'apply-step-2',
        ).props['aria-current'],
        'step',
    );
    assert.ok(
        find(page.render(), (node) => node.props?.onAnswer).props.blocked
            .length > 0,
    );
});

await test('upload browse and drop accept PDF/DOCX metadata, reject other files, and Remove clears the selection', () => {
    let draft = { ...empty, uploadedResume: { name: '', size: '' } };
    let selectedFile = null;
    const state = [];
    let cursor = 0;
    const { ResumePicker } = load(
        'resources/js/components/applicant/resume-dropzone.tsx',
        {
            react: {
                ...React,
                useRef: () => ({ current: null }),
                useState(initial) {
                    const index = cursor++;
                    if (!(index in state)) state[index] = initial;
                    return [
                        state[index],
                        (value) => {
                            state[index] =
                                typeof value === 'function'
                                    ? value(state[index])
                                    : value;
                        },
                    ];
                },
            },
        },
    );
    const render = () => {
        cursor = 0;
        return ResumePicker({
            draft,
            documents: [],
            invalid: false,
            onFileChange: (file) => {
                selectedFile = file;
            },
            onPatch: (patch) => {
                draft = { ...draft, ...patch };
            },
        });
    };
    const control = (id) =>
        find(render(), (node) => node.props?.['data-testid'] === id);
    control('input-apply-upload').props.onChange({
        target: { files: [{ name: 'resume.PDF', size: 2048 }], value: '' },
    });
    assert.deepEqual(draft.uploadedResume, {
        name: 'resume.PDF',
        size: '2 KB',
    });
    assert.equal(selectedFile.name, 'resume.PDF');
    const firstAttachment = find(
        render(),
        (node) => node.props?.className === 'apply-upload-file',
    ).key;
    control('input-apply-upload').props.onChange({
        target: { files: [{ name: 'resume.PDF', size: 3072 }], value: '' },
    });
    assert.notEqual(
        find(render(), (node) => node.props?.className === 'apply-upload-file')
            .key,
        firstAttachment,
        'Accepting a same-name replacement must replay its attachment feedback',
    );
    control('dropzone-apply-resume').props.onDrop({
        preventDefault() {},
        dataTransfer: { files: [{ name: 'unsafe.html', size: 500 }] },
    });
    assert.equal(draft.uploadedResume.name, 'resume.PDF');
    assert.ok(
        find(render(), (node) => node.props?.id === 'apply-upload-error'),
    );
    control('dropzone-apply-resume').props.onDrop({
        preventDefault() {},
        dataTransfer: { files: [{ name: 'updated.docx', size: 3072 }] },
    });
    assert.deepEqual(draft.uploadedResume, {
        name: 'updated.docx',
        size: '3 KB',
    });
    assert.equal(
        find(render(), (node) => node.props?.id === 'apply-upload-error'),
        null,
    );
    control('button-apply-upload-remove').props.onClick();
    assert.deepEqual(draft.uploadedResume, { name: '', size: '' });
    assert.equal(selectedFile, null);
    assert.ok(control('button-apply-upload-browse'));
});

await test('required document controls reject non-PDF and oversized files and allow selecting and removing PDFs', () => {
    const files = new Map();
    const state = [];
    let cursor = 0;
    const { RequiredDocumentUploads } = load(
        'resources/js/components/applicant/required-document-uploads.tsx',
        {
            react: {
                ...React,
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
        },
    );
    const render = () => {
        cursor = 0;
        return RequiredDocumentUploads({
            names: ['NBI clearance', 'Police clearance'],
            files,
            blocked: true,
            onChange: (name, file) => {
                if (file) files.set(name, file);
                else files.delete(name);
            },
        });
    };
    const input = () =>
        find(render(), (node) => node.props?.id === 'apply-document-0');
    const dropzone = () =>
        find(
            render(),
            (node) =>
                node.props?.['data-testid'] === 'dropzone-required-document-0',
        );
    assert.ok(
        dropzone(),
        'Required documents must offer the resume-style dropzone',
    );
    assert.equal(input().props.accept, '.pdf,application/pdf');
    assert.equal(input().props['aria-invalid'], true);
    const html = renderToStaticMarkup(
        React.createElement(React.Fragment, null, render()),
    );
    assert.match(html, /NBI clearance/);
    assert.match(html, /Police clearance/);
    assert.match(html, /Upload NBI clearance before continuing/);
    dropzone().props.onDragOver({ preventDefault() {} });
    assert.match(dropzone().props.className, /is-dragging/);
    dropzone().props.onDrop({
        preventDefault() {},
        dataTransfer: {
            files: [{ name: 'unsafe.html', type: 'text/html', size: 10 }],
        },
    });
    assert.equal(files.size, 0);
    assert.doesNotMatch(dropzone().props.className, /is-dragging/);
    for (const file of [
        {
            name: 'nbi.docx',
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: 10,
        },
        { name: 'nbi.pdf', type: 'text/html', size: 10 },
        {
            name: 'nbi.pdf',
            type: 'application/pdf',
            size: 10 * 1024 * 1024 + 1,
        },
    ]) {
        input().props.onChange({
            target: { files: [file], value: 'selected' },
        });
        assert.equal(files.size, 0);
        assert.ok(
            find(
                render(),
                (node) => node.props?.id === 'apply-document-0-error',
            ),
        );
    }
    const pdf = new File(['%PDF-1.4'], 'nbi.PDF', { type: 'application/pdf' });
    dropzone().props.onDrop({
        preventDefault() {},
        dataTransfer: { files: [pdf] },
    });
    assert.equal(files.get('NBI clearance'), pdf);
    const firstAttachment = find(
        render(),
        (node) => node.props?.className === 'apply-upload-file',
    ).key;
    const replacement = new File(['%PDF-1.4 updated'], 'nbi.PDF', {
        type: 'application/pdf',
    });
    dropzone().props.onDrop({
        preventDefault() {},
        dataTransfer: { files: [replacement] },
    });
    assert.equal(files.get('NBI clearance'), replacement);
    assert.notEqual(
        find(render(), (node) => node.props?.className === 'apply-upload-file')
            .key,
        firstAttachment,
        'Accepting a same-name replacement must replay its attachment feedback',
    );
    assert.equal(
        find(render(), (node) => node.props?.id === 'apply-document-0-error'),
        null,
    );
    assert.equal(
        input().props.type,
        'file',
        'The labelled file control stays mounted after selection',
    );
    assert.match(
        renderToStaticMarkup(
            React.createElement(React.Fragment, null, render()),
        ),
        /nbi.PDF/,
    );
    find(
        render(),
        (node) =>
            node.props?.['data-testid'] === 'button-remove-required-document-0',
    ).props.onClick();
    assert.equal(files.size, 0);
    assert.equal(input().props.type, 'file');
    input().props.onChange({ target: { files: [], value: '' } });
    assert.equal(files.size, 0);
    input().props.onChange({
        target: {
            files: [{ name: 'nbi.pdf', type: '', size: 10 * 1024 * 1024 }],
            value: '',
        },
    });
    assert.equal(files.get('NBI clearance').size, 10 * 1024 * 1024);
});

await test('job details show only the saved required documents and escape their names', () => {
    const { JobDetailPanel } = load(
        'resources/js/components/applicant/job-detail-panel.tsx',
        {
            '@/components/formatted-text': { FormattedText: () => null },
            '@/routes/agencies': { show: { url: () => '/agencies/agency' } },
            './job-facts': { JobFacts: () => null, JOB_FACT_OVERVIEW: [] },
        },
    );
    const props = {
        job: {
            id: '1',
            title: 'Welder',
            agency: 'Agency',
            postingType: 'job_order',
            requiredDocuments: ['NBI clearance', '<script>police</script>'],
        },
        isSaved: false,
        onToggleSaved() {},
        applyHref: '/job/1/apply',
    };
    const html = renderToStaticMarkup(
        React.createElement(JobDetailPanel, props),
    );
    assert.match(html, /aria-label="Required documents"/);
    assert.match(html, /<li>NBI clearance<\/li>/);
    assert.match(html, /&lt;script&gt;police&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>/);
    assert.doesNotMatch(
        renderToStaticMarkup(
            React.createElement(JobDetailPanel, {
                ...props,
                job: { ...props.job, requiredDocuments: [] },
            }),
        ),
        /aria-label="Required documents"/,
    );
});

await test('review sections keep optional blanks distinct from required warnings and edit the correct field', () => {
    const { ReviewStep } = load(
        'resources/js/components/applicant/apply-review.tsx',
    );
    const edited = [];
    const props = {
        draft: empty,
        questions,
        jobTitle: 'Welder',
        agency: 'Agency',
        documents: [],
        onEditSection: (id) => edited.push(id),
    };
    const html = renderToStaticMarkup(React.createElement(ReviewStep, props));
    assert.match(html, /Required — not provided/);
    assert.match(html, /Not provided/);
    assert.match(html, /Q1/);
    assert.match(html, /Q3/);
    const section = find(
        ReviewStep(props),
        (node) => node.props?.target === 'apply-resume',
    );
    const link = find(
        section.type(section.props),
        (node) =>
            node.props?.['data-testid'] ===
            'button-review-edit-resume-and-cover-letter',
    );
    link.props.onClick({ preventDefault() {} });
    assert.deepEqual(edited, ['apply-resume']);
});

await test('checklist counts No as answered, ignores whitespace and excludes answers to removed questions', () => {
    const { ApplyChecklist } = load(
        'resources/js/components/applicant/apply-checklist.tsx',
    );
    const html = renderToStaticMarkup(
        React.createElement(ApplyChecklist, {
            job: { agency: 'Agency', quantity: 3, salary: 'Negotiable' },
            step: 2,
            questions,
            draft: {
                ...empty,
                resumeId: 'resume-1',
                coverLetter: '   ',
                answers: { license: 'No', obsolete: 'Ignore this' },
            },
        }),
    );
    assert.match(html, /1\/2 answered/);
    assert.match(html, /0 added/);
    assert.match(html, /href="#question-experience"/);
    assert.match(html, /value="2" max="3"/);
});

await test('error navigation scrolls the focused control rather than a tall resume fieldset', (t) => {
    const previous = globalThis.document;
    const events = [];
    const control = {
        focus: () => events.push('focused control'),
        scrollIntoView: () => events.push('scrolled control'),
    };
    globalThis.document = {
        getElementById: () => ({
            matches: () => false,
            querySelector: () => control,
            scrollIntoView: () => events.push('scrolled fieldset'),
        }),
    };
    t.after(() => {
        globalThis.document = previous;
    });
    const { focusApplyField } = load(
        'resources/js/components/applicant/apply-field.tsx',
    );
    focusApplyField('apply-resume');
    assert.deepEqual(events, ['focused control', 'scrolled control']);
});

await test('paragraph height follows width changes and disconnects its observer on unmount', (t) => {
    const previous = globalThis.ResizeObserver;
    const previousFrame = globalThis.requestAnimationFrame;
    const previousCancel = globalThis.cancelAnimationFrame;
    const cancelled = [];
    let frame;
    let observed;
    let notify;
    let disconnected = false;
    let cleanup;
    const textarea = { style: {}, clientWidth: 500, scrollHeight: 100 };
    globalThis.requestAnimationFrame = (callback) => {
        frame = callback;
        return 1;
    };
    globalThis.cancelAnimationFrame = (id) => cancelled.push(id);
    globalThis.ResizeObserver = class {
        constructor(callback) {
            notify = callback;
        }
        observe(target) {
            observed = target;
        }
        disconnect() {
            disconnected = true;
        }
    };
    t.after(() => {
        globalThis.ResizeObserver = previous;
        globalThis.requestAnimationFrame = previousFrame;
        globalThis.cancelAnimationFrame = previousCancel;
    });
    const { ApplyQuestion } = load(
        'resources/js/components/applicant/apply-question.tsx',
        {
            react: {
                ...React,
                useRef: () => ({ current: textarea }),
                useLayoutEffect: (effect) => {
                    cleanup = effect();
                },
            },
        },
    );
    ApplyQuestion({
        question: questions[0],
        number: 1,
        answer: 'A long existing answer',
        onAnswer() {},
    });
    assert.equal(textarea.style.height, '100px');
    assert.equal(observed, textarea);
    textarea.clientWidth = 250;
    textarea.scrollHeight = 200;
    notify();
    assert.equal(
        textarea.style.height,
        '100px',
        'Observer delivery must not write layout synchronously',
    );
    frame();
    assert.equal(textarea.style.height, '200px');
    cleanup();
    assert.equal(disconnected, true);
    assert.equal(cancelled.at(-1), 1);
});
