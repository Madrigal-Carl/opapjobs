import { Head } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    CircleCheck,
    FileText,
    History,
    TriangleAlert,
    Upload,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { JobNotFound } from '@/components/applicant/job-not-found';
import { ApplicantScope } from '@/components/applicant/applicant-scope';
import {
    ApplyRailRow,
    FieldError,
    MatchBlockList,
} from '@/components/applicant/match-blocks';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useApplications } from '@/contexts/applications-context';
import { useApplicantProfile } from '@/contexts/applicant-profile-context';
import {
    AVAILABILITY_OPTIONS,
    COVER_LETTER_CHIPS,
    YES_NO_OPTIONS,
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
import { countLabel, formatFileSize } from '@/data/applicant-profile';
import { getEffectiveStatus, getPublicLocation } from '@/data/job-attributes';
import { getJobList } from '@/data/job-store';
import { generateMatchAnalysis, overallMatchMeta } from '@/data/match-analysis';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { applications } from '@/routes';
import { index as jobsIndex } from '@/routes/jobs';
import {
    APPLICATION_STEPS,
    missingRequiredAnswers,
    type ApplicationAnswer,
    type ApplicationStep,
    type MatchAnalysis,
} from '@/types/application-draft';
import type { ResumeDocument } from '@/types/applicant-profile';
import type { Job, JobQuestion } from '@/types/job';

/** How long typing settles before the draft is written to storage. */
const DRAFT_DEBOUNCE_MS = 400;

type JobApplyProps = {
    jobId: string;
};

/**
 * The three-step apply wizard.
 *
 * Step 1 is read-only and explains why the role is or is not a fit. Step 2
 * is the only page in the flow that takes input. Step 3 restates everything
 * the applicant just entered, because submitting is the one action here that
 * cannot be undone.
 *
 * Answers are kept per listing in localStorage as they are typed, so a
 * closed tab costs a few seconds rather than the whole application. The
 * draft is cleared the moment a submission is recorded.
 */
export default function JobApply({ jobId }: JobApplyProps) {
    return (
        <ApplicantScope>
            <JobApplyBody jobId={jobId} />
        </ApplicantScope>
    );
}

function JobApplyBody({ jobId }: JobApplyProps) {
    const { markApplied } = useApplications();
    const { profile } = useApplicantProfile();

    const job = useMemo(
        () => getJobList().find((item) => item.id === jobId),
        [jobId],
    );

    // Seeded empty so the server and the client agree on the first frame;
    // any saved answers are read back on the mount tick after that.
    const [draft, setDraft] = useState<ApplicationDraftRecord>(newDraftRecord);
    const [step, setStep] = useState<ApplicationStep>(1);
    const [restored, setRestored] = useState(false);
    const [blocked, setBlocked] = useState<string[]>([]);
    const [submitted, setSubmitted] = useState(false);
    const hasLoadedDraft = useRef(false);

    const questions = useMemo(() => (job ? getJobQuestions(job) : []), [job]);
    const required = useMemo(
        () => (job ? requiredJobQuestions(job) : []),
        [job],
    );

    const match = useMemo(
        () => (job ? generateMatchAnalysis(job, profile) : null),
        [job, profile],
    );

    useEffect(() => {
        const stored = readApplicationDraft(jobId);

        setDraft(stored);
        setRestored(
            Boolean(
                stored.coverLetter.trim() ||
                stored.salary.trim() ||
                stored.availability.trim() ||
                stored.resumeId ||
                Object.keys(stored.answers).length > 0,
            ),
        );
        hasLoadedDraft.current = true;
    }, [jobId]);

    const debouncedDraft = useDebouncedValue(draft, DRAFT_DEBOUNCE_MS);
    const isFirstWrite = useRef(true);

    useEffect(() => {
        if (!job) {
            return;
        }

        // The debounce fires on mount with the seed value, which would
        // overwrite the record we only meant to read.
        if (isFirstWrite.current) {
            isFirstWrite.current = false;

            return;
        }

        if (!hasLoadedDraft.current) {
            return;
        }

        writeApplicationDraft(job.id, debouncedDraft);
    }, [debouncedDraft, job]);

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
            setBlocked([]);
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

    if (!job || !match) {
        return <JobNotFound title="This job is no longer available" />;
    }

    const isClosed = getEffectiveStatus(job) === 'closed';

    const startApplication = () => goToStep(2);

    /**
     * Reports everything that is missing at once rather than refusing to
     * move on: a disabled button gives an applicant no way to find out why.
     */
    const reviewApplication = () => {
        const missing = missingRequiredAnswers(required, draft.answers);
        const problems: string[] = [];

        if (!draft.resumeId && !draft.uploadedResume) {
            problems.push('Choose which resume to send');
        }

        if (missing.length > 0) {
            problems.push(`Answer ${countLabel(missing.length, 'question')}`);
        }

        if (problems.length > 0) {
            setBlocked(problems);

            return;
        }

        goToStep(3);
    };

    const submit = () => {
        markApplied(job.id);
        clearApplicationDraft(job.id);
        setSubmitted(true);
    };

    const startOver = () => {
        const fresh = newDraftRecord();

        setDraft(fresh);
        writeApplicationDraft(job.id, fresh);
        setRestored(false);
        setBlocked([]);
        setSubmitted(false);
        setStep(1);
    };

    return (
        <>
            <Head title={`Apply — ${job.title} | OPAP Job Abroad`} />

            <section className="apply-hero">
                <div className="shell apply-hero-inner">
                    <div className="eyebrow">
                        <span className="eyebrow-rule" /> APPLYING FOR
                    </div>
                    <h1>{job.title}</h1>
                    <p>
                        {job.agency} · {getPublicLocation(job)} · {job.salary}
                    </p>

                    <ol
                        className="apply-stepper"
                        aria-label="Application steps"
                    >
                        {APPLICATION_STEPS.map((name, index) => {
                            const number = (index + 1) as ApplicationStep;
                            const isCurrent = number === step;
                            const isDone = number < step;

                            return (
                                <li key={name}>
                                    <button
                                        type="button"
                                        className={[
                                            'apply-step w-full',
                                            isCurrent ? 'is-current' : '',
                                            isDone ? 'is-done' : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                        disabled={isCurrent}
                                        aria-current={
                                            isCurrent ? 'step' : undefined
                                        }
                                        onClick={() => goToStep(number)}
                                        data-testid={`apply-step-${number}`}
                                    >
                                        <span className="apply-step-number">
                                            {isDone ? (
                                                <Check
                                                    size={12}
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                number
                                            )}
                                        </span>
                                        <span className="apply-step-name">
                                            {name}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </section>

            <section className="apply-body">
                <div className="shell">
                    <div className="apply-columns">
                        <div>
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

                            {restored && step > 1 && (
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
                                    {step === 1 && (
                                        <MatchStep
                                            match={match}
                                            agency={job.agency}
                                        />
                                    )}

                                    {step === 2 && (
                                        <ApplicationStepForm
                                            agency={job.agency}
                                            draft={draft}
                                            questions={questions}
                                            documents={profile.documents}
                                            profileName={profile.name}
                                            blocked={blocked}
                                            onPatch={patch}
                                            onAnswer={answer}
                                        />
                                    )}

                                    {step === 3 && (
                                        <ReviewStep
                                            draft={draft}
                                            questions={questions}
                                            jobTitle={job.title}
                                            agency={job.agency}
                                            documents={profile.documents}
                                            onEditStep={goToStep}
                                        />
                                    )}

                                    <div className="apply-actions">
                                        {step > 1 ? (
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() =>
                                                    goToStep(
                                                        (step -
                                                            1) as ApplicationStep,
                                                    )
                                                }
                                                data-testid="button-apply-back"
                                            >
                                                <ArrowLeft
                                                    size={15}
                                                    aria-hidden="true"
                                                />{' '}
                                                Back
                                            </Button>
                                        ) : (
                                            <a
                                                className="job-detail-back-link"
                                                href={jobsIndex.url()}
                                            >
                                                <ArrowLeft
                                                    size={15}
                                                    aria-hidden="true"
                                                />{' '}
                                                Back to jobs
                                            </a>
                                        )}

                                        <span className="apply-actions-spacer" />

                                        {step === 1 && (
                                            <Button
                                                type="button"
                                                onClick={startApplication}
                                                data-testid="button-apply-next-1"
                                            >
                                                Start application{' '}
                                                <ArrowRight
                                                    size={15}
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                        )}

                                        {step === 2 && (
                                            <Button
                                                type="button"
                                                onClick={reviewApplication}
                                                data-testid="button-apply-next-2"
                                            >
                                                Review application{' '}
                                                <ArrowRight
                                                    size={15}
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                        )}

                                        {step === 3 && (
                                            <Button
                                                type="button"
                                                onClick={submit}
                                                disabled={isClosed}
                                                data-testid="button-apply-submit"
                                            >
                                                Submit application{' '}
                                                <Check
                                                    size={15}
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <ApplyRail job={job} step={step} draft={draft} />
                    </div>
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
            <h2>Your application is with the agency</h2>
            <p className="apply-card-lede">
                <strong>{job.agency}</strong> has your application for{' '}
                {job.title}. They will contact you on {contact} when there is an
                update.
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
    const ringColor = meta.tone === 'amber' ? 'var(--amber)' : 'var(--teal)';

    return (
        <div className="apply-card">
            <h2>Before you apply</h2>
            <p className="apply-card-lede">
                This compares your resume against what {agency} asked for on
                this listing. It is guidance, not a decision — the agency reads
                every application.
            </p>

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
                        <span className="match-score-suffix">/100</span>
                        <div className="match-score-label">{meta.label}</div>
                    </div>
                </div>
                <p className="match-score-copy">
                    Scored across education, experience, skills, certifications,
                    languages, availability and how your career has moved so
                    far. Every number comes from the listing and your resume —
                    nothing here is a stored rating.
                </p>
            </div>

            <ul className="match-list">
                {match.categories.map((category) => (
                    <MatchRow key={category.label} category={category} />
                ))}
            </ul>

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

function MatchRow({
    category,
}: {
    category: MatchAnalysis['categories'][number];
}) {
    const fill =
        category.score >= 80
            ? 'var(--teal)'
            : category.score >= 60
              ? 'var(--amber)'
              : 'var(--slate)';
    const key = category.label.toLowerCase().replaceAll(' ', '-');

    return (
        <li className="match-row">
            <div className="match-row-head">
                <span>{category.label}</span>
                <span
                    className="match-row-score"
                    data-testid={`match-score-${key}`}
                >
                    {Math.round(category.score)}%
                </span>
            </div>
            <div className="match-track">
                <div
                    className="match-fill"
                    style={{ width: `${category.score}%`, background: fill }}
                />
            </div>
        </li>
    );
}

function ApplicationStepForm({
    agency,
    draft,
    questions,
    documents,
    profileName,
    blocked,
    onPatch,
    onAnswer,
}: {
    agency: string;
    draft: ApplicationDraftRecord;
    questions: JobQuestion[];
    documents: ResumeDocument[];
    profileName: string;
    blocked: string[];
    onPatch: (next: Partial<ApplicationDraftRecord>) => void;
    onAnswer: (questionId: string, value: ApplicationAnswer) => void;
}) {
    return (
        <div className="apply-card">
            <h2>Your application</h2>
            <p className="apply-card-lede">
                Everything here is saved as you type. Nothing reaches the agency
                until you press submit on the last step.
            </p>

            {blocked.length > 0 && (
                <ul
                    className="apply-blocked-list"
                    role="alert"
                    data-testid="list-apply-blocked"
                >
                    {blocked.map((problem) => (
                        <li key={problem}>
                            <TriangleAlert size={13} aria-hidden="true" />
                            {problem}
                        </li>
                    ))}
                </ul>
            )}

            <div className="apply-field-stack">
                <fieldset className="field">
                    <legend className="field-label">
                        Resume
                        <span className="field-required">*</span>
                    </legend>
                    <p className="field-hint">
                        Sending as {profileName}. Pick a document from your
                        profile, or upload one now.
                    </p>

                    <ResumePicker
                        draft={draft}
                        documents={documents}
                        onPatch={onPatch}
                    />

                    {blocked.length > 0 &&
                        !draft.resumeId &&
                        !draft.uploadedResume && (
                            <FieldError>
                                Choose a resume before continuing.
                            </FieldError>
                        )}
                </fieldset>

                <div className="field">
                    <label className="field-label" htmlFor="apply-cover-letter">
                        Cover letter
                        <span className="field-optional">
                            optional, but it is read
                        </span>
                    </label>
                    <Textarea
                        id="apply-cover-letter"
                        className="field-control"
                        value={draft.coverLetter}
                        placeholder="Why this role, and why you."
                        onChange={(event) =>
                            onPatch({ coverLetter: event.target.value })
                        }
                        data-testid="input-apply-cover-letter"
                    />
                    <div className="apply-cover-chips">
                        {COVER_LETTER_CHIPS.map((chip) => (
                            <button
                                key={chip.slug}
                                type="button"
                                className="apply-chip"
                                onClick={() =>
                                    onPatch({
                                        coverLetter: `${draft.coverLetter.trim()}${
                                            draft.coverLetter.trim() ? ' ' : ''
                                        }${chip.snippet}`,
                                    })
                                }
                                data-testid={`chip-apply-${chip.slug}`}
                            >
                                + {chip.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="field-row">
                    <div className="field">
                        <label className="field-label" htmlFor="apply-salary">
                            Expected salary
                        </label>
                        <input
                            id="apply-salary"
                            type="text"
                            className="field-control"
                            value={draft.salary}
                            placeholder="e.g. AED 6,000 / month"
                            onChange={(event) =>
                                onPatch({ salary: event.target.value })
                            }
                            data-testid="input-apply-salary"
                        />
                        <p className="field-hint">
                            Leave blank to let the agency quote theirs.
                        </p>
                    </div>

                    <div className="field">
                        <label
                            className="field-label"
                            htmlFor="apply-availability"
                        >
                            Availability
                        </label>
                        <select
                            id="apply-availability"
                            className="field-control"
                            value={draft.availability}
                            onChange={(event) =>
                                onPatch({ availability: event.target.value })
                            }
                            data-testid="select-apply-availability"
                        >
                            <option value="">Not sure yet</option>
                            {AVAILABILITY_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {questions.length > 0 && (
                    <div className="apply-field-stack">
                        <span className="field-label">
                            Questions from {agency}
                        </span>
                        {questions.map((question) => (
                            <QuestionField
                                key={question.id}
                                question={question}
                                answer={draft.answers[question.id]}
                                onAnswer={onAnswer}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ResumePicker({
    draft,
    documents,
    onPatch,
}: {
    draft: ApplicationDraftRecord;
    documents: ResumeDocument[];
    onPatch: (next: Partial<ApplicationDraftRecord>) => void;
}) {
    return (
        <>
            <div
                className="apply-doc-list"
                role="radiogroup"
                aria-label="Resume to send"
            >
                {documents.map((document) => (
                    <label
                        key={document.id}
                        className={`apply-doc-option ${
                            draft.resumeId === document.id ? 'is-selected' : ''
                        }`}
                    >
                        <input
                            type="radio"
                            name="resume"
                            checked={draft.resumeId === document.id}
                            onChange={() =>
                                onPatch({
                                    resumeId: document.id,
                                    uploadedResume: null,
                                })
                            }
                            data-testid={`radio-resume-${document.id}`}
                        />
                        <FileText size={15} aria-hidden="true" />
                        <span>{document.name}</span>
                        <span className="apply-doc-meta">
                            {document.uploadedAt} · {document.size}
                        </span>
                    </label>
                ))}

                <label
                    className={`apply-doc-option ${
                        draft.uploadedResume ? 'is-selected' : ''
                    }`}
                >
                    <input
                        type="radio"
                        name="resume"
                        checked={Boolean(draft.uploadedResume)}
                        onChange={() =>
                            onPatch({
                                resumeId: null,
                                uploadedResume: { name: '', size: '' },
                            })
                        }
                        data-testid="radio-resume-upload"
                    />
                    <Upload size={15} aria-hidden="true" />
                    <span>Upload a different file</span>
                    <span className="apply-doc-meta">PDF or DOCX</span>
                </label>
            </div>

            {draft.uploadedResume && (
                <>
                    <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="field-control"
                        aria-label="Upload your resume"
                        data-testid="input-apply-upload"
                        onChange={(event) => {
                            const file = event.target.files?.[0];

                            onPatch({
                                uploadedResume: file
                                    ? {
                                          name: file.name,
                                          size: formatFileSize(file.size),
                                      }
                                    : null,
                            });
                        }}
                    />
                    {draft.uploadedResume.name && (
                        <p className="field-hint">
                            {draft.uploadedResume.name} ·{' '}
                            {draft.uploadedResume.size}
                        </p>
                    )}
                </>
            )}
        </>
    );
}

function QuestionField({
    question,
    answer,
    onAnswer,
}: {
    question: JobQuestion;
    answer: ApplicationAnswer | undefined;
    onAnswer: (questionId: string, value: ApplicationAnswer) => void;
}) {
    if (question.type === 'yesno') {
        const selected = typeof answer === 'string' ? answer : '';

        return (
            <div className="field">
                <span className="field-label">
                    {question.label}
                    {question.required && (
                        <span className="field-required">*</span>
                    )}
                </span>
                <div
                    className="apply-yesno"
                    role="radiogroup"
                    aria-label={question.label}
                >
                    {YES_NO_OPTIONS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            className={selected === option ? 'is-selected' : ''}
                            onClick={() => onAnswer(question.id, option)}
                            data-testid={`button-answer-${question.id}-${option.toLowerCase()}`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="field">
            <label className="field-label" htmlFor={`question-${question.id}`}>
                {question.label}
                {question.required && <span className="field-required">*</span>}
            </label>
            <Textarea
                id={`question-${question.id}`}
                className="field-control"
                rows={question.type === 'short' ? 2 : 4}
                value={typeof answer === 'string' ? answer : ''}
                placeholder="Your answer"
                onChange={(event) => onAnswer(question.id, event.target.value)}
                data-testid={`input-answer-${question.id}`}
            />
        </div>
    );
}

function ReviewStep({
    draft,
    questions,
    jobTitle,
    agency,
    documents,
    onEditStep,
}: {
    draft: ApplicationDraftRecord;
    questions: JobQuestion[];
    jobTitle: string;
    agency: string;
    documents: ResumeDocument[];
    onEditStep: (step: ApplicationStep) => void;
}) {
    const resumeName =
        draft.uploadedResume?.name ||
        documents.find((item) => item.id === draft.resumeId)?.name ||
        '';

    return (
        <div className="apply-card">
            <h2>Review and submit</h2>
            <p className="apply-card-lede">
                This is what {agency} will see for {jobTitle}. Check it once
                more — after submitting, you can only withdraw.
            </p>

            <div className="review-grid">
                <ReviewRow label="Resume" value={resumeName} />
                <ReviewRow
                    label="Cover letter"
                    value={draft.coverLetter.trim()}
                />
                <ReviewRow
                    label="Expected salary"
                    value={draft.salary.trim()}
                />
                <ReviewRow label="Availability" value={draft.availability} />

                {questions.map((question) => (
                    <ReviewRow
                        key={question.id}
                        label={question.label}
                        value={
                            typeof draft.answers[question.id] === 'string'
                                ? (draft.answers[question.id] as string)
                                : ''
                        }
                    />
                ))}
            </div>

            <div className="apply-actions" style={{ borderTop: 'none' }}>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onEditStep(2)}
                    data-testid="button-review-edit"
                >
                    Edit my answers
                </Button>
            </div>

            <p className="apply-card-lede">
                By submitting you confirm the details above are yours and agree
                that the agency may share them with the hiring employer.
            </p>
        </div>
    );
}

/** What an unanswered review row reads as, so blanks stand out. */
const REVIEW_PLACEHOLDERS: Record<string, string> = {
    Resume: 'No resume attached',
    'Cover letter': 'Not included',
    'Expected salary': 'Let the agency quote',
    Availability: 'Not stated',
};

function ReviewRow({ label, value }: { label: string; value: string }) {
    const placeholder = REVIEW_PLACEHOLDERS[label] ?? '—';
    const shown = value.trim() || placeholder;

    return (
        <div className="review-block">
            <span className="review-label">{label}</span>
            <p
                className={`review-value ${value.trim() ? '' : 'is-empty'}`}
                data-testid={`review-${label
                    .toLowerCase()
                    .replaceAll(/[^a-z0-9]+/g, '-')}`}
            >
                {shown}
            </p>
        </div>
    );
}

function ApplyRail({
    job,
    step,
    draft,
}: {
    job: Job;
    step: ApplicationStep;
    draft: ApplicationDraftRecord;
}) {
    const answered = Object.keys(draft.answers).length;

    const note: Record<ApplicationStep, ReactNode> = {
        1: 'Read the fit report. Nothing is sent on this step.',
        2: `${countLabel(answered, 'question')} answered so far. Saved automatically.`,
        3: 'Check each line, then submit to send it to the agency.',
    };

    return (
        <aside className="apply-rail">
            <div className="apply-rail-card">
                <p className="apply-rail-title">What this role asks for</p>
                <ApplyRailRow label="Agency" value={job.agency} />
                <ApplyRailRow
                    label="Slots"
                    value={countLabel(job.quantity, 'position')}
                />
                <ApplyRailRow label="Advertised pay" value={job.salary} />
            </div>

            <div className="apply-rail-card">
                <p className="apply-rail-title">
                    Step {step} of {APPLICATION_STEPS.length}
                </p>
                <p className="field-hint">{note[step]}</p>
            </div>
        </aside>
    );
}
