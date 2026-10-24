import { Head, Link, setLayoutProps } from '@inertiajs/react';
import {
    ArrowLeft,
    Award,
    Banknote,
    BriefcaseBusiness,
    Building2,
    CalendarDays,
    CircleHelp,
    ClipboardCheck,
    Clock3,
    FileText,
    GraduationCap,
    Mail,
    MapPin,
    Phone,
    Tags,
    UserRound,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import {
    RejectApplicationDialog,
    useApplicationStageTransition,
} from '@/components/dashboard/application-actions';
import { PathwayBadge, StageBadge } from '@/components/dashboard/badges';
import { FormSection } from '@/components/dashboard/form-section';
import { ListingFactGrid } from '@/components/dashboard/listing-fact-grid';
import { ListingTag } from '@/components/dashboard/listing-tag';
import { DashboardPage } from '@/components/dashboard/page';
import { PageHeader } from '@/components/dashboard/page-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CONTRACT_LABELS, EDUCATION_LABELS } from '@/data/job-attributes';
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

const dateFormat = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});
const sectionLabel = 'text-sm font-semibold text-[var(--navy)]';
const softBlock =
    'rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-sm leading-relaxed whitespace-pre-line text-[var(--navy)]';

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
                                    <ArrowLeft aria-hidden="true" />
                                    Back to applications
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

    return (
        <>
            <Head title={`${applicant.name} · Application`} />
            <DashboardPage className="md:px-8">
                <PageHeader
                    title={applicant.name}
                    subtitle={
                        job.employer
                            ? `Applied for ${job.title} · ${job.employer}`
                            : `Applied for ${job.title}`
                    }
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="secondary" asChild>
                                <Link
                                    href={applications()}
                                    data-testid="button-back-to-applications"
                                >
                                    <ArrowLeft aria-hidden="true" />
                                    Back to applications
                                </Link>
                            </Button>
                            {application.can_proceed && (
                                <Button
                                    onClick={proceed}
                                    loading={processing}
                                    data-testid={`button-proceed-application-${application.id}`}
                                >
                                    Proceed
                                    {nextStage ? ` to ${nextStage}` : ''}
                                </Button>
                            )}
                            {application.can_reject && (
                                <Button
                                    variant="destructive"
                                    onClick={() => setRejectOpen(true)}
                                    disabled={processing}
                                    data-testid={`button-reject-application-${application.id}`}
                                >
                                    Reject
                                </Button>
                            )}
                        </div>
                    }
                />
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="flex min-w-0 flex-col gap-5 wrap-anywhere">
                        <FormSection
                            step={1}
                            title="Screening answers"
                            description="Answers to this job's screening questions."
                            icon={CircleHelp}
                            headerAction={
                                <span className="text-xs font-medium text-[var(--slate)]">
                                    {answered} of {application.questions.length}{' '}
                                    answered
                                </span>
                            }
                        >
                            {application.questions.length ? (
                                application.questions.map((question) => {
                                    const answer = question.answer;

                                    return (
                                        <div
                                            key={question.id}
                                            className="flex flex-col gap-3 border-t border-[var(--line)] pt-4 first:border-t-0 first:pt-0"
                                        >
                                            <p className={sectionLabel}>
                                                {question.label}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                <ListingTag tone="neutral">
                                                    {
                                                        getQuestionAnswerType(
                                                            question.type,
                                                        ).label
                                                    }
                                                </ListingTag>
                                                {question.required && (
                                                    <ListingTag tone="neutral">
                                                        Required
                                                    </ListingTag>
                                                )}
                                            </div>
                                            {!answer?.trim() ? (
                                                <p className="text-sm text-[var(--slate)]">
                                                    No answer provided
                                                </p>
                                            ) : question.type === 'yesno' ? (
                                                <div>
                                                    <ListingTag tone="teal">
                                                        {answer}
                                                    </ListingTag>
                                                </div>
                                            ) : question.type ===
                                              'paragraph' ? (
                                                <div className={softBlock}>
                                                    {answer}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-[var(--navy)]">
                                                    {answer}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-[var(--slate)]">
                                    This job post has no screening questions.
                                </p>
                            )}
                        </FormSection>
                        <FormSection
                            step={2}
                            title="Application"
                            description="The candidate's submitted application."
                            icon={ClipboardCheck}
                        >
                            <ListingFactGrid
                                facts={[
                                    {
                                        label: 'Expected monthly salary',
                                        value: application.expected_monthly_salary
                                            ? Number(
                                                  application.expected_monthly_salary,
                                              ).toLocaleString('en-US', {
                                                  maximumFractionDigits: 0,
                                              })
                                            : undefined,
                                        icon: Banknote,
                                    },
                                    {
                                        label: 'Availability',
                                        value: application.availability
                                            ? AVAILABILITY_LABELS[
                                                  application.availability
                                              ]
                                            : undefined,
                                        icon: Clock3,
                                    },
                                    {
                                        label: 'Date applied',
                                        value: appliedDate,
                                        icon: CalendarDays,
                                    },
                                ]}
                            />
                            <div className="flex flex-col gap-3">
                                <h3 className={sectionLabel}>Cover letter</h3>
                                {application.cover_letter?.trim() ? (
                                    <div className={softBlock}>
                                        {application.cover_letter}
                                    </div>
                                ) : (
                                    <p className="text-sm text-[var(--slate)]">
                                        No cover letter
                                    </p>
                                )}
                            </div>
                        </FormSection>
                        <FormSection
                            step={3}
                            title="Resume & documents"
                            description="Files submitted with this application."
                            icon={FileText}
                        >
                            {application.documents.length ? (
                                application.documents.map((document, index) => (
                                    <div
                                        key={document.id}
                                        className="flex flex-col gap-3 border-t border-[var(--line)] pt-4 first-of-type:border-t-0 first-of-type:pt-0"
                                    >
                                        {index === 1 && (
                                            <h3 className={sectionLabel}>
                                                Supporting documents
                                            </h3>
                                        )}
                                        <div className="flex items-start gap-3">
                                            <FileText
                                                className="mt-0.5 size-5 shrink-0 text-[var(--slate)]"
                                                aria-hidden="true"
                                            />
                                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                                <p className={sectionLabel}>
                                                    {document.name}
                                                </p>
                                                <p className="text-xs text-[var(--slate)]">
                                                    {document.size}
                                                    {document.uploaded_at
                                                        ? ` · Uploaded ${formatDate(document.uploaded_at)}`
                                                        : ''}
                                                </p>
                                                {document.primary && (
                                                    <div>
                                                        <ListingTag tone="teal">
                                                            Primary
                                                        </ListingTag>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(
                                                ['Preview', 'Download'] as const
                                            ).map((action) => (
                                                <Button
                                                    key={action}
                                                    variant="secondary"
                                                    size="sm"
                                                    disabled={!document.url}
                                                    asChild={Boolean(
                                                        document.url,
                                                    )}
                                                    data-testid={
                                                        document.id ===
                                                        application.resume_document_id
                                                            ? action ===
                                                              'Preview'
                                                                ? 'button-preview-resume'
                                                                : 'button-download-resume'
                                                            : undefined
                                                    }
                                                >
                                                    {document.url ? (
                                                        <a
                                                            href={document.url}
                                                            target={
                                                                action ===
                                                                'Preview'
                                                                    ? '_blank'
                                                                    : undefined
                                                            }
                                                            rel={
                                                                action ===
                                                                'Preview'
                                                                    ? 'noopener noreferrer'
                                                                    : undefined
                                                            }
                                                            download={
                                                                action ===
                                                                'Download'
                                                                    ? document.name
                                                                    : undefined
                                                            }
                                                        >
                                                            {action}
                                                        </a>
                                                    ) : (
                                                        <>
                                                            {action}
                                                            <span className="text-xs text-muted-foreground">
                                                                Soon
                                                            </span>
                                                        </>
                                                    )}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-[var(--slate)]">
                                    No documents were submitted with this
                                    application.
                                </p>
                            )}
                        </FormSection>
                        <FormSection
                            step={4}
                            title="Candidate profile"
                            description="Professional background, qualifications and skills."
                            icon={UserRound}
                        >
                            {applicant.summary && (
                                <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--navy)]">
                                    {applicant.summary}
                                </p>
                            )}
                            {application.experiences.length > 0 && (
                                <section
                                    className="flex flex-col gap-3"
                                    aria-label="Work experience"
                                >
                                    <h3 className={sectionLabel}>
                                        Work experience
                                    </h3>
                                    {application.experiences.map(
                                        (experience) => (
                                            <div
                                                key={experience.id}
                                                className="flex flex-col gap-1 border-t border-[var(--line)] pt-3"
                                            >
                                                <p className={sectionLabel}>
                                                    {experience.role} ·{' '}
                                                    {experience.company}
                                                </p>
                                                <p className="text-xs text-[var(--slate)]">
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
                                                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-[var(--navy)]">
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
                                    className="flex flex-col gap-3"
                                    aria-label="Education"
                                >
                                    <h3 className={sectionLabel}>Education</h3>
                                    {application.education.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="flex flex-col gap-1 border-t border-[var(--line)] pt-3"
                                        >
                                            <p className={sectionLabel}>
                                                {entry.degree} · {entry.field}
                                            </p>
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
                                    className="flex flex-col gap-3"
                                    aria-label="Certifications"
                                >
                                    <h3 className={sectionLabel}>
                                        Certifications
                                    </h3>
                                    {application.certifications.map(
                                        (certification) => (
                                            <div
                                                key={certification.id}
                                                className="flex flex-col gap-1 border-t border-[var(--line)] pt-3"
                                            >
                                                <p className={sectionLabel}>
                                                    {certification.name}
                                                </p>
                                                <p className="text-sm text-[var(--navy)]">
                                                    {certification.issuer}
                                                </p>
                                                <p className="text-xs text-[var(--slate)]">
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
                                            </div>
                                        ),
                                    )}
                                </section>
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
                        </FormSection>
                        <FormSection
                            step={5}
                            title="Job applied for"
                            description="The job post this candidate applied to."
                            icon={BriefcaseBusiness}
                        >
                            <ListingFactGrid
                                facts={[
                                    {
                                        label: 'Position',
                                        value: job.title,
                                        icon: BriefcaseBusiness,
                                    },
                                    {
                                        label: 'Employer',
                                        value: job.employer,
                                        icon: Building2,
                                    },
                                    {
                                        label: 'Recruitment agency',
                                        value: job.agency,
                                        icon: Building2,
                                    },
                                    {
                                        label: 'Pathway',
                                        value: job.pathway ? (
                                            <PathwayBadge
                                                pathway={job.pathway}
                                            />
                                        ) : undefined,
                                        icon: MapPin,
                                    },
                                    {
                                        label: 'Destination',
                                        value: job.location,
                                        icon: MapPin,
                                    },
                                    {
                                        label: 'Salary',
                                        value: job.salary,
                                        icon: Banknote,
                                    },
                                    {
                                        label: 'Category / Sub-category',
                                        value: [job.category, job.sub_category]
                                            .filter(Boolean)
                                            .join(' / '),
                                        icon: Tags,
                                    },
                                    {
                                        label: 'Recruitment type',
                                        value:
                                            job.posting_type === 'joborder'
                                                ? 'Job order'
                                                : job.posting_type ===
                                                    'manpooling'
                                                  ? 'Manpooling'
                                                  : undefined,
                                        icon: BriefcaseBusiness,
                                    },
                                    {
                                        label: 'Contract duration',
                                        value: job.contract_type
                                            ? CONTRACT_LABELS[job.contract_type]
                                            : undefined,
                                        icon: CalendarDays,
                                    },
                                    {
                                        label: 'Vacancies',
                                        value: job.vacancies,
                                        icon: Users,
                                    },
                                    {
                                        label: 'Education required',
                                        value: job.education
                                            ? EDUCATION_LABELS[job.education]
                                            : undefined,
                                        icon: GraduationCap,
                                    },
                                    {
                                        label: 'Experience required',
                                        value:
                                            experienceRequired(job) ||
                                            undefined,
                                        icon: Award,
                                    },
                                    {
                                        label: 'Closing date',
                                        value: formatDate(job.closing_date),
                                        icon: CalendarDays,
                                    },
                                    {
                                        label: 'Posted',
                                        value: formatDate(job.posted_at),
                                        icon: Clock3,
                                    },
                                ]}
                            />
                            {job.languages.length > 0 && (
                                <div className="flex flex-col gap-3">
                                    <h3 className={sectionLabel}>Languages</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {job.languages.map((language) => (
                                            <ListingTag
                                                key={`${language.language}-${language.proficiency}`}
                                                tone="neutral"
                                            >
                                                {language.language} ·{' '}
                                                {language.proficiency}
                                            </ListingTag>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {job.other_requirements?.trim() && (
                                <div className="flex flex-col gap-3">
                                    <h3 className={sectionLabel}>
                                        Other requirements
                                    </h3>
                                    <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--navy)]">
                                        {job.other_requirements}
                                    </p>
                                </div>
                            )}
                            {job.job_description?.trim() && (
                                <div className="flex flex-col gap-3">
                                    <h3 className={sectionLabel}>
                                        Job description
                                    </h3>
                                    <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--navy)]">
                                        {job.job_description}
                                    </p>
                                </div>
                            )}
                        </FormSection>
                    </div>
                    <aside
                        className="flex min-w-0 flex-col gap-5 self-start wrap-anywhere lg:sticky lg:top-4"
                        aria-label="Candidate and application stage"
                    >
                        <Card className="gap-4 rounded-xl border-[var(--line)] bg-white p-5 shadow-sm">
                            <CardContent className="flex flex-col gap-4 p-0">
                                <div className="flex items-start gap-3">
                                    <Avatar className="size-12 shrink-0">
                                        <AvatarFallback className="bg-[var(--surface-soft)] font-semibold text-[var(--navy)]">
                                            {applicant.initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex min-w-0 flex-col gap-1">
                                        <h2 className="font-semibold text-[var(--navy)]">
                                            {applicant.name}
                                        </h2>
                                        {applicant.headline && (
                                            <p className="text-sm text-[var(--slate)]">
                                                {applicant.headline}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {applicant.location && (
                                    <p className="flex items-start gap-2 text-sm text-[var(--slate)]">
                                        <MapPin
                                            className="mt-0.5 size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                        {applicant.location}
                                    </p>
                                )}
                                {applicant.pathway && (
                                    <div>
                                        <PathwayBadge
                                            pathway={applicant.pathway}
                                        />
                                    </div>
                                )}
                                <a
                                    href={`mailto:${applicant.email}`}
                                    className="flex items-start gap-2 text-sm text-[var(--navy)] hover:underline"
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
                                        className="flex items-start gap-2 text-sm text-[var(--navy)] hover:underline"
                                    >
                                        <Phone
                                            className="mt-0.5 size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                        {applicant.phone}
                                    </a>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="gap-4 rounded-xl border-[var(--line)] bg-white p-5 shadow-sm">
                            <CardHeader className="p-0">
                                <CardTitle className="text-base font-semibold text-[var(--navy)]">
                                    Application stage
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4 p-0">
                                <div>
                                    <StageBadge
                                        stage={
                                            APPLICATION_STAGE_LABELS[
                                                application.stage
                                            ]
                                        }
                                    />
                                </div>
                                {nextStage && application.can_proceed && (
                                    <p className="text-sm text-[var(--slate)]">
                                        Next stage: {nextStage}
                                    </p>
                                )}
                                <dl className="flex flex-col gap-3 border-t border-[var(--line)] pt-4 text-sm">
                                    <div>
                                        <dt className="text-xs text-[var(--slate)]">
                                            Applied date
                                        </dt>
                                        <dd className="mt-1 font-medium text-[var(--navy)]">
                                            {appliedDate}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-[var(--slate)]">
                                            Time in pipeline
                                        </dt>
                                        <dd className="mt-1 font-medium text-[var(--navy)]">
                                            {elapsedSince(
                                                application.submitted_at.slice(
                                                    0,
                                                    10,
                                                ),
                                            ).replace(/^Applied /, '')}
                                        </dd>
                                    </div>
                                </dl>
                            </CardContent>
                        </Card>
                        <Card className="gap-4 rounded-xl border-[var(--line)] bg-white p-5 shadow-sm">
                            <CardHeader className="p-0">
                                <CardTitle className="text-base font-semibold text-[var(--navy)]">
                                    Stage history
                                </CardTitle>
                                <p className="text-xs text-[var(--slate)]">
                                    Every recorded stage change.
                                </p>
                            </CardHeader>
                            <CardContent className="p-0">
                                {application.history.length ? (
                                    <ol className="flex flex-col">
                                        {application.history.map(
                                            (entry, index) => (
                                                <li
                                                    key={entry.id}
                                                    className="relative ml-1 border-l border-[var(--line)] pb-5 pl-5 last:border-transparent last:pb-0"
                                                >
                                                    <span
                                                        className={`absolute top-1 -left-1 size-2 rounded-full ${
                                                            index ===
                                                            application.history
                                                                .length -
                                                                1
                                                                ? 'bg-[var(--teal)]'
                                                                : 'bg-[var(--slate)]'
                                                        }`}
                                                        aria-hidden="true"
                                                    />
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <StageBadge
                                                            stage={
                                                                APPLICATION_STAGE_LABELS[
                                                                    entry.stage
                                                                ]
                                                            }
                                                        />
                                                        {entry.changed_at && (
                                                            <span className="text-xs text-[var(--slate)]">
                                                                {formatDate(
                                                                    entry.changed_at,
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {entry.changed_by && (
                                                        <p className="mt-1 text-xs text-[var(--slate)]">
                                                            Changed by{' '}
                                                            {entry.changed_by}
                                                        </p>
                                                    )}
                                                    {entry.note && (
                                                        <p className="mt-1 text-xs text-[var(--slate)]">
                                                            {entry.note}
                                                        </p>
                                                    )}
                                                </li>
                                            ),
                                        )}
                                    </ol>
                                ) : (
                                    <p className="text-sm text-[var(--slate)]">
                                        No stage changes recorded yet.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
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
