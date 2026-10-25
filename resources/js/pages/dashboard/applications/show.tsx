import { Head, Link, setLayoutProps } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    ChevronDown,
    Download,
    ExternalLink,
    FileText,
    Mail,
    MapPin,
    Phone,
    UserRound,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
    RejectApplicationDialog,
    useApplicationStageTransition,
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
import { SKILL_LEVEL_DOTS } from '@/types/applicant-profile';
import {
    APPLICATION_STAGE_LABELS,
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
const dateFormat = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});
const sectionLabel = 'text-sm font-semibold text-[var(--navy)]';
const bodyText =
    'text-sm leading-relaxed whitespace-pre-line text-[var(--navy)]';
const textLink =
    'rounded-sm underline decoration-[var(--line)] underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring';

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
            aria-labelledby={id}
            className="min-w-0 rounded-xl border border-[var(--line)] bg-white"
        >
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4 sm:px-6">
                <div className="flex min-w-0 flex-col gap-1">
                    <h2
                        id={id}
                        className="font-serif text-base font-bold text-[var(--navy-deep)]"
                    >
                        {title}
                    </h2>
                    {description && (
                        <p className="text-xs leading-relaxed text-[var(--slate)]">
                            {description}
                        </p>
                    )}
                </div>
                {action}
            </header>
            <div className="flex flex-col gap-5 p-5 sm:p-6">{children}</div>
        </section>
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
        <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-4 first:border-t-0 first:pt-0">
            <div className="flex items-start gap-3">
                <FileText
                    className="mt-1 size-5 shrink-0 text-[var(--slate)]"
                    aria-hidden="true"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className={sectionLabel}>{document.name}</p>
                        {submittedResume && (
                            <ListingTag tone="teal">
                                Submitted resume
                            </ListingTag>
                        )}
                    </div>
                    <p className="text-xs leading-relaxed text-[var(--slate)]">
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
                <div className="flex flex-wrap gap-2 pl-8">
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
                <p className="pl-8 text-xs text-[var(--slate)]">
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
    const nextStage = application.next_stage
        ? APPLICATION_STAGE_LABELS[application.next_stage]
        : null;
    const resume = application.documents.find(
        (document) => document.id === application.resume_document_id,
    );
    const supportingDocuments = application.documents.filter(
        (document) => document.id !== application.resume_document_id,
    );
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
                    <p className="text-xs text-[var(--slate)]">
                        Application #{application.id}
                    </p>
                </div>

                <section
                    aria-label="Candidate overview"
                    className="rounded-xl border border-[var(--line)] bg-white"
                >
                    <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="flex min-w-0 items-start gap-4">
                            <Avatar
                                className="size-14 shrink-0 sm:size-16"
                                aria-hidden="true"
                            >
                                <AvatarFallback className="bg-[var(--navy-deep)] font-serif text-xl font-bold text-white">
                                    {applicant.initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex min-w-0 flex-1 flex-col gap-2">
                                <h1 className="font-serif text-2xl leading-tight font-bold tracking-tight text-[var(--navy-deep)] sm:text-3xl">
                                    {applicant.name}
                                </h1>
                                {applicant.headline && (
                                    <p className="text-sm font-medium text-[var(--slate)]">
                                        {applicant.headline}
                                    </p>
                                )}
                                <p className="text-sm leading-relaxed text-[var(--navy)]">
                                    Applied for{' '}
                                    <span className="font-semibold">
                                        {job.title}
                                    </span>
                                    {job.employer ? ` · ${job.employer}` : ''}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-5 text-[var(--slate)]">
                                    {applicant.location && (
                                        <span className="inline-flex items-start gap-1.5">
                                            <MapPin
                                                className="mt-0.5 size-3.5 shrink-0"
                                                aria-hidden="true"
                                            />
                                            {applicant.location}
                                        </span>
                                    )}
                                    {applicant.pathway && (
                                        <PathwayBadge
                                            pathway={applicant.pathway}
                                        />
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-sm text-[var(--navy)]">
                                    <a
                                        href={`mailto:${applicant.email}`}
                                        className={`inline-flex min-w-0 items-start gap-2 ${textLink}`}
                                    >
                                        <Mail
                                            className="mt-0.5 size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span className="min-w-0">
                                            {applicant.email}
                                        </span>
                                    </a>
                                    {applicant.phone && (
                                        <a
                                            href={`tel:${applicant.phone.replaceAll(' ', '')}`}
                                            className={`inline-flex items-start gap-2 ${textLink}`}
                                        >
                                            <Phone
                                                className="mt-0.5 size-4 shrink-0"
                                                aria-hidden="true"
                                            />
                                            {applicant.phone}
                                        </a>
                                    )}
                                </div>
                                {/* TODO: Implement the candidate detail page and its Wayfinder route before enabling:
                                <Button variant="secondary" size="sm" asChild>
                                    <Link href={candidateShow(applicant.id)}>View candidate</Link>
                                </Button>
                                */}
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5 xl:items-end xl:border-t-0 xl:pt-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-[var(--slate)]">
                                    Application stage
                                </span>
                                <StageBadge
                                    stage={
                                        APPLICATION_STAGE_LABELS[
                                            application.stage
                                        ]
                                    }
                                />
                            </div>
                            <p className="text-xs text-[var(--slate)]">
                                Time in pipeline:{' '}
                                {elapsedSince(
                                    application.submitted_at.slice(0, 10),
                                ).replace(/^Applied /, '')}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                                {application.can_reject && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="text-destructive hover:border-destructive"
                                        onClick={() => setRejectOpen(true)}
                                        disabled={processing}
                                        data-testid={`button-reject-application-${application.id}`}
                                    >
                                        Reject
                                    </Button>
                                )}
                                {application.can_proceed && (
                                    <Button
                                        size="sm"
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
                        </div>
                    </div>
                    <dl className="grid gap-4 border-t border-[var(--line)] bg-[var(--surface-soft)]/50 px-5 py-4 sm:grid-cols-3 sm:px-6">
                        <div className="flex flex-col gap-1">
                            <dt className="text-xs text-[var(--slate)]">
                                Expected monthly salary
                            </dt>
                            <dd className="text-sm font-semibold text-[var(--navy)]">
                                {application.expected_monthly_salary !== null
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
                                    : 'Not specified'}
                            </dd>
                        </div>
                        <div className="flex flex-col gap-1">
                            <dt className="text-xs text-[var(--slate)]">
                                Availability
                            </dt>
                            <dd className="text-sm font-semibold text-[var(--navy)]">
                                {application.availability
                                    ? AVAILABILITY_LABELS[
                                          application.availability
                                      ]
                                    : 'Not specified'}
                            </dd>
                        </div>
                        <div className="flex flex-col gap-1">
                            <dt className="text-xs text-[var(--slate)]">
                                Date applied
                            </dt>
                            <dd className="text-sm font-semibold text-[var(--navy)]">
                                {appliedDate}
                            </dd>
                        </div>
                    </dl>
                </section>

                <nav
                    aria-label="Application sections"
                    className="flex flex-wrap gap-x-5 gap-y-2 border-b border-[var(--line)] px-1 pb-3 text-sm font-medium text-[var(--slate)]"
                >
                    <a href="#application-documents" className={textLink}>
                        Resume &amp; documents
                    </a>
                    <a href="#application-screening" className={textLink}>
                        Screening answers
                    </a>
                    <a href="#application-profile" className={textLink}>
                        Candidate profile
                    </a>
                    <a href="#application-letter" className={textLink}>
                        Cover letter
                    </a>
                </nav>

                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="flex min-w-0 flex-col gap-5 wrap-anywhere [&_h2]:scroll-mt-6">
                        <DetailSection
                            id="application-documents"
                            title="Resume & documents"
                            description="The selected resume and other files available at submission."
                        >
                            {resume ? (
                                <ApplicationDocument
                                    document={resume}
                                    submittedResume
                                />
                            ) : (
                                <p className="text-sm text-[var(--slate)]">
                                    {application.resume_document_id !== null
                                        ? 'The submitted resume is unavailable.'
                                        : 'No resume was selected for this application.'}
                                </p>
                            )}
                            {supportingDocuments.length > 0 && (
                                <div className="flex flex-col gap-4">
                                    <h3 className={sectionLabel}>
                                        Supporting documents
                                    </h3>
                                    {supportingDocuments.map((document) => (
                                        <ApplicationDocument
                                            key={document.id}
                                            document={document}
                                        />
                                    ))}
                                </div>
                            )}
                        </DetailSection>

                        <DetailSection
                            id="application-screening"
                            title="Screening answers"
                            description="Review the candidate’s responses to this job’s questions."
                            action={
                                <span className="rounded-md bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-medium text-[var(--slate)]">
                                    {answered} of {application.questions.length}{' '}
                                    answered
                                </span>
                            }
                        >
                            {application.questions.length ? (
                                application.questions.map((question) => (
                                    <div
                                        key={question.id}
                                        className="flex flex-col gap-2.5 border-t border-[var(--line)] pt-5 first:border-t-0 first:pt-0"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <h3
                                                className={`${sectionLabel} flex-1`}
                                            >
                                                {question.label}
                                            </h3>
                                            {question.required && (
                                                <span className="text-xs text-[var(--slate)]">
                                                    Required
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-[var(--slate)]">
                                            {
                                                getQuestionAnswerType(
                                                    question.type,
                                                ).label
                                            }
                                        </p>
                                        {!question.answer?.trim() ? (
                                            <p className="text-sm text-[var(--slate)]">
                                                No answer provided
                                            </p>
                                        ) : question.type === 'yesno' ? (
                                            <div>
                                                <ListingTag tone="teal">
                                                    {question.answer}
                                                </ListingTag>
                                            </div>
                                        ) : (
                                            <p
                                                className={`${bodyText} rounded-lg bg-[var(--surface-soft)] px-4 py-3`}
                                            >
                                                {question.answer}
                                            </p>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-[var(--slate)]">
                                    This job post has no screening questions.
                                </p>
                            )}
                        </DetailSection>

                        <DetailSection
                            id="application-profile"
                            title="Candidate profile"
                            description="Professional background, qualifications, and skills."
                        >
                            {applicant.summary && (
                                <p className={bodyText}>{applicant.summary}</p>
                            )}
                            {application.skills.length > 0 && (
                                <section
                                    className="flex flex-col gap-3"
                                    aria-label="Skills"
                                >
                                    <h3 className={sectionLabel}>Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {application.skills.map((skill) => (
                                            <ListingTag
                                                key={skill.id}
                                                tone="neutral"
                                            >
                                                <span className="whitespace-normal">
                                                    {skill.name}
                                                </span>
                                                <span
                                                    className="flex gap-0.5"
                                                    role="img"
                                                    aria-label={`${skill.level} proficiency`}
                                                >
                                                    {[1, 2, 3, 4].map((dot) => (
                                                        <span
                                                            key={dot}
                                                            className={`size-1.5 rounded-full ${dot <= SKILL_LEVEL_DOTS[skill.level] ? 'bg-[var(--teal)]' : 'bg-[var(--line)]'}`}
                                                            aria-hidden="true"
                                                        />
                                                    ))}
                                                </span>
                                            </ListingTag>
                                        ))}
                                    </div>
                                </section>
                            )}
                            {application.experiences.length > 0 && (
                                <section
                                    className="flex flex-col gap-4"
                                    aria-label="Work experience"
                                >
                                    <h3 className={sectionLabel}>
                                        Work experience
                                    </h3>
                                    {application.experiences.map(
                                        (experience) => (
                                            <div
                                                key={experience.id}
                                                className="flex flex-col gap-1.5 border-t border-[var(--line)] pt-4"
                                            >
                                                <h4 className={sectionLabel}>
                                                    {experience.role}
                                                </h4>
                                                <p className="text-sm text-[var(--navy)]">
                                                    {experience.company}
                                                </p>
                                                <p className="text-xs leading-relaxed text-[var(--slate)]">
                                                    {[
                                                        formatDate(
                                                            experience.start,
                                                        ),
                                                        formatDate(
                                                            experience.end,
                                                        ) ?? 'Present',
                                                        experience.location,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </p>
                                                {experience.description && (
                                                    <p
                                                        className={`${bodyText} pt-1`}
                                                    >
                                                        {experience.description}
                                                    </p>
                                                )}
                                            </div>
                                        ),
                                    )}
                                </section>
                            )}
                            {application.education.length > 0 && (
                                <section
                                    className="flex flex-col gap-4"
                                    aria-label="Education"
                                >
                                    <h3 className={sectionLabel}>Education</h3>
                                    {application.education.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="flex flex-col gap-1.5 border-t border-[var(--line)] pt-4"
                                        >
                                            <h4 className={sectionLabel}>
                                                {[entry.degree, entry.field]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </h4>
                                            <p className="text-sm text-[var(--navy)]">
                                                {entry.school}
                                            </p>
                                            <p className="text-xs text-[var(--slate)]">
                                                {[
                                                    formatDate(entry.start),
                                                    formatDate(entry.end) ??
                                                        'Present',
                                                ]
                                                    .filter(Boolean)
                                                    .join(' – ')}
                                            </p>
                                        </div>
                                    ))}
                                </section>
                            )}
                            {application.certifications.length > 0 && (
                                <section
                                    className="flex flex-col gap-4"
                                    aria-label="Certifications"
                                >
                                    <h3 className={sectionLabel}>
                                        Certifications
                                    </h3>
                                    {application.certifications.map(
                                        (certification) => (
                                            <div
                                                key={certification.id}
                                                className="flex flex-col gap-1.5 border-t border-[var(--line)] pt-4"
                                            >
                                                <h4 className={sectionLabel}>
                                                    {certification.name}
                                                </h4>
                                                <p className="text-sm text-[var(--navy)]">
                                                    {certification.issuer}
                                                </p>
                                                <p className="text-xs leading-relaxed text-[var(--slate)]">
                                                    {[
                                                        certification.issue_date
                                                            ? `Issued ${formatDate(certification.issue_date)}`
                                                            : null,
                                                        certification.expiry_date
                                                            ? `Expires ${formatDate(certification.expiry_date)}`
                                                            : null,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </p>
                                                {certification.credential_url &&
                                                    /^https?:\/\//i.test(
                                                        certification.credential_url,
                                                    ) && (
                                                        <a
                                                            href={
                                                                certification.credential_url
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`inline-flex items-center gap-1.5 self-start text-xs font-medium text-[var(--navy)] ${textLink}`}
                                                        >
                                                            View credential{' '}
                                                            <ExternalLink
                                                                className="size-3"
                                                                aria-hidden="true"
                                                            />
                                                            <span className="sr-only">
                                                                {' '}
                                                                for{' '}
                                                                {
                                                                    certification.name
                                                                }
                                                            </span>
                                                        </a>
                                                    )}
                                            </div>
                                        ),
                                    )}
                                </section>
                            )}
                            {!applicant.summary &&
                                !application.skills.length &&
                                !application.experiences.length &&
                                !application.education.length &&
                                !application.certifications.length && (
                                    <p className="text-sm text-[var(--slate)]">
                                        No professional background has been
                                        added yet.
                                    </p>
                                )}
                        </DetailSection>

                        <DetailSection
                            id="application-letter"
                            title="Cover letter"
                        >
                            <p
                                className={
                                    application.cover_letter?.trim()
                                        ? bodyText
                                        : 'text-sm text-[var(--slate)]'
                                }
                            >
                                {application.cover_letter?.trim()
                                    ? application.cover_letter
                                    : 'No cover letter was provided.'}
                            </p>
                        </DetailSection>
                    </div>

                    <aside
                        aria-label="Job context and application history"
                        tabIndex={0}
                        className="flex min-w-0 flex-col gap-5 wrap-anywhere focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:overflow-y-auto"
                    >
                        <DetailSection
                            id="application-job"
                            title="Job applied for"
                        >
                            <div className="flex flex-col gap-2">
                                <h3 className="text-base font-semibold text-[var(--navy-deep)]">
                                    {job.title}
                                </h3>
                                {job.employer && (
                                    <p className="text-sm text-[var(--slate)]">
                                        {job.employer}
                                    </p>
                                )}
                                <p className="text-sm font-medium text-[var(--navy)]">
                                    {job.salary}
                                </p>
                                {job.location && (
                                    <p className="flex items-start gap-2 text-sm text-[var(--slate)]">
                                        <MapPin
                                            className="mt-0.5 size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                        {job.location}
                                    </p>
                                )}
                                {job.is_urgent && (
                                    <div>
                                        <ListingTag tone="neutral">
                                            Urgent recruitment
                                        </ListingTag>
                                    </div>
                                )}
                            </div>
                            <details className="group border-t border-[var(--line)] pt-4">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm text-sm font-semibold text-[var(--navy)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                                    Full job details{' '}
                                    <ChevronDown
                                        className="size-4 shrink-0 group-open:rotate-180"
                                        aria-hidden="true"
                                    />
                                </summary>
                                <div className="flex flex-col gap-5 pt-5">
                                    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
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
                                                    className="flex flex-col gap-1"
                                                >
                                                    <dt className="text-xs text-[var(--slate)]">
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
                            description="Recorded changes to this application."
                        >
                            {application.history.length ? (
                                <ol className="flex flex-col gap-5">
                                    {[...application.history]
                                        .reverse()
                                        .map((entry) => (
                                            <li
                                                key={entry.id}
                                                className="flex flex-col gap-2 border-b border-[var(--line)] pb-5 last:border-b-0 last:pb-0"
                                            >
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {entry.from_stage && (
                                                        <>
                                                            <span className="text-xs text-[var(--slate)]">
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
                                                {entry.changed_at && (
                                                    <time
                                                        dateTime={
                                                            entry.changed_at
                                                        }
                                                        className="text-xs text-[var(--slate)]"
                                                    >
                                                        {formatDate(
                                                            entry.changed_at,
                                                        )}
                                                    </time>
                                                )}
                                                {entry.changed_by && (
                                                    <p className="text-xs text-[var(--slate)]">
                                                        Changed by{' '}
                                                        {entry.changed_by}
                                                    </p>
                                                )}
                                                {entry.note && (
                                                    <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--navy)]">
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
