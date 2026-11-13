import { Head, Link, setLayoutProps, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Banknote,
    Building2,
    CalendarDays,
    Check,
    ChevronDown,
    Clock,
    Download,
    ExternalLink,
    FileText,
    Mail,
    MapPin,
    Phone,
    UserRound,
    X,
    type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
    RejectApplicationDialog,
    useApplicationStageTransition,
    useAutoReviewOnOpen,
} from '@/components/dashboard/application-actions';
import { PathwayBadge, StageBadge } from '@/components/dashboard/badges';
import { ListingTag } from '@/components/dashboard/listing-tag';
import { DashboardPage } from '@/components/dashboard/page';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    CONTRACT_LABELS,
    EDUCATION_LABELS,
    GENDER_LABELS,
} from '@/data/job-attributes';
import { getQuestionAnswerType } from '@/data/job-questions';
import { elapsedSince } from '@/lib/application-utils';
import { applications } from '@/routes/dashboard';
import type { Auth } from '@/types/auth';
import {
    APPLICATION_STAGE_LABELS,
    type ApplicationStageValue,
    type DashboardApplicationDetail,
} from '@/types/dashboard-application';

const AVAILABILITY_LABELS: Record<
    NonNullable<DashboardApplicationDetail['availability']>,
    string
> = {
    immediately: 'Immediately',
    within_2_weeks: 'Within 2 weeks',
    within_1_month: 'Within 1 month',
    more_than_1_month: 'More than 1 month',
};
const DOCUMENT_LABELS = {
    resume: 'Resume',
    certificate: 'Certificate',
    passport: 'Passport',
    other: 'Other document',
};
const PIPELINE_STAGES: ApplicationStageValue[] = [
    'pending',
    'reviewed',
    'shortlisted',
    'for_interview',
    'endorsed',
];
const dateFormat = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});
const sectionLabel = 'text-sm font-semibold text-[var(--navy)]';
const bodyText =
    'text-sm leading-relaxed whitespace-pre-line text-[var(--navy)]';
const mutedText = 'text-xs leading-relaxed text-[var(--slate)]';
const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const textLink = `rounded-sm underline decoration-[var(--line)] underline-offset-4 hover:decoration-current ${focusRing}`;

/** Formats ISO timestamps and date-only values without shifting the day. */
function formatDate(value: string | null): string | undefined {
    return value
        ? dateFormat.format(
              new Date(value.includes('T') ? value : `${value}T12:00:00`),
          )
        : undefined;
}

function experienceRequired(job: DashboardApplicationDetail['job']): string {
    if (
        job.min_experience_years !== null &&
        job.max_experience_years !== null
    ) {
        return `${job.min_experience_years}–${job.max_experience_years} years`;
    }
    if (job.min_experience_years !== null) {
        return `${job.min_experience_years}+ years`;
    }
    return job.max_experience_years !== null
        ? `Up to ${job.max_experience_years} years`
        : '';
}

/**
 * Mirrors the server rule (UX hint only): a pending application is
 * auto-reviewed by the job post's poster, or by an admin of the same agency
 * when the poster is not an admin.
 */
function canAutoReview(
    application: DashboardApplicationDetail,
    auth: Auth,
): boolean {
    const { job } = application;

    return (
        application.stage === 'pending' &&
        (auth.user.id === job.posted_by_user_id ||
            (auth.roles.includes('admin') &&
                !job.poster_is_admin &&
                auth.user.agency_id != null &&
                auth.user.agency_id === job.agency_id))
    );
}

/**
 * Index of the last pipeline stage the application reached. Not selected
 * applications resolve to the stage they were closed from.
 */
function reachedStageIndex(application: DashboardApplicationDetail): number {
    if (application.stage !== 'not_selected') {
        return PIPELINE_STAGES.indexOf(application.stage);
    }
    const rejection = [...application.history]
        .reverse()
        .find((entry) => entry.stage === 'not_selected');

    return Math.max(
        0,
        rejection?.from_stage
            ? PIPELINE_STAGES.indexOf(rejection.from_stage)
            : 0,
    );
}

function DetailSection({
    id,
    title,
    description,
    action,
    children,
}: {
    id: string;
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section
            id={id}
            aria-labelledby={`${id}-title`}
            className="min-w-0 scroll-mt-20 rounded-xl border border-[var(--line)] bg-white shadow-xs"
        >
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4 sm:px-6">
                <div className="flex min-w-0 flex-col gap-1">
                    <h2
                        id={`${id}-title`}
                        className="font-serif text-base font-bold text-[var(--navy-deep)]"
                    >
                        {title}
                    </h2>
                    {description && <p className={mutedText}>{description}</p>}
                </div>
                {action}
            </header>
            <div className="flex flex-col gap-5 p-5 sm:p-6">{children}</div>
        </section>
    );
}

function CountChip({ children }: { children: ReactNode }) {
    return (
        <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-medium text-[var(--slate)]">
            {children}
        </span>
    );
}

function StageProgress({
    application,
}: {
    application: DashboardApplicationDetail;
}) {
    const rejected = application.stage === 'not_selected';
    const reached = reachedStageIndex(application);

    return (
        <ol
            aria-label="Application progress"
            className="flex flex-wrap items-center gap-x-1 gap-y-3"
        >
            {PIPELINE_STAGES.map((stage, index) => {
                const done =
                    index < reached ||
                    (rejected && index === reached) ||
                    (stage === 'endorsed' && application.stage === 'endorsed');
                const current = !rejected && !done && index === reached;
                const status = done
                    ? 'completed'
                    : current
                      ? 'current stage'
                      : 'not reached';

                return (
                    <li key={stage} className="flex items-center gap-1">
                        <span
                            className={`flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs font-medium ${
                                current
                                    ? 'bg-[var(--navy)] text-white'
                                    : done
                                      ? 'bg-[var(--teal-light)] text-[var(--teal-ink)]'
                                      : 'bg-[var(--surface-soft)] text-[var(--slate)]'
                            }`}
                            aria-current={current ? 'step' : undefined}
                        >
                            <span
                                className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                    current
                                        ? 'bg-white text-[var(--navy)]'
                                        : done
                                          ? 'bg-[var(--teal)] text-white'
                                          : 'bg-white text-[var(--slate)]'
                                }`}
                                aria-hidden="true"
                            >
                                {done ? (
                                    <Check className="size-3" />
                                ) : (
                                    index + 1
                                )}
                            </span>
                            {APPLICATION_STAGE_LABELS[stage]}
                            <span className="sr-only"> ({status})</span>
                        </span>
                        {rejected && index === reached && (
                            <>
                                <span
                                    className="hidden h-px w-4 bg-[var(--danger)] sm:block"
                                    aria-hidden="true"
                                />
                                <span
                                    className="flex items-center gap-2 rounded-full bg-[var(--danger-soft)] py-1 pr-3 pl-1 text-xs font-medium text-[var(--danger)]"
                                    aria-current="step"
                                >
                                    <span
                                        className="flex size-5 items-center justify-center rounded-full bg-[var(--danger)] text-white"
                                        aria-hidden="true"
                                    >
                                        <X className="size-3" />
                                    </span>
                                    {APPLICATION_STAGE_LABELS.not_selected}
                                    <span className="sr-only">
                                        {' '}
                                        (current stage)
                                    </span>
                                </span>
                            </>
                        )}
                        {index < PIPELINE_STAGES.length - 1 && (
                            <span
                                className={`hidden h-px w-4 sm:block ${index < reached ? 'bg-[var(--teal)]' : 'bg-[var(--line)]'}`}
                                aria-hidden="true"
                            />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

function KeyFact({
    icon: Icon,
    label,
    value,
    hint,
}: {
    icon: LucideIcon;
    label: string;
    value: ReactNode;
    hint?: string;
}) {
    return (
        <div className="flex min-w-0 items-start gap-3">
            <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--teal-ink)] ring-1 ring-[var(--line)]"
                aria-hidden="true"
            >
                <Icon className="size-4" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
                <dt className={mutedText}>{label}</dt>
                <dd className="text-sm font-semibold text-[var(--navy-deep)]">
                    {value}
                </dd>
                {hint && <dd className={mutedText}>{hint}</dd>}
            </div>
        </div>
    );
}

function ApplicationDocument({
    document,
    submittedResume = false,
}: {
    document: DashboardApplicationDetail['documents'][number];
    submittedResume?: boolean;
}) {
    return (
        <div
            className={`flex min-w-0 flex-col gap-3 rounded-lg border p-4 ${
                submittedResume
                    ? 'border-[var(--teal)]/40 bg-[var(--teal-light)]/30'
                    : 'border-[var(--line)]'
            }`}
        >
            <div className="flex items-start gap-3">
                <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                        submittedResume
                            ? 'bg-[var(--teal)] text-white'
                            : 'bg-[var(--surface-soft)] text-[var(--slate)]'
                    }`}
                    aria-hidden="true"
                >
                    <FileText className="size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className={`${sectionLabel} min-w-0`}>
                            {document.name}
                        </p>
                        {submittedResume && (
                            <ListingTag tone="teal">
                                Submitted resume
                            </ListingTag>
                        )}
                    </div>
                    <p className={mutedText}>
                        {DOCUMENT_LABELS[document.document_type]} ·{' '}
                        {document.size}
                        {document.uploaded_at
                            ? ` · Uploaded ${formatDate(document.uploaded_at)}`
                            : ''}
                        {!submittedResume && document.primary
                            ? ' · Primary profile resume'
                            : ''}
                    </p>
                </div>
            </div>
            {document.url ? (
                <div className="mt-auto flex flex-wrap gap-2 sm:pl-[3.25rem]">
                    <Button
                        variant="secondary"
                        size="sm"
                        asChild
                        data-testid={
                            submittedResume
                                ? 'button-preview-resume'
                                : undefined
                        }
                    >
                        <a
                            href={document.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Preview ${document.name}`}
                        >
                            <ExternalLink aria-hidden="true" /> Preview
                        </a>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        data-testid={
                            submittedResume
                                ? 'button-download-resume'
                                : undefined
                        }
                    >
                        <a
                            href={document.url}
                            download={document.name}
                            aria-label={`Download ${document.name}`}
                        >
                            <Download aria-hidden="true" /> Download
                        </a>
                    </Button>
                </div>
            ) : (
                <p className={`${mutedText} sm:pl-[3.25rem]`}>
                    File unavailable
                </p>
            )}
        </div>
    );
}

export default function DashboardApplicationShow({
    application,
}: {
    application?: DashboardApplicationDetail;
}) {
    const { processing, proceed, reject } = useApplicationStageTransition(
        ['application'],
        application?.id ?? 0,
    );
    const [rejectOpen, setRejectOpen] = useState(false);
    const { auth } = usePage().props;
    useAutoReviewOnOpen(
        application?.id ?? 0,
        application !== undefined && canAutoReview(application, auth),
    );

    setLayoutProps({
        breadcrumbs: [
            { title: 'Applications', href: applications() },
            {
                title: application?.applicant.name ?? 'Application not found',
                href: '#',
            },
        ],
    });

    if (!application) {
        return (
            <>
                <Head title="Application not found" />
                <DashboardPage className="md:px-8">
                    <Card>
                        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                            <UserRound
                                className="size-8 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <h1 className="font-serif text-xl font-bold text-[var(--navy)]">
                                Application not found
                            </h1>
                            <p className="text-sm text-[var(--slate)]">
                                This application no longer exists in the
                                workspace.
                            </p>
                            <Button variant="secondary" asChild>
                                <Link
                                    href={applications()}
                                    data-testid="button-back-to-applications"
                                >
                                    <ArrowLeft aria-hidden="true" /> Back to
                                    applications
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </DashboardPage>
            </>
        );
    }

    const { applicant, job } = application;
    const answered = application.questions.filter((question) =>
        question.answer?.trim(),
    ).length;
    const appliedDate = formatDate(application.submitted_at);
    const appliedAgo = elapsedSince(
        application.submitted_at.slice(0, 10),
    ).replace(/^Applied /, '');
    const nextStage = application.next_stage
        ? APPLICATION_STAGE_LABELS[application.next_stage]
        : null;
    const resume = application.documents.find(
        (document) => document.id === application.resume_document_id,
    );
    const supportingDocuments = application.documents.filter(
        (document) => document.id !== application.resume_document_id,
    );
    const hasCoverLetter = Boolean(application.cover_letter?.trim());
    const sectionLinks = [
        {
            href: '#application-documents',
            label: 'Documents',
            count: String(application.documents.length),
        },
        {
            href: '#application-screening',
            label: 'Screening answers',
            count: `${answered}/${application.questions.length}`,
        },
        {
            href: '#application-letter',
            label: 'Cover letter',
            count: hasCoverLetter ? null : 'None',
        },
    ];
    const jobFacts = [
        { label: 'Recruitment agency', value: job.agency },
        {
            label: 'Pathway',
            value: job.pathway ? <PathwayBadge pathway={job.pathway} /> : null,
        },
        {
            label: 'Category / Sub-category',
            value: [job.category, job.sub_category].filter(Boolean).join(' / '),
        },
        {
            label: 'Recruitment type',
            value:
                job.posting_type === 'joborder'
                    ? 'Job order'
                    : job.posting_type === 'manpooling'
                      ? 'Manpooling'
                      : null,
        },
        { label: 'Job order number', value: job.job_order_number },
        {
            label: 'Contract duration',
            value: job.contract_type
                ? CONTRACT_LABELS[job.contract_type]
                : null,
        },
        { label: 'Vacancies', value: job.vacancies },
        {
            label: 'Education required',
            value: job.education ? EDUCATION_LABELS[job.education] : null,
        },
        { label: 'Experience required', value: experienceRequired(job) },
        {
            label: 'Gender requirement',
            value: job.gender_requirement
                ? GENDER_LABELS[job.gender_requirement]
                : null,
        },
        { label: 'Closing date', value: formatDate(job.closing_date) },
        { label: 'Posted', value: formatDate(job.posted_at) },
        {
            label: 'Job status',
            value: job.status
                ? job.status[0].toUpperCase() + job.status.slice(1)
                : null,
        },
    ];

    return (
        <>
            <Head title={`${applicant.name} · Application`} />
            <DashboardPage className="mx-auto w-full max-w-7xl gap-5 wrap-anywhere md:px-8">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button variant="ghost" size="sm" asChild>
                        <Link
                            href={applications()}
                            data-testid="button-back-to-applications"
                        >
                            <ArrowLeft aria-hidden="true" /> Back to
                            applications
                        </Link>
                    </Button>
                    <p className={mutedText}>Application #{application.id}</p>
                </div>

                <section
                    aria-label="Candidate overview"
                    className="overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-xs"
                >
                    <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                            <Avatar
                                className="size-14 shrink-0 sm:size-16"
                                aria-hidden="true"
                            >
                                <AvatarFallback className="bg-[var(--navy-deep)] font-serif text-xl font-bold text-white">
                                    {applicant.initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <h1 className="font-serif text-2xl leading-tight font-bold tracking-tight text-[var(--navy-deep)] sm:text-3xl">
                                        {applicant.name}
                                    </h1>
                                    <StageBadge
                                        stage={
                                            APPLICATION_STAGE_LABELS[
                                                application.stage
                                            ]
                                        }
                                    />
                                </div>
                                {applicant.headline && (
                                    <p className="text-sm font-medium text-[var(--slate)]">
                                        {applicant.headline}
                                    </p>
                                )}
                                <p className="text-sm leading-relaxed text-[var(--navy)]">
                                    Applied for{' '}
                                    <a
                                        href="#application-job"
                                        className={`font-semibold ${textLink}`}
                                    >
                                        {job.title}
                                    </a>
                                    {job.employer ? ` · ${job.employer}` : ''}
                                </p>
                                <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-sm text-[var(--navy)]">
                                    <li className="min-w-0">
                                        <a
                                            href={`mailto:${applicant.email}`}
                                            className={`inline-flex min-w-0 items-start gap-2 ${textLink}`}
                                        >
                                            <Mail
                                                className="mt-0.5 size-4 shrink-0 text-[var(--slate)]"
                                                aria-hidden="true"
                                            />
                                            <span className="min-w-0">
                                                {applicant.email}
                                            </span>
                                        </a>
                                    </li>
                                    {applicant.phone && (
                                        <li>
                                            <a
                                                href={`tel:${applicant.phone.replaceAll(' ', '')}`}
                                                className={`inline-flex items-start gap-2 ${textLink}`}
                                            >
                                                <Phone
                                                    className="mt-0.5 size-4 shrink-0 text-[var(--slate)]"
                                                    aria-hidden="true"
                                                />
                                                {applicant.phone}
                                            </a>
                                        </li>
                                    )}
                                    {applicant.location && (
                                        <li className="inline-flex items-start gap-2 text-[var(--slate)]">
                                            <MapPin
                                                className="mt-0.5 size-4 shrink-0"
                                                aria-hidden="true"
                                            />
                                            {applicant.location}
                                        </li>
                                    )}
                                    {applicant.pathway && (
                                        <li>
                                            <PathwayBadge
                                                pathway={applicant.pathway}
                                            />
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                        {(application.can_reject ||
                            application.can_proceed) && (
                            <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row lg:justify-end">
                                {application.can_reject && (
                                    <Button
                                        variant="secondary"
                                        className="text-destructive hover:border-destructive"
                                        onClick={() => setRejectOpen(true)}
                                        disabled={processing}
                                        data-testid={`button-reject-application-${application.id}`}
                                    >
                                        Not selected
                                    </Button>
                                )}
                                {application.can_proceed && (
                                    <Button
                                        onClick={proceed}
                                        loading={processing}
                                        data-testid={`button-proceed-application-${application.id}`}
                                    >
                                        Proceed
                                        {nextStage ? ` to ${nextStage}` : ''}
                                        <ArrowRight aria-hidden="true" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-[var(--line)] px-5 py-4 sm:px-6">
                        <StageProgress application={application} />
                    </div>

                    <dl className="grid gap-5 border-t border-[var(--line)] bg-[var(--surface-soft)]/60 px-5 py-4 sm:grid-cols-3 sm:px-6">
                        <KeyFact
                            icon={Banknote}
                            label="Expected monthly salary"
                            value={
                                application.expected_monthly_salary !== null
                                    ? [
                                          job.salary_currency,
                                          Number(
                                              application.expected_monthly_salary,
                                          ).toLocaleString('en-US', {
                                              maximumFractionDigits: 2,
                                          }),
                                      ]
                                          .filter(Boolean)
                                          .join(' ')
                                    : 'Not specified'
                            }
                            hint={`Job offer: ${job.salary}`}
                        />
                        <KeyFact
                            icon={Clock}
                            label="Availability"
                            value={
                                application.availability
                                    ? AVAILABILITY_LABELS[
                                          application.availability
                                      ]
                                    : 'Not specified'
                            }
                        />
                        <KeyFact
                            icon={CalendarDays}
                            label="Date applied"
                            value={appliedDate}
                            hint={`In pipeline: ${appliedAgo}`}
                        />
                    </dl>
                </section>

                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="flex min-w-0 flex-col gap-5 wrap-anywhere">
                        <nav
                            aria-label="Application sections"
                            className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80"
                        >
                            {sectionLinks.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3.5 py-1.5 text-sm font-medium text-[var(--navy)] transition-colors hover:border-[var(--navy)]/40 hover:bg-[var(--surface-soft)] ${focusRing}`}
                                >
                                    {link.label}
                                    {link.count && (
                                        <span className="rounded-full bg-[var(--surface-soft)] px-1.5 text-xs text-[var(--slate)]">
                                            {link.count}
                                        </span>
                                    )}
                                </a>
                            ))}
                        </nav>

                        <DetailSection
                            id="application-documents"
                            title="Resume & documents"
                            description="The selected resume and other files available at submission."
                            action={
                                <CountChip>
                                    {application.documents.length}{' '}
                                    {application.documents.length === 1
                                        ? 'file'
                                        : 'files'}
                                </CountChip>
                            }
                        >
                            {resume ? (
                                <ApplicationDocument
                                    document={resume}
                                    submittedResume
                                />
                            ) : (
                                <p className="rounded-lg border border-dashed border-[var(--line)] px-4 py-3 text-sm text-[var(--slate)]">
                                    {application.resume_document_id !== null
                                        ? 'The submitted resume is unavailable.'
                                        : 'No resume was selected for this application.'}
                                </p>
                            )}
                            {supportingDocuments.length > 0 && (
                                <div className="flex flex-col gap-3">
                                    <h3 className={sectionLabel}>
                                        Supporting documents
                                    </h3>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {supportingDocuments.map((document) => (
                                            <ApplicationDocument
                                                key={document.id}
                                                document={document}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </DetailSection>

                        <DetailSection
                            id="application-screening"
                            title="Screening answers"
                            description="Review the candidate’s responses to this job’s questions."
                            action={
                                <CountChip>
                                    {answered} of {application.questions.length}{' '}
                                    answered
                                </CountChip>
                            }
                        >
                            {application.questions.length ? (
                                <ol className="flex flex-col gap-5">
                                    {application.questions.map(
                                        (question, index) => {
                                            const answer =
                                                question.answer?.trim();

                                            return (
                                                <li
                                                    key={question.id}
                                                    className="flex gap-3 border-t border-[var(--line)] pt-5 first:border-t-0 first:pt-0"
                                                >
                                                    <span
                                                        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)] text-xs font-semibold text-[var(--navy)]"
                                                        aria-hidden="true"
                                                    >
                                                        {index + 1}
                                                    </span>
                                                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                                                        <div className="flex flex-col gap-0.5">
                                                            <h3
                                                                className={
                                                                    sectionLabel
                                                                }
                                                            >
                                                                {question.label}
                                                            </h3>
                                                            <p
                                                                className={
                                                                    mutedText
                                                                }
                                                            >
                                                                {
                                                                    getQuestionAnswerType(
                                                                        question.type,
                                                                    ).label
                                                                }
                                                                {question.required
                                                                    ? ' · Required'
                                                                    : ' · Optional'}
                                                            </p>
                                                        </div>
                                                        {!answer ? (
                                                            <p className="rounded-lg border border-dashed border-[var(--line)] px-4 py-2.5 text-sm text-[var(--slate)] italic">
                                                                No answer
                                                                provided
                                                            </p>
                                                        ) : question.type ===
                                                          'yesno' ? (
                                                            <div>
                                                                <ListingTag tone="teal">
                                                                    {
                                                                        question.answer
                                                                    }
                                                                </ListingTag>
                                                            </div>
                                                        ) : (
                                                            <p
                                                                className={`${bodyText} rounded-lg bg-[var(--surface-soft)] px-4 py-3`}
                                                            >
                                                                {
                                                                    question.answer
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        },
                                    )}
                                </ol>
                            ) : (
                                <p className="text-sm text-[var(--slate)]">
                                    This job post has no screening questions.
                                </p>
                            )}
                        </DetailSection>

                        <DetailSection
                            id="application-letter"
                            title="Cover letter"
                        >
                            {hasCoverLetter ? (
                                <blockquote
                                    className={`${bodyText} border-l-4 border-[var(--teal)] bg-[var(--surface-soft)]/60 py-3 pr-4 pl-5`}
                                >
                                    {application.cover_letter}
                                </blockquote>
                            ) : (
                                <p className="text-sm text-[var(--slate)]">
                                    No cover letter was provided.
                                </p>
                            )}
                        </DetailSection>
                    </div>

                    <aside
                        aria-label="Job context and application history"
                        tabIndex={0}
                        className={`flex min-w-0 flex-col gap-5 wrap-anywhere xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:overflow-y-auto ${focusRing}`}
                    >
                        <DetailSection
                            id="application-job"
                            title="Job applied for"
                        >
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-base font-semibold text-[var(--navy-deep)]">
                                        {job.title}
                                    </h3>
                                    {job.is_urgent && (
                                        <div className="pt-1">
                                            <ListingTag tone="danger">
                                                Urgent recruitment
                                            </ListingTag>
                                        </div>
                                    )}
                                </div>
                                <ul className="flex flex-col gap-2 text-sm text-[var(--navy)]">
                                    {job.employer && (
                                        <li className="flex items-start gap-2">
                                            <Building2
                                                className="mt-0.5 size-4 shrink-0 text-[var(--slate)]"
                                                aria-hidden="true"
                                            />
                                            {job.employer}
                                        </li>
                                    )}
                                    <li className="flex items-start gap-2 font-medium">
                                        <Banknote
                                            className="mt-0.5 size-4 shrink-0 text-[var(--slate)]"
                                            aria-hidden="true"
                                        />
                                        {job.salary}
                                    </li>
                                    {job.location && (
                                        <li className="flex items-start gap-2">
                                            <MapPin
                                                className="mt-0.5 size-4 shrink-0 text-[var(--slate)]"
                                                aria-hidden="true"
                                            />
                                            {job.location}
                                        </li>
                                    )}
                                </ul>
                            </div>
                            <details className="group -mx-5 -mb-5 border-t border-[var(--line)] sm:-mx-6 sm:-mb-6">
                                <summary
                                    className={`flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--surface-soft)]/60 sm:px-6 [&::-webkit-details-marker]:hidden ${focusRing}`}
                                >
                                    Full job details
                                    <ChevronDown
                                        className="size-4 shrink-0 transition-transform group-open:rotate-180"
                                        aria-hidden="true"
                                    />
                                </summary>
                                <div className="flex flex-col gap-5 px-5 pt-2 pb-5 sm:px-6 sm:pb-6">
                                    <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-1">
                                        {jobFacts
                                            .filter(
                                                (fact) =>
                                                    fact.value !== null &&
                                                    fact.value !== undefined &&
                                                    fact.value !== '',
                                            )
                                            .map((fact) => (
                                                <div
                                                    key={fact.label}
                                                    className="flex flex-col gap-0.5"
                                                >
                                                    <dt className={mutedText}>
                                                        {fact.label}
                                                    </dt>
                                                    <dd className="text-sm font-medium text-[var(--navy)]">
                                                        {fact.value}
                                                    </dd>
                                                </div>
                                            ))}
                                    </dl>
                                    {job.languages.length > 0 && (
                                        <div className="flex flex-col gap-2">
                                            <h3 className={sectionLabel}>
                                                Languages
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {job.languages.map(
                                                    (language) => (
                                                        <ListingTag
                                                            key={`${language.language}-${language.proficiency}`}
                                                            tone="neutral"
                                                        >
                                                            {language.language}{' '}
                                                            ·{' '}
                                                            {
                                                                language.proficiency
                                                            }
                                                        </ListingTag>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {job.required_documents.length > 0 && (
                                        <div className="flex flex-col gap-2">
                                            <h3 className={sectionLabel}>
                                                Required documents
                                            </h3>
                                            <ul className="list-disc space-y-1 pl-4 text-sm text-[var(--navy)]">
                                                {job.required_documents.map(
                                                    (document, index) => (
                                                        <li
                                                            key={`${document}-${index}`}
                                                        >
                                                            {document}
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                    {[
                                        {
                                            title: 'Job description',
                                            text: job.job_description,
                                        },
                                        {
                                            title: 'Other requirements',
                                            text: job.other_requirements,
                                        },
                                        {
                                            title: 'Application instructions',
                                            text: job.application_instructions,
                                        },
                                    ]
                                        .filter((entry) => entry.text?.trim())
                                        .map((entry) => (
                                            <div
                                                key={entry.title}
                                                className="flex flex-col gap-2"
                                            >
                                                <h3 className={sectionLabel}>
                                                    {entry.title}
                                                </h3>
                                                <p className={bodyText}>
                                                    {entry.text}
                                                </p>
                                            </div>
                                        ))}
                                    {(job.contact_person_name ||
                                        job.contact_email ||
                                        job.contact_phone) && (
                                        <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-4">
                                            <h3 className={sectionLabel}>
                                                Job contact
                                            </h3>
                                            {job.contact_person_name && (
                                                <p className="text-sm text-[var(--navy)]">
                                                    {job.contact_person_name}
                                                </p>
                                            )}
                                            {job.contact_email && (
                                                <a
                                                    href={`mailto:${job.contact_email}`}
                                                    className={`self-start text-sm text-[var(--navy)] ${textLink}`}
                                                >
                                                    {job.contact_email}
                                                </a>
                                            )}
                                            {job.contact_phone && (
                                                <a
                                                    href={`tel:${job.contact_phone.replaceAll(' ', '')}`}
                                                    className={`self-start text-sm text-[var(--navy)] ${textLink}`}
                                                >
                                                    {job.contact_phone}
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </details>
                        </DetailSection>

                        <DetailSection
                            id="application-history"
                            title="Stage history"
                            description="Recorded changes to this application, newest first."
                        >
                            {application.history.length ? (
                                <ol className="relative flex flex-col gap-5 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-[var(--line)]">
                                    {[...application.history]
                                        .reverse()
                                        .map((entry, index) => (
                                            <li
                                                key={entry.id}
                                                className="relative flex flex-col gap-1.5 pl-6"
                                            >
                                                <span
                                                    className={`absolute top-1.5 left-0 size-[11px] rounded-full ring-4 ring-white ${
                                                        index === 0
                                                            ? entry.stage ===
                                                              'not_selected'
                                                                ? 'bg-[var(--danger)]'
                                                                : 'bg-[var(--teal)]'
                                                            : 'bg-[var(--neutral-dot)]'
                                                    }`}
                                                    aria-hidden="true"
                                                />
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {entry.from_stage && (
                                                        <>
                                                            <span
                                                                className={
                                                                    mutedText
                                                                }
                                                            >
                                                                {
                                                                    APPLICATION_STAGE_LABELS[
                                                                        entry
                                                                            .from_stage
                                                                    ]
                                                                }
                                                            </span>
                                                            <ArrowRight
                                                                className="size-3 text-[var(--slate)]"
                                                                aria-hidden="true"
                                                            />
                                                        </>
                                                    )}
                                                    <StageBadge
                                                        stage={
                                                            APPLICATION_STAGE_LABELS[
                                                                entry.stage
                                                            ]
                                                        }
                                                    />
                                                </div>
                                                {(entry.changed_at ||
                                                    entry.changed_by) && (
                                                    <p className={mutedText}>
                                                        {entry.changed_at && (
                                                            <time
                                                                dateTime={
                                                                    entry.changed_at
                                                                }
                                                            >
                                                                {formatDate(
                                                                    entry.changed_at,
                                                                )}
                                                            </time>
                                                        )}
                                                        {entry.changed_at &&
                                                            entry.changed_by &&
                                                            ' · '}
                                                        {entry.changed_by &&
                                                            `Changed by ${entry.changed_by}`}
                                                    </p>
                                                )}
                                                {entry.note && (
                                                    <p className="rounded-md bg-[var(--surface-soft)] px-3 py-2 text-sm leading-relaxed whitespace-pre-line text-[var(--navy)]">
                                                        {entry.note}
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                </ol>
                            ) : (
                                <p className="text-sm text-[var(--slate)]">
                                    No stage changes recorded yet.
                                </p>
                            )}
                        </DetailSection>
                    </aside>
                </div>
            </DashboardPage>
            <RejectApplicationDialog
                applicationId={application.id}
                applicantName={applicant.name}
                open={rejectOpen}
                busy={processing}
                onOpenChange={setRejectOpen}
                onConfirm={(note) => {
                    reject(note);
                    setRejectOpen(false);
                }}
            />
        </>
    );
}

DashboardApplicationShow.layout = {
    breadcrumbs: [
        { title: 'Applications', href: applications() },
        { title: 'Application details', href: '#' },
    ],
};
