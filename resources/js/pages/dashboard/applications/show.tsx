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
import { toast } from 'sonner';
import { PathwayBadge, StageBadge } from '@/components/dashboard/badges';
import { FormSection } from '@/components/dashboard/form-section';
import { ListingFactGrid } from '@/components/dashboard/listing-fact-grid';
import { ListingTag } from '@/components/dashboard/listing-tag';
import { DashboardPage } from '@/components/dashboard/page';
import { PageHeader } from '@/components/dashboard/page-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { getApplicationDetail } from '@/data/application-details';
import { CONTRACT_LABELS, EDUCATION_LABELS } from '@/data/job-attributes';
import { getQuestionAnswerType } from '@/data/job-questions';
import { getApplicationRow } from '@/data/selectors';
import { elapsedSince } from '@/lib/application-utils';
import { applications } from '@/routes/dashboard';
import { SKILL_LEVEL_DOTS } from '@/types/applicant-profile';
import type { ApplicationStage } from '@/types/application';

const STAGE_OPTIONS: ApplicationStage[] = [
    'Pending',
    'Under review',
    'Shortlisted',
    'Interviewed',
    'Hired',
];

const dateFormat = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});
const sectionLabel = 'text-sm font-semibold text-[var(--navy)]';
const softBlock =
    'rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-sm leading-relaxed whitespace-pre-line text-[var(--navy)]';

export default function DashboardApplicationShow({
    applicationId,
}: {
    applicationId: string;
}) {
    const row = getApplicationRow(Number(applicationId));
    const [stage, setStage] = useState<ApplicationStage>(
        row?.application.stage ?? 'Pending',
    );

    setLayoutProps({
        breadcrumbs: [
            { title: 'Applications', href: applications() },
            {
                title: row?.applicant.name ?? 'Application not found',
                href: '#',
            },
        ],
    });

    if (!row) {
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

    const { application, applicant, job } = row;
    const detail = getApplicationDetail(application, applicant, job);
    const questions = job.questions ?? [];
    const answered = questions.filter((question) => {
        const answer = detail.answers[question.id];
        return Array.isArray(answer)
            ? answer.length > 0
            : Boolean(answer?.trim());
    }).length;
    const appliedDate = dateFormat.format(
        new Date(`${application.appliedAt}T12:00:00`),
    );
    const history = STAGE_OPTIONS.slice(0, STAGE_OPTIONS.indexOf(stage) + 1);
    const experienceRequired =
        job.minExperienceYears !== undefined &&
        job.maxExperienceYears !== undefined
            ? `${job.minExperienceYears}–${job.maxExperienceYears} years`
            : job.minExperienceYears !== undefined
              ? `${job.minExperienceYears}+ years`
              : job.maxExperienceYears !== undefined
                ? `Up to ${job.maxExperienceYears} years`
                : undefined;

    const changeStage = (nextStage: ApplicationStage) => {
        setStage(nextStage);
        toast.success(
            `${applicant.name}'s stage is now ${nextStage.toLowerCase()}.`,
        );
    };

    return (
        <>
            <Head title={`${applicant.name} · Application`} />
            <DashboardPage className="md:px-8">
                <PageHeader
                    title={applicant.name}
                    subtitle={`Applied for ${job.title} · ${job.employer}`}
                    action={{
                        label: 'Back to applications',
                        icon: ArrowLeft,
                        href: applications().url,
                        testId: 'button-back-to-applications',
                    }}
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
                                    {answered} of {questions.length} answered
                                </span>
                            }
                        >
                            {questions.length ? (
                                questions.map((question) => {
                                    const value = detail.answers[question.id];
                                    const answer = Array.isArray(value)
                                        ? value.join(', ')
                                        : value;

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
                                        value: detail.expectedSalary,
                                        icon: Banknote,
                                    },
                                    {
                                        label: 'Availability',
                                        value: detail.availability,
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
                                {detail.coverLetter.trim() ? (
                                    <div className={softBlock}>
                                        {detail.coverLetter}
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
                            <h3 className={sectionLabel}>Submitted resume</h3>
                            {detail.documents.map((document, index) => (
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
                                                {document.size} · Uploaded{' '}
                                                {document.uploadedAt}
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
                                        {(['Preview', 'Download'] as const).map(
                                            (action) => (
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
                                                        detail.resumeId
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
                                            ),
                                        )}
                                    </div>
                                </div>
                            ))}
                        </FormSection>
                        <FormSection
                            step={4}
                            title="Candidate profile"
                            description="Professional background, qualifications and skills."
                            icon={UserRound}
                        >
                            {detail.summary && (
                                <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--navy)]">
                                    {detail.summary}
                                </p>
                            )}
                            {detail.experiences.length > 0 && (
                                <section
                                    className="flex flex-col gap-3"
                                    aria-label="Work experience"
                                >
                                    <h3 className={sectionLabel}>
                                        Work experience
                                    </h3>
                                    {detail.experiences.map((experience) => (
                                        <div
                                            key={experience.id}
                                            className="flex flex-col gap-1 border-t border-[var(--line)] pt-3"
                                        >
                                            <p className={sectionLabel}>
                                                {experience.role} ·{' '}
                                                {experience.company}
                                            </p>
                                            <p className="text-xs text-[var(--slate)]">
                                                {experience.start} –{' '}
                                                {experience.end || 'Present'} ·{' '}
                                                {experience.location}
                                            </p>
                                            <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-[var(--navy)]">
                                                {experience.description}
                                            </p>
                                        </div>
                                    ))}
                                </section>
                            )}
                            {detail.education.length > 0 && (
                                <section
                                    className="flex flex-col gap-3"
                                    aria-label="Education"
                                >
                                    <h3 className={sectionLabel}>Education</h3>
                                    {detail.education.map((education) => (
                                        <div
                                            key={education.id}
                                            className="flex flex-col gap-1 border-t border-[var(--line)] pt-3"
                                        >
                                            <p className={sectionLabel}>
                                                {education.degree} ·{' '}
                                                {education.field}
                                            </p>
                                            <p className="text-sm text-[var(--navy)]">
                                                {education.school}
                                            </p>
                                            <p className="text-xs text-[var(--slate)]">
                                                {education.start} –{' '}
                                                {education.end || 'Present'}
                                            </p>
                                        </div>
                                    ))}
                                </section>
                            )}
                            {detail.certifications.length > 0 && (
                                <section
                                    className="flex flex-col gap-3"
                                    aria-label="Certifications"
                                >
                                    <h3 className={sectionLabel}>
                                        Certifications
                                    </h3>
                                    {detail.certifications.map(
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
                                                    Issued{' '}
                                                    {dateFormat.format(
                                                        new Date(
                                                            `${certification.issueDate}T12:00:00`,
                                                        ),
                                                    )}
                                                    {certification.expiryDate &&
                                                        ` · Expires ${dateFormat.format(new Date(`${certification.expiryDate}T12:00:00`))}`}
                                                </p>
                                            </div>
                                        ),
                                    )}
                                </section>
                            )}
                            {detail.skills.length > 0 && (
                                <section
                                    className="flex flex-col gap-3"
                                    aria-label="Skills"
                                >
                                    <h3 className={sectionLabel}>Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {detail.skills.map((skill) => (
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
                                        value: [job.category, job.subCategory]
                                            .filter(Boolean)
                                            .join(' / '),
                                        icon: Tags,
                                    },
                                    {
                                        label: 'Recruitment type',
                                        value: job.postingType
                                            ? job.postingType === 'joborder'
                                                ? 'Job order'
                                                : 'Manpooling'
                                            : undefined,
                                        icon: BriefcaseBusiness,
                                    },
                                    {
                                        label: 'Contract duration',
                                        value: job.contractDuration
                                            ? CONTRACT_LABELS[
                                                  job.contractDuration
                                              ]
                                            : undefined,
                                        icon: CalendarDays,
                                    },
                                    {
                                        label: 'Vacancies',
                                        value: job.quantity,
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
                                        value: experienceRequired,
                                        icon: Award,
                                    },
                                    {
                                        label: 'Closing date',
                                        value: job.closingDate
                                            ? dateFormat.format(
                                                  new Date(
                                                      `${job.closingDate}T12:00:00`,
                                                  ),
                                              )
                                            : undefined,
                                        icon: CalendarDays,
                                    },
                                    {
                                        label: 'Posted',
                                        value: job.posted,
                                        icon: Clock3,
                                    },
                                ]}
                            />
                            {Boolean(job.benefits?.length) && (
                                <div className="flex flex-col gap-3">
                                    <h3 className={sectionLabel}>Benefits</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {job.benefits?.map((benefit) => (
                                            <ListingTag
                                                key={benefit}
                                                tone="teal"
                                            >
                                                {benefit}
                                            </ListingTag>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {Boolean(job.languages?.length) && (
                                <div className="flex flex-col gap-3">
                                    <h3 className={sectionLabel}>Languages</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {job.languages?.map((language) => (
                                            <ListingTag
                                                key={language.language}
                                                tone="neutral"
                                            >
                                                {language.language} ·{' '}
                                                {language.proficiency}
                                            </ListingTag>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {job.otherRequirements?.trim() && (
                                <div className="flex flex-col gap-3">
                                    <h3 className={sectionLabel}>
                                        Other requirements
                                    </h3>
                                    <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--navy)]">
                                        {job.otherRequirements}
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
                                        <p className="text-sm text-[var(--slate)]">
                                            {detail.headline}
                                        </p>
                                    </div>
                                </div>
                                <p className="flex items-start gap-2 text-sm text-[var(--slate)]">
                                    <MapPin
                                        className="mt-0.5 size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    {applicant.location}
                                </p>
                                <div>
                                    <PathwayBadge pathway={applicant.pathway} />
                                </div>
                                <a
                                    href={`mailto:${detail.email}`}
                                    className="flex items-start gap-2 text-sm text-[var(--navy)] hover:underline"
                                >
                                    <Mail
                                        className="mt-0.5 size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span className="min-w-0">
                                        {detail.email}
                                    </span>
                                </a>
                                <a
                                    href={`tel:${detail.phone.replaceAll(' ', '')}`}
                                    className="flex items-start gap-2 text-sm text-[var(--navy)] hover:underline"
                                >
                                    <Phone
                                        className="mt-0.5 size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    {detail.phone}
                                </a>
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
                                    <StageBadge stage={stage} />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label
                                        htmlFor="detail-stage"
                                        className="text-xs font-semibold text-[var(--navy)]"
                                    >
                                        Update stage
                                    </Label>
                                    <Select
                                        value={stage}
                                        onValueChange={(value) =>
                                            changeStage(
                                                value as ApplicationStage,
                                            )
                                        }
                                    >
                                        <SelectTrigger
                                            id="detail-stage"
                                            className="h-9 w-full border-[var(--line)] bg-white text-sm text-[var(--navy)]"
                                            aria-label={`Update stage for ${applicant.name}`}
                                            data-testid={`select-detail-stage-${application.id}`}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STAGE_OPTIONS.map((option) => (
                                                <SelectItem
                                                    key={option}
                                                    value={option}
                                                >
                                                    {option}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
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
                                                application.appliedAt,
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
                                    Mock timeline based on the current stage.
                                </p>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ol className="flex flex-col">
                                    {history.map((step, index) => {
                                        const date = new Date(
                                            `${application.appliedAt}T12:00:00`,
                                        );
                                        date.setDate(date.getDate() + index);
                                        return (
                                            <li
                                                key={step}
                                                className="relative ml-1 border-l border-[var(--line)] pb-5 pl-5 last:border-transparent last:pb-0"
                                            >
                                                <span
                                                    className={`absolute top-1 -left-1 size-2 rounded-full ${step === stage ? 'bg-[var(--teal)]' : 'bg-[var(--slate)]'}`}
                                                    aria-hidden="true"
                                                />
                                                <p className="text-sm font-semibold text-[var(--navy)]">
                                                    {step}
                                                </p>
                                                <p className="mt-1 text-xs text-[var(--slate)]">
                                                    {dateFormat.format(date)}
                                                </p>
                                                {index === 0 && (
                                                    <p className="mt-1 text-xs text-[var(--slate)]">
                                                        Application submitted.
                                                    </p>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ol>
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </DashboardPage>
        </>
    );
}

DashboardApplicationShow.layout = {
    breadcrumbs: [
        { title: 'Applications', href: applications() },
        { title: 'Application details', href: '#' },
    ],
};
