import { Head, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Save,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApplicationQuestionsStep } from '@/components/applicant/application-questions-step';
import { ApplicationStepper } from '@/components/applicant/application-stepper';
import { JobNotFound } from '@/components/applicant/job-not-found';
import { MatchAnalysisStep } from '@/components/applicant/match-analysis-step';
import { ReviewSubmitStep } from '@/components/applicant/review-submit-step';
import { SubmitSuccess } from '@/components/applicant/submit-success';
import { Button } from '@/components/ui/button';
import { useApplications } from '@/contexts/applications-context';
import {
    buildApplicantProfile,
    formatFileSize,
} from '@/data/applicant-profile';
import {
    clearApplicationDraft,
    draftProgress,
    loadApplicationDraft,
    saveApplicationDraft,
} from '@/data/application-draft-store';
import { getEffectiveStatus } from '@/data/job-attributes';
import { describeLocation, generateMatchAnalysis } from '@/data/match-analysis';
import { getJobById } from '@/data/job-store';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { applications as applicationsRoute } from '@/routes';
import { show as jobShow } from '@/routes/jobs';
import {
    missingRequiredAnswers,
    type ApplicationAnswer,
    type ApplicationDraft,
    type ApplicationStep,
    type MatchAnalysis,
} from '@/types/application-draft';
import type { ApplicantProfile } from '@/types/applicant-profile';

type JobApplyProps = {
    jobId: string;
};

/** How long the mock analysis takes before the scores appear. */
const ANALYSIS_DELAY_MS = 900;

/** How long the mock submit takes before the confirmation screen. */
const SUBMIT_DELAY_MS = 1200;

/** How long typing settles before the draft is written to storage. */
const DRAFT_SAVE_DEBOUNCE_MS = 400;

function emptyDraft(): ApplicationDraft {
    return {
        resumeId: null,
        uploadedResume: null,
        coverLetter: '',
        salary: '',
        availability: '',
        answers: {},
    };
}

/**
 * Picks up a draft left on this device. Read once on mount — a restored
 * draft is reported to the applicant, so nothing appears from nowhere.
 */
type DraftSession = {
    draft: ApplicationDraft;
    restored: boolean;
};

function readSession(jobId: string): DraftSession {
    const stored = loadApplicationDraft(jobId);

    if (stored && draftProgress(stored) > 0) {
        return { draft: stored, restored: true };
    }

    return { draft: emptyDraft(), restored: false };
}

export default function JobApply({ jobId }: JobApplyProps) {
    const { props } = usePage();
    const user = props.auth.user;
    const { isApplied, markApplied } = useApplications();

    const job = getJobById(jobId);

    const [step, setStep] = useState<ApplicationStep>(1);
    const [session] = useState<DraftSession>(() => readSession(jobId));
    const [draft, setDraft] = useState<ApplicationDraft>(session.draft);
    const [showRestored, setShowRestored] = useState(session.restored);
    const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const profile = useMemo<ApplicantProfile | null>(
        () => (user ? buildApplicantProfile(user) : null),
        [user],
    );

    const savedDraft = useDebouncedValue(draft, DRAFT_SAVE_DEBOUNCE_MS);

    useEffect(() => {
        if (!job || !profile) {
            return;
        }

        const timer = window.setTimeout(() => {
            setAnalysis(generateMatchAnalysis(job, profile));
        }, ANALYSIS_DELAY_MS);

        return () => window.clearTimeout(timer);
    }, [job, profile]);

    // Persist as the applicant types, but never once the application has
    // been handed over.
    useEffect(() => {
        if (submitted) {
            return;
        }

        saveApplicationDraft(jobId, savedDraft);
    }, [jobId, savedDraft, submitted]);

    // Pre-select the primary resume so the common case is one click to
    // continue rather than three.
    useEffect(() => {
        if (!profile) {
            return;
        }

        setDraft((current) => {
            if (current.resumeId || current.uploadedResume) {
                return current;
            }

            const primary =
                profile.documents.find((document) => document.primary) ??
                profile.documents[0];

            return { ...current, resumeId: primary?.id ?? null };
        });
    }, [profile]);

    /** Throws away a restored draft and starts the application over. */
    const startFresh = () => {
        clearApplicationDraft(jobId);
        setDraft({
            ...emptyDraft(),
            resumeId:
                profile?.documents.find((document) => document.primary)?.id ??
                profile?.documents[0]?.id ??
                null,
        });
        setErrors({});
        setShowRestored(false);
        setStep(1);
    };

    const patchDraft = useCallback((patch: Partial<ApplicationDraft>) => {
        setDraft((current) => ({ ...current, ...patch }));
        setErrors((current) => {
            const next = { ...current };

            for (const key of Object.keys(patch)) {
                delete next[key];
            }

            return next;
        });
    }, []);

    const setAnswer = useCallback(
        (questionId: string, value: ApplicationAnswer) => {
            setDraft((current) => ({
                ...current,
                answers: { ...current.answers, [questionId]: value },
            }));
            setErrors((current) => {
                if (!current[questionId]) {
                    return current;
                }

                const next = { ...current };
                delete next[questionId];

                return next;
            });
        },
        [],
    );

    const handleUploadResume = useCallback(
        (file: File) => {
            patchDraft({
                resumeId: null,
                uploadedResume: {
                    name: file.name,
                    size: formatFileSize(file.size),
                },
            });
        },
        [patchDraft],
    );

    /**
     * Every required field is reported at once so the applicant does not
     * discover them one Continue press at a time.
     */
    const validateStep2 = useCallback((): boolean => {
        if (!job) {
            return true;
        }

        const found: Record<string, string> = {};

        if (!draft.resumeId && !draft.uploadedResume) {
            found.resume = 'Choose a saved resume or upload a new one.';
        }

        if (!draft.coverLetter.trim()) {
            found.coverLetter = 'Add a short cover letter for the agency.';
        }

        if (!draft.salary.trim()) {
            found.salary = 'Tell the agency what you are expecting.';
        }

        if (!draft.availability) {
            found.availability = 'Choose when you can start.';
        }

        for (const question of missingRequiredAnswers(
            job.questions ?? [],
            draft.answers,
        )) {
            found[question.id] = 'This question needs an answer.';
        }

        setErrors(found);

        return Object.keys(found).length === 0;
    }, [draft, job]);

    if (!job) {
        return <JobNotFound title="Job opening not found" />;
    }

    if (getEffectiveStatus(job) !== 'published') {
        return <JobNotFound title="This listing is closed" />;
    }

    if (submitted && profile) {
        return (
            <>
                <Head
                    title={`Application sent — ${job.title} | OPAP Job Abroad`}
                />
                <section className="apply-section">
                    <div className="mx-auto max-w-3xl">
                        <SubmitSuccess
                            job={job}
                            applicantName={user?.name.split(' ')[0] ?? 'there'}
                        />
                    </div>
                </section>
            </>
        );
    }

    if (isApplied(job.id)) {
        return (
            <>
                <Head
                    title={`Already applied — ${job.title} | OPAP Job Abroad`}
                />
                <section className="apply-section">
                    <div className="mx-auto max-w-3xl">
                        <div
                            className="apply-already"
                            data-testid="already-applied"
                        >
                            <span className="apply-already-icon">
                                <CheckCircle2 size={28} aria-hidden="true" />
                            </span>
                            <h1>You have already applied to this job</h1>
                            <p>
                                Your application for{' '}
                                <strong className="text-[var(--ink)]">
                                    {job.title}
                                </strong>{' '}
                                at{' '}
                                <strong className="text-[var(--ink)]">
                                    {job.agency}
                                </strong>{' '}
                                is already in. Track it from My Jobs.
                            </p>
                            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                <Button
                                    asChild
                                    data-testid="link-already-applied-apps"
                                >
                                    <a href={applicationsRoute.url()}>
                                        View my applications
                                    </a>
                                </Button>
                                <Button
                                    variant="secondary"
                                    asChild
                                    data-testid="link-already-applied-job"
                                >
                                    <a href={jobShow.url(job.id)}>
                                        Back to job
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </>
        );
    }

    const goToStep = (target: ApplicationStep) => {
        setStep(target);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleContinue = () => {
        if (step === 2 && !validateStep2()) {
            return;
        }

        goToStep(Math.min(step + 1, 3) as ApplicationStep);
    };

    const handleSubmit = () => {
        if (submitting) {
            return;
        }

        setSubmitting(true);
        window.setTimeout(() => {
            markApplied(job.id);
            clearApplicationDraft(job.id);
            setSubmitting(false);
            setSubmitted(true);
            setShowRestored(false);
            window.scrollTo({ top: 0 });
        }, SUBMIT_DELAY_MS);
    };

    return (
        <>
            <Head title={`Apply — ${job.title} | OPAP Job Abroad`} />

            <section className="apply-section">
                <div className="mx-auto max-w-3xl">
                    <a
                        className="job-detail-back-link"
                        href={jobShow.url(job.id)}
                        data-testid="link-back-to-job"
                    >
                        <ArrowLeft size={16} aria-hidden="true" /> Back to{' '}
                        {job.title}
                    </a>

                    <div className="mt-5">
                        <p className="apply-eyebrow">Applying for</p>
                        <h1 className="apply-title">{job.title}</h1>
                        <p className="apply-subtitle">
                            {job.agency} · {describeLocation(job)}
                        </p>
                    </div>

                    {showRestored && (
                        <p
                            className="apply-draft-restored"
                            role="status"
                            data-testid="apply-draft-restored"
                        >
                            <Save
                                size={15}
                                aria-hidden="true"
                                className="shrink-0"
                            />
                            <span>
                                We kept the answers you started on this device,
                                so you can pick up where you left off.
                            </span>
                            <button
                                type="button"
                                onClick={startFresh}
                                className="apply-draft-reset"
                                data-testid="button-apply-start-fresh"
                            >
                                Start over
                            </button>
                        </p>
                    )}

                    {profile && (
                        <div className="mt-6 overflow-hidden rounded-md border border-[var(--line)] bg-white shadow-sm">
                            <div className="border-b border-[var(--line)] px-5 py-5 sm:px-8">
                                <ApplicationStepper currentStep={step} />
                            </div>

                            <div className="px-5 py-6 sm:px-8 sm:py-8">
                                {step === 1 && (
                                    <MatchAnalysisStep analysis={analysis} />
                                )}
                                {step === 2 && (
                                    <ApplicationQuestionsStep
                                        job={job}
                                        documents={profile.documents}
                                        draft={draft}
                                        errors={errors}
                                        onPatch={patchDraft}
                                        onAnswer={setAnswer}
                                        onUploadResume={handleUploadResume}
                                    />
                                )}
                                {step === 3 && (
                                    <ReviewSubmitStep
                                        job={job}
                                        profile={profile}
                                        draft={draft}
                                        documents={profile.documents}
                                        onEdit={(target) =>
                                            goToStep(target as ApplicationStep)
                                        }
                                    />
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-4 sm:px-8">
                                {step > 1 ? (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() =>
                                            goToStep(
                                                (step - 1) as ApplicationStep,
                                            )
                                        }
                                        data-testid="button-back"
                                    >
                                        <ChevronLeft aria-hidden="true" /> Back
                                    </Button>
                                ) : (
                                    <span aria-hidden="true" />
                                )}

                                {step < 3 ? (
                                    <Button
                                        type="button"
                                        onClick={handleContinue}
                                        data-testid="button-continue"
                                    >
                                        Continue
                                        <ChevronRight aria-hidden="true" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        loading={submitting}
                                        onClick={handleSubmit}
                                        data-testid="button-submit-application"
                                    >
                                        {submitting
                                            ? 'Submitting your application…'
                                            : 'Submit application'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {profile && (
                        <p className="mt-4 px-1 text-center text-xs text-[var(--slate)]">
                            Applying as{' '}
                            <strong className="text-[var(--ink)]">
                                {profile.name}
                            </strong>{' '}
                            · {profile.email}
                        </p>
                    )}
                </div>
            </section>
        </>
    );
}
