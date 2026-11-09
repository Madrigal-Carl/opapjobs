import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    CircleCheck,
    Bookmark,
    ShieldCheck,
    Sparkles,
    History,
    TriangleAlert,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { JobNotFound } from '@/components/applicant/job-not-found';
import { ApplicantScope } from '@/components/applicant/applicant-scope';
import { focusApplyField } from '@/components/applicant/apply-field';
import { ApplicationStepForm } from '@/components/applicant/apply-form';
import { ReviewStep } from '@/components/applicant/apply-review';
import {
    ApplyRailRow,
    MatchBlockList,
} from '@/components/applicant/match-blocks';
import { Button } from '@/components/ui/button';
import { useApplications } from '@/contexts/applications-context';
import { useApplicantProfile } from '@/contexts/applicant-profile-context';
import {
    getJobQuestions,
    requiredJobQuestions,
} from '@/data/application-questions';
import {
    advanceStep,
    clearApplicationDraft,
    newDraftRecord,
    readApplicationDraft,
    writeApplicationDraft,
    type ApplicationDraftRecord,
} from '@/data/application-draft-store';
import { countLabel } from '@/data/applicant-profile';
import { overallMatchMeta } from '@/data/match-analysis';
import { toApplyJob } from '@/lib/public-catalog';
import { getNameInitials } from '@/lib/name-initials';
import { applications } from '@/routes';
import {
    index as jobsIndex,
    show as jobsShow,
    submit as submitJob,
} from '@/routes/jobs';
import {
    APPLICATION_STEPS,
    missingRequiredAnswers,
    type ApplicationAnswer,
    type ApplicationStep,
    type MatchAnalysis,
} from '@/types/application-draft';
import type { Job, JobQuestion } from '@/types/job';
import type { PublicJobPostDetail } from '@/types/public-catalog';

/** shortcut: fixed demo guidance until live match assessment is connected. */
const DEMO_MATCH: MatchAnalysis = {
    overall: 31.2,
    categories: [
        { label: 'Education', score: 63.3 },
        { label: 'Experience', score: 30 },
        { label: 'Skills', score: 0 },
        { label: 'Certifications', score: 25 },
        { label: 'Languages', score: 40 },
        { label: 'Availability & Location', score: 30 },
        { label: 'Career Trajectory', score: 30 },
    ],
    strengths: [
        'Education matches at 63.3%',
        'Languages matches at 40%',
        '0 years of experience against a 2-year minimum',
    ],
    gaps: [
        'Skills scores lowest at 0%',
        'Certifications scores lowest at 25%',
        'This listing asks for 2 years; your resume shows 0',
        'The listing asks for a qualification above your highest',
    ],
    tips: [],
};

type JobApplyProps = {
    jobId: string;
    applicantId: string;
    /** `null` when the applicant may not see the job post. */
    jobPost: PublicJobPostDetail | null;
    questions?: JobQuestion[];
};

/**
 * Match guidance, documents, optional employer questions, then review.
 *
 * Answers are kept per listing in localStorage as they are typed, so a
 * refresh restores the latest input rather than losing the application. The
 * draft is cleared the moment a submission is recorded.
 */
export default function JobApply(props: JobApplyProps) {
    return (
        <ApplicantScope>
            <JobApplyBody
                key={`${props.applicantId}:${props.jobId}`}
                {...props}
            />
        </ApplicantScope>
    );
}

function JobApplyBody({
    jobId,
    applicantId,
    jobPost,
    questions: jobQuestions,
}: JobApplyProps) {
    const { markApplied, toggleSaved, isSaved, isApplied } = useApplications();
    const { profile } = useApplicantProfile();
    const draftKey = `${applicantId}:${jobId}`;

    const job = useMemo(
        () => (jobPost ? toApplyJob(jobPost, jobQuestions ?? []) : undefined),
        [jobPost, jobQuestions],
    );

    // Seeded empty so the server and the client agree on the first frame;
    // any saved answers are read back on the mount tick after that.
    const [draft, setDraft] = useState<ApplicationDraftRecord>(newDraftRecord);
    const [step, setStep] = useState<ApplicationStep>(1);
    const [restored, setRestored] = useState(false);
    const [blocked, setBlocked] = useState<string[]>([]);
    const [submitted, setSubmitted] = useState(() => isApplied(jobId));
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [supportingFiles, setSupportingFiles] = useState<Map<string, File>>(
        () => new Map(),
    );
    const [processing, setProcessing] = useState(false);
    const [submissionErrors, setSubmissionErrors] = useState<
        Record<string, string>
    >({});
    const submitting = useRef(false);
    const hasLoadedDraft = useRef(false);
    const columnRef = useRef<HTMLDivElement>(null);
    const hasMovedFocus = useRef(false);
    const pendingField = useRef<string | null>(null);

    const questions = useMemo(() => (job ? getJobQuestions(job) : []), [job]);
    const hasQuestions = questions.length > 0;
    const steps = APPLICATION_STEPS.map((label, index) => ({
        id: (index + 1) as ApplicationStep,
        label,
    })).filter(({ id }) => id !== 3 || hasQuestions);
    const required = useMemo(
        () => (job ? requiredJobQuestions(job) : []),
        [job],
    );

    const hasResume = Boolean(
        draft.resumeId || (draft.uploadedResume?.name && resumeFile),
    );
    const requiredDocuments = jobPost?.requiredDocuments ?? [];
    const missingDocuments = requiredDocuments.filter(
        (name) => !supportingFiles.has(name),
    );
    const documentsReady = hasResume && missingDocuments.length === 0;
    const missingAnswers = missingRequiredAnswers(required, draft.answers);
    const documentOutstanding = [
        ...(hasResume ? [] : ['Choose which resume to send']),
        ...missingDocuments.map((name) => `Upload ${name}`),
    ];
    const answerOutstanding = missingAnswers.length
        ? [`Answer ${countLabel(missingAnswers.length, 'question')}`]
        : [];
    const outstanding = step === 2 ? documentOutstanding : answerOutstanding;
    const reachableStep = Math.min(
        draft.furthestStep,
        !documentsReady ? 2 : missingAnswers.length ? 3 : 4,
    );

    useEffect(() => {
        if (hasLoadedDraft.current) {
            return;
        }
        const stored = readApplicationDraft(draftKey);
        const hasContent = Boolean(
            stored.coverLetter.trim() ||
            stored.resumeId ||
            stored.uploadedResume ||
            Object.keys(stored.answers).length > 0,
        );

        if (stored.uploadedResume && !resumeFile) {
            stored.uploadedResume = { name: '', size: '' };
            setSubmissionErrors({
                resume: 'Please select your resume file again. Your typed answers have been kept.',
            });
        }
        const validStep = Math.min(
            stored.furthestStep === 3 && !hasQuestions
                ? 4
                : stored.furthestStep,
            (!stored.resumeId && !resumeFile) || missingDocuments.length > 0
                ? 2
                : missingRequiredAnswers(required, stored.answers).length
                  ? 3
                  : 4,
        ) as ApplicationStep;
        setDraft({ ...stored, furthestStep: validStep });
        setRestored(hasContent);

        /** Reopen at the reached step unless a resume or newly required answer is missing. */
        if (!hasLoadedDraft.current && hasContent && stored.furthestStep > 1) {
            setStep(validStep);
        }

        hasLoadedDraft.current = true;
    }, [draftKey, required, hasQuestions, resumeFile, missingDocuments.length]);

    const isFirstWrite = useRef(true);

    useEffect(() => {
        if (!job || submitted) {
            return;
        }

        // Do not overwrite the saved draft with the initial empty state.
        if (isFirstWrite.current) {
            isFirstWrite.current = false;

            return;
        }

        if (!hasLoadedDraft.current) {
            return;
        }

        writeApplicationDraft(draftKey, draft);
    }, [draft, job, submitted, draftKey]);

    useEffect(() => {
        if (step === 3 && !hasQuestions) {
            setStep(documentsReady ? 4 : 2);
        }
    }, [step, hasQuestions, documentsReady]);

    /*
     * Swapping steps unmounts whichever button was pressed, which drops focus
     * onto <body> and sends a keyboard user back to the top of the document to
     * reach what just replaced it. The incoming heading takes focus instead.
     * Skipped on the first run so restoring a draft cannot steal focus on
     * load, and after `submitted` as well so the confirmation is announced.
     */
    useEffect(() => {
        if (!hasMovedFocus.current) {
            hasMovedFocus.current = true;

            return;
        }

        columnRef.current
            ?.querySelector<HTMLElement>('.apply-card h2')
            ?.focus();

        if (pendingField.current) {
            focusApplyField(pendingField.current);
            pendingField.current = null;
        }
    }, [step, submitted]);

    const patch = useCallback((next: Partial<ApplicationDraftRecord>) => {
        setDraft((current) => ({
            ...current,
            ...next,
            // A field written from a step ahead advances the stepper.
            furthestStep: next.furthestStep
                ? advanceStep(current.furthestStep, next.furthestStep)
                : current.furthestStep,
        }));
    }, []);

    const answer = useCallback(
        (questionId: string, value: ApplicationAnswer) => {
            setDraft((current) => ({
                ...current,
                answers: { ...current.answers, [questionId]: value },
            }));
        },
        [],
    );

    const goToStep = useCallback((next: ApplicationStep) => {
        setBlocked([]);
        setStep(next);
        setDraft((current) => ({
            ...current,
            furthestStep: advanceStep(current.furthestStep, next),
        }));
    }, []);

    const changeDocument = (name: string, file: File | null) => {
        setSupportingFiles((current) => {
            const next = new Map(current);
            if (file) next.set(name, file);
            else next.delete(name);
            return next;
        });
    };

    if (!job) {
        return <JobNotFound title="This job is no longer available" />;
    }

    const isClosed = !jobPost?.isAcceptingApplications;

    const startApplication = () => {
        if (!isClosed) {
            goToStep(2);
        }
    };

    /**
     * Reports everything that is missing at once rather than refusing to
     * move on: a disabled button gives an applicant no way to find out why.
     */
    const reviewApplication = () => {
        if (outstanding.length > 0) {
            const firstProblem =
                step === 2
                    ? !hasResume
                        ? 'apply-resume'
                        : `apply-document-${requiredDocuments.indexOf(missingDocuments[0])}`
                    : `question-${missingAnswers[0].id}`;
            setBlocked(outstanding);
            requestAnimationFrame(() => focusApplyField(firstProblem));

            return;
        }

        goToStep(step === 2 && hasQuestions ? 3 : 4);
    };

    const editSection = (id: string) => {
        if (submitting.current) {
            return;
        }
        pendingField.current = id;
        goToStep(
            id === 'apply-resume' ||
                id.startsWith('apply-document-') ||
                id === 'apply-cover-letter' ||
                !hasQuestions
                ? 2
                : 3,
        );
    };

    const requiredLeft =
        step === 2
            ? Number(!hasResume) + missingDocuments.length
            : missingAnswers.length;

    const submit = () => {
        if (isClosed || submitting.current || submitted) {
            return;
        }
        if (!documentsReady) {
            goToStep(2);
            setBlocked(documentOutstanding);
            return;
        }
        if (missingAnswers.length) {
            goToStep(3);
            setBlocked(answerOutstanding);
            return;
        }
        submitting.current = true;
        setProcessing(true);
        setSubmissionErrors({});
        router.post(
            submitJob.url(job.id),
            {
                resume_document_id: resumeFile
                    ? null
                    : (draft.resumeId?.replace(/^doc-/, '') ?? null),
                resume: resumeFile,
                cover_letter: draft.coverLetter.trim() || null,
                documents: requiredDocuments.map((name) => ({
                    name,
                    file: supportingFiles.get(name)!,
                })),
                answers: Object.fromEntries(
                    questions.map((question) => [
                        question.id,
                        typeof draft.answers[question.id] === 'string'
                            ? draft.answers[question.id]
                            : '',
                    ]),
                ),
            },
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    if (
                        String(page.props.jobId) !== job.id ||
                        !page.props.submittedApplicationId
                    ) {
                        setSubmissionErrors({
                            application:
                                'Submission could not be confirmed. Your draft is still saved.',
                        });
                        return;
                    }
                    markApplied(job.id);
                    clearApplicationDraft(draftKey);
                    setSubmitted(true);
                    setResumeFile(null);
                    setSupportingFiles(new Map());
                },
                onError: (errors) => {
                    setSubmissionErrors(errors);
                    if (
                        errors.resume ||
                        Object.keys(errors).some((key) =>
                            key.startsWith('documents'),
                        ) ||
                        errors.resume_document_id ||
                        errors.cover_letter
                    ) {
                        goToStep(2);
                    } else if (
                        Object.keys(errors).some((key) =>
                            key.startsWith('answers'),
                        )
                    ) {
                        setStep(hasQuestions ? 3 : 2);
                    }
                    setBlocked(Object.values(errors));
                },
                onFinish: () => {
                    submitting.current = false;
                    setProcessing(false);
                },
            },
        );
    };

    const startOver = () => {
        const fresh = newDraftRecord();

        setDraft(fresh);
        writeApplicationDraft(draftKey, fresh);
        setRestored(false);
        setBlocked([]);
        setSubmitted(false);
        setResumeFile(null);
        setSupportingFiles(new Map());
        setSubmissionErrors({});
        setStep(1);
    };

    return (
        <>
            <Head title={`Apply — ${job.title} | OPAP Job Abroad`} />

            <section className="apply-body">
                <div className="shell">
                    <header className="apply-job-header">
                        <div className="apply-logo-tile" aria-hidden="true">
                            {getNameInitials(job.agency)}
                        </div>
                        <div>
                            <p className="apply-header-eyebrow">Applying for</p>
                            <h1>{job.title}</h1>
                            <p className="apply-job-meta">
                                {job.agency} · {job.location} · {job.salary}
                            </p>
                            <Link
                                className="apply-text-action"
                                href={jobsShow.url(job.id)}
                            >
                                View job description
                            </Link>
                        </div>
                    </header>

                    <ol
                        className="apply-stepper"
                        style={{
                            gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
                        }}
                        aria-label="Application steps"
                    >
                        {steps.map(({ id: number, label: name }, index) => {
                            const isCurrent = number === step;
                            const isDone = number < step;

                            return (
                                <li
                                    key={name}
                                    className={isDone ? 'is-done' : ''}
                                >
                                    <button
                                        type="button"
                                        className={[
                                            'apply-progress-step',
                                            isCurrent ? 'is-current' : '',
                                            isDone ? 'is-done' : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                        disabled={
                                            isCurrent ||
                                            submitted ||
                                            processing ||
                                            number > reachableStep ||
                                            (isClosed && number > step)
                                        }
                                        aria-label={`Step ${index + 1}: ${name}`}
                                        aria-current={
                                            isCurrent ? 'step' : undefined
                                        }
                                        onClick={() => {
                                            if (number <= reachableStep) {
                                                goToStep(number);
                                            }
                                        }}
                                        data-testid={`apply-step-${number}`}
                                    >
                                        <span className="apply-progress-dot">
                                            {isDone ? (
                                                <Check
                                                    size={12}
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <span className="apply-progress-inner" />
                                            )}
                                        </span>
                                        <span className="apply-progress-label">
                                            {name}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                    <p className="apply-mobile-progress">
                        Step {steps.findIndex(({ id }) => id === step) + 1} of{' '}
                        {steps.length} · {APPLICATION_STEPS[step - 1]}
                    </p>
                    <p className="apply-autosave">
                        <CircleCheck size={14} aria-hidden="true" /> Saved
                        automatically on this device
                    </p>
                    <div
                        className={
                            step === 1 && !submitted
                                ? 'apply-columns'
                                : 'apply-form-column'
                        }
                    >
                        <div ref={columnRef}>
                            {isClosed && (
                                <p
                                    className="job-closed-notice"
                                    role="status"
                                    data-testid="status-apply-closed"
                                >
                                    <TriangleAlert
                                        size={15}
                                        aria-hidden="true"
                                    />
                                    This listing has closed and is no longer
                                    accepting applications.
                                </p>
                            )}

                            {restored && !submitted && step > 1 && (
                                <p
                                    className="apply-draft-notice"
                                    role="status"
                                    data-testid="status-apply-restored"
                                >
                                    <History size={15} aria-hidden="true" />
                                    <span>
                                        We kept the answers you had already
                                        entered for this role. Nothing was sent.
                                    </span>
                                    <button
                                        type="button"
                                        onClick={startOver}
                                        disabled={processing}
                                        data-testid="button-apply-start-over"
                                    >
                                        Start over
                                    </button>
                                </p>
                            )}

                            {submitted ? (
                                <SubmittedCard
                                    job={job}
                                    contact={profile.phone || profile.email}
                                />
                            ) : (
                                <>
                                    {Object.keys(submissionErrors).length >
                                        0 && (
                                        <div
                                            className="apply-blocked-list"
                                            role="alert"
                                            data-testid="status-apply-submit-errors"
                                        >
                                            {Object.entries(
                                                submissionErrors,
                                            ).map(([field, message]) => (
                                                <p key={field}>{message}</p>
                                            ))}
                                        </div>
                                    )}
                                    {step === 1 && (
                                        <MatchStep
                                            match={DEMO_MATCH}
                                            agency={job.agency}
                                        />
                                    )}

                                    {(step === 2 || step === 3) && (
                                        <ApplicationStepForm
                                            step={step}
                                            agency={job.agency}
                                            draft={draft}
                                            questions={questions}
                                            documents={profile.documents}
                                            profileName={profile.name}
                                            blocked={blocked}
                                            outstanding={outstanding}
                                            onPatch={patch}
                                            onAnswer={answer}
                                            onFileChange={setResumeFile}
                                            requiredDocuments={
                                                requiredDocuments
                                            }
                                            supportingFiles={supportingFiles}
                                            onDocumentChange={changeDocument}
                                        />
                                    )}

                                    {step === 4 && (
                                        <ReviewStep
                                            draft={draft}
                                            questions={questions}
                                            jobTitle={job.title}
                                            agency={job.agency}
                                            documents={profile.documents}
                                            onEditSection={editSection}
                                            requiredDocuments={
                                                requiredDocuments
                                            }
                                            supportingFiles={supportingFiles}
                                        />
                                    )}

                                    {step !== 1 && (
                                        <div className="apply-actions apply-actions-bar">
                                            <button
                                                type="button"
                                                className="apply-text-action"
                                                onClick={() =>
                                                    goToStep(
                                                        (step === 4 &&
                                                        !hasQuestions
                                                            ? 2
                                                            : step -
                                                              1) as ApplicationStep,
                                                    )
                                                }
                                                data-testid="button-apply-back"
                                                disabled={processing}
                                            >
                                                <ArrowLeft
                                                    size={15}
                                                    aria-hidden="true"
                                                />{' '}
                                                Back
                                            </button>

                                            <span className="apply-actions-spacer" />

                                            {(step === 2 || step === 3) && (
                                                <span
                                                    className="apply-actions-remaining"
                                                    role="status"
                                                    data-testid="status-apply-required-left"
                                                >
                                                    {requiredLeft === 0
                                                        ? 'Ready to continue'
                                                        : `${requiredLeft} required left`}
                                                </span>
                                            )}

                                            {(step === 2 || step === 3) && (
                                                <Button
                                                    type="button"
                                                    onClick={reviewApplication}
                                                    disabled={
                                                        isClosed || processing
                                                    }
                                                    data-testid={`button-apply-next-${step}`}
                                                >
                                                    Continue{' '}
                                                    <ArrowRight
                                                        size={15}
                                                        aria-hidden="true"
                                                    />
                                                </Button>
                                            )}

                                            {step === 4 && (
                                                <Button
                                                    type="button"
                                                    onClick={submit}
                                                    disabled={
                                                        isClosed || processing
                                                    }
                                                    data-testid="button-apply-submit"
                                                >
                                                    {processing
                                                        ? 'Submitting…'
                                                        : 'Submit application'}{' '}
                                                    <Check
                                                        size={15}
                                                        aria-hidden="true"
                                                    />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {step === 1 && !submitted && <MatchRail job={job} />}
                    </div>
                    {step === 1 && !submitted && (
                        <footer className="apply-match-actions">
                            <div>
                                <h3>Ready to proceed with your application?</h3>
                                <p>
                                    {hasQuestions
                                        ? 'Choose your resume, then answer a few questions.'
                                        : 'Choose your resume, then review your application.'}
                                </p>
                            </div>
                            <div className="apply-match-buttons">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    aria-pressed={isSaved(job.id)}
                                    onClick={() => toggleSaved(job.id)}
                                    data-testid="button-apply-save-match"
                                >
                                    <Bookmark
                                        size={16}
                                        fill={
                                            isSaved(job.id)
                                                ? 'currentColor'
                                                : 'none'
                                        }
                                        aria-hidden="true"
                                    />
                                    {isSaved(job.id)
                                        ? 'Match saved'
                                        : 'Save match'}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={startApplication}
                                    disabled={isClosed}
                                    data-testid="button-apply-next-1"
                                >
                                    Continue to apply{' '}
                                    <ArrowRight size={16} aria-hidden="true" />
                                </Button>
                            </div>
                        </footer>
                    )}
                </div>
            </section>
        </>
    );
}

function SubmittedCard({ job, contact }: { job: Job; contact: string }) {
    return (
        <div className="apply-card apply-success">
            <CircleCheck
                size={30}
                className="text-[var(--teal)]"
                aria-hidden="true"
            />
            <h2 tabIndex={-1}>Application submitted</h2>
            <p className="apply-card-lede">
                Your application for {job.title} with{' '}
                <strong>{job.agency}</strong> has been submitted. The agency can
                review it and contact you at {contact} about next steps.
            </p>
            <div className="apply-actions">
                <Button asChild>
                    <a href={applications.url()}>Track it on My Jobs</a>
                </Button>
                <Button asChild variant="secondary">
                    <a href={jobsIndex.url()}>Browse more jobs</a>
                </Button>
            </div>
        </div>
    );
}

function MatchStep({
    match,
    agency,
}: {
    match: MatchAnalysis;
    agency: string;
}) {
    const meta = overallMatchMeta(match.overall);
    const ringColor = `var(--${meta.tone})`;
    const met = match.categories.filter(
        (category) => category.score >= 70,
    ).length;

    return (
        <div className="apply-match-main">
            <div className="apply-card match-overview">
                <div className="match-header-chips">
                    <span>
                        <Sparkles size={14} aria-hidden="true" /> AI MATCH
                        ANALYSIS
                    </span>
                    <span className={`match-eligibility is-${meta.tone}`}>
                        {meta.label}
                    </span>
                </div>

                <div className="match-hero">
                    <div
                        className="match-score-ring"
                        style={{
                            background: `conic-gradient(${ringColor} ${match.overall * 3.6}deg, var(--surface-soft) 0deg)`,
                        }}
                        role="img"
                        aria-label={`Overall match ${Math.round(match.overall)} out of 100`}
                        data-testid="match-overall-score"
                    >
                        <div className="text-center">
                            <span className="match-score-value">
                                {Math.round(match.overall)}
                            </span>
                            <span className="match-score-suffix">%</span>
                        </div>
                    </div>
                    <div>
                        <h2 tabIndex={-1}>{meta.label}</h2>
                        <p className="match-score-copy">
                            Your profile meets {met} of{' '}
                            {match.categories.length} criteria assessed for this
                            role with {agency}.
                        </p>
                    </div>
                </div>
                <p className="match-disclaimer">
                    Demo guidance only, not a live profile assessment or hiring
                    decision. The agency reviews your application.
                </p>
            </div>

            <section
                className="match-assessment"
                aria-labelledby="match-criteria-title"
            >
                <div className="match-section-heading">
                    <h3 id="match-criteria-title">Core criteria assessment</h3>
                    <span>
                        {met} of {match.categories.length} criteria met
                    </span>
                </div>
            </section>

            <MatchBlockList
                blocks={{
                    strengths: match.strengths,
                    gaps: match.gaps,
                    tips: match.tips,
                }}
            />
        </div>
    );
}

function MatchRail({ job }: { job: Job }) {
    return (
        <aside className="apply-rail" aria-label="About this role">
            <section className="apply-rail-card">
                <h2>The role at a glance</h2>
                <ApplyRailRow label="Agency" value={job.agency} />
                <ApplyRailRow label="Open positions" value={job.quantity} />
                <ApplyRailRow label="Advertised pay" value={job.salary} />
                {job.contractDuration && (
                    <ApplyRailRow
                        label="Contract"
                        value={
                            job.contractDuration === 'fixed'
                                ? 'Fixed term'
                                : job.contractDuration === 'seasonal'
                                  ? 'Seasonal'
                                  : 'Permanent'
                        }
                    />
                )}
                <ApplyRailRow label="Location" value={job.location} />
                {Boolean(job.benefits?.length) && (
                    <div className="apply-benefits">
                        {job.benefits?.map((benefit) => (
                            <span key={benefit}>{benefit}</span>
                        ))}
                    </div>
                )}
            </section>
            {job.poeaLicenseNo && (
                <section className="apply-rail-card apply-verification">
                    <ShieldCheck size={24} aria-hidden="true" />
                    <h2>Verified agency</h2>
                    <p>{job.agency}</p>
                    <p>
                        POEA license: <strong>{job.poeaLicenseNo}</strong>
                    </p>
                </section>
            )}
        </aside>
    );
}
