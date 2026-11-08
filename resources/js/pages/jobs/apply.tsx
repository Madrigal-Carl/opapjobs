import { Head, Link } from '@inertiajs/react';
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
import { index as jobsIndex, show as jobsShow } from '@/routes/jobs';
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
    /** `null` when the applicant may not see the job post. */
    jobPost: PublicJobPostDetail | null;
    questions?: JobQuestion[];
};

/**
 * Four steps: match guidance, documents, employer questions, then review.
 *
 * Answers are kept per listing in localStorage as they are typed, so a
 * refresh restores the latest input rather than losing the application. The
 * draft is cleared the moment a submission is recorded.
 */
export default function JobApply(props: JobApplyProps) {
    return (
        <ApplicantScope>
            <JobApplyBody key={props.jobId} {...props} />
        </ApplicantScope>
    );
}

function JobApplyBody({
    jobId,
    jobPost,
    questions: jobQuestions,
}: JobApplyProps) {
    const { markApplied, toggleSaved, isSaved } = useApplications();
    const { profile } = useApplicantProfile();

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
    const [submitted, setSubmitted] = useState(false);
    const hasLoadedDraft = useRef(false);
    const columnRef = useRef<HTMLDivElement>(null);
    const hasMovedFocus = useRef(false);
    const pendingField = useRef<string | null>(null);

    const questions = useMemo(() => (job ? getJobQuestions(job) : []), [job]);
    const required = useMemo(
        () => (job ? requiredJobQuestions(job) : []),
        [job],
    );

    const hasResume = Boolean(draft.resumeId || draft.uploadedResume?.name);
    const missingAnswers = missingRequiredAnswers(required, draft.answers);
    const resumeOutstanding = hasResume ? [] : ['Choose which resume to send'];
    const answerOutstanding = missingAnswers.length
        ? [`Answer ${countLabel(missingAnswers.length, 'question')}`]
        : [];
    const outstanding = step === 2 ? resumeOutstanding : answerOutstanding;
    const reachableStep = Math.min(
        draft.furthestStep,
        !hasResume ? 2 : missingAnswers.length ? 3 : 4,
    );

    useEffect(() => {
        const stored = readApplicationDraft(jobId);
        const hasContent = Boolean(
            stored.coverLetter.trim() ||
            stored.salary.trim() ||
            stored.availability.trim() ||
            stored.resumeId ||
            stored.uploadedResume ||
            Object.keys(stored.answers).length > 0,
        );

        const validStep = Math.min(
            stored.furthestStep,
            !stored.resumeId && !stored.uploadedResume?.name
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
    }, [jobId, required]);

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

        writeApplicationDraft(job.id, draft);
    }, [draft, job, submitted]);

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
                    ? 'apply-resume'
                    : `question-${missingAnswers[0].id}`;
            setBlocked(outstanding);
            requestAnimationFrame(() => focusApplyField(firstProblem));

            return;
        }

        goToStep(step === 2 ? 3 : 4);
    };

    const editSection = (id: string) => {
        pendingField.current = id;
        goToStep(id === 'apply-resume' || id === 'apply-cover-letter' ? 2 : 3);
    };

    const requiredLeft =
        step === 2 ? Number(!hasResume) : missingAnswers.length;

    const submit = () => {
        if (isClosed) {
            return;
        }
        if (!hasResume) {
            goToStep(2);
            setBlocked(resumeOutstanding);
            return;
        }
        if (missingAnswers.length) {
            goToStep(3);
            setBlocked(answerOutstanding);
            return;
        }
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
                        aria-label="Application steps"
                    >
                        {APPLICATION_STEPS.map((name, index) => {
                            const number = (index + 1) as ApplicationStep;
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
                                            number > reachableStep ||
                                            (isClosed && number > step)
                                        }
                                        aria-label={`Step ${number}: ${name}`}
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
                        Step {step} of 4 · {APPLICATION_STEPS[step - 1]}
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
                                        />
                                    )}

                                    {step !== 1 && (
                                        <div className="apply-actions apply-actions-bar">
                                            <button
                                                type="button"
                                                className="apply-text-action"
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
                                                    disabled={isClosed}
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
                                    Choose your resume, then answer a few
                                    questions.
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
            <h2 tabIndex={-1}>Application ready</h2>
            <p className="apply-card-lede">
                Your application for {job.title} with{' '}
                <strong>{job.agency}</strong> is complete. Sending it to the
                agency is not connected yet, so it has not been submitted — the
                agency will contact you on {contact} once it is.
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
