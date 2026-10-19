import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    BriefcaseBusiness,
    Clock3,
    MapPin,
    UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    AvailabilityBadge,
    PathwayBadge,
    StageBadge,
} from '@/components/dashboard/badges';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import { DashboardPage } from '@/components/dashboard/page';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { getQuestionAnswerType } from '@/data/job-questions';
import { elapsedSince } from '@/lib/application-utils';
import { getApplicationRow } from '@/data/selectors';
import { applications } from '@/routes/dashboard';
import type { ApplicationStage } from '@/types/application';

const STAGE_OPTIONS: ApplicationStage[] = [
    'Pending',
    'Under review',
    'Shortlisted',
    'Interviewed',
    'Hired',
];

function InformationField({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-[var(--slate)]">
                {label}
            </span>
            <span className="text-sm text-[var(--navy)]">{children}</span>
        </div>
    );
}

export default function DashboardApplicationShow({
    applicationId,
}: {
    applicationId: string;
}) {
    const row = getApplicationRow(Number(applicationId));

    if (!row) {
        return (
            <DashboardPage>
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
                            This application no longer exists in the workspace.
                        </p>
                        <Button variant="secondary" asChild>
                            <Link href={applications()}>
                                <ArrowLeft aria-hidden="true" />
                                Back to applications
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </DashboardPage>
        );
    }

    const { application, applicant, job } = row;
    const [stage, setStage] = useState<ApplicationStage>(application.stage);

    const appliedDate = new Date(
        `${application.appliedAt}T12:00:00`,
    ).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    const changeStage = (nextStage: ApplicationStage) => {
        setStage(nextStage);
        toast.success(
            `${applicant.name}'s stage is now ${nextStage.toLowerCase()}.`,
        );
    };

    return (
        <>
            <Head title={`${applicant.name} · Application`} />

            <DashboardPage>
                <DashboardPageHeader
                    title={applicant.name}
                    subtitle={`${job.title} · ${job.employer}`}
                    actions={
                        <Button variant="secondary" asChild>
                            <Link href={applications()}>
                                <ArrowLeft aria-hidden="true" />
                                All applications
                            </Link>
                        </Button>
                    }
                />

                <Card>
                    <CardContent className="flex flex-col gap-4 pt-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-[var(--slate)]">
                                    Current stage
                                </span>
                                <StageBadge stage={stage} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-xs font-medium text-[var(--slate)]">
                                    Update stage
                                </span>
                                <Select
                                    value={stage}
                                    onValueChange={(value) =>
                                        changeStage(value as ApplicationStage)
                                    }
                                >
                                    <SelectTrigger
                                        className="w-40"
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
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <InformationField label="Applied">
                                {appliedDate}
                            </InformationField>
                            <InformationField label="Time in pipeline">
                                {elapsedSince(application.appliedAt).replace(
                                    /^Applied /,
                                    '',
                                )}
                            </InformationField>
                            <InformationField label="Applicant location">
                                {applicant.location}
                            </InformationField>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-2">
                            <div>
                                <CardTitle>Applicant information</CardTitle>
                                <CardDescription>
                                    Profile details from the candidate pool
                                </CardDescription>
                            </div>
                            <UserRound
                                className="size-4 text-muted-foreground"
                                aria-hidden="true"
                            />
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <InformationField label="Full name">
                                {applicant.name}
                            </InformationField>
                            <InformationField label="Initials">
                                {applicant.initials}
                            </InformationField>
                            <InformationField label="Location">
                                <span className="flex items-center gap-1.5">
                                    <MapPin
                                        className="size-3.5 text-[var(--slate)]"
                                        aria-hidden="true"
                                    />
                                    {applicant.location}
                                </span>
                            </InformationField>
                            <InformationField label="Pathway">
                                <PathwayBadge pathway={applicant.pathway} />
                            </InformationField>
                            <InformationField label="Specialty">
                                {applicant.role}
                            </InformationField>
                            <InformationField label="Experience">
                                {applicant.experience}
                            </InformationField>
                            <div className="flex flex-col gap-1.5 sm:col-span-2">
                                <span className="text-xs font-medium text-[var(--slate)]">
                                    Skills
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {applicant.skills.map((skill) => (
                                        <span
                                            key={skill}
                                            className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-0.5 text-xs text-[var(--navy)]"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5 sm:col-span-2">
                                <span className="text-xs font-medium text-[var(--slate)]">
                                    Availability
                                </span>
                                <AvailabilityBadge
                                    availability={applicant.availability}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-2">
                            <div>
                                <CardTitle>Application details</CardTitle>
                                <CardDescription>
                                    Role and submission information
                                </CardDescription>
                            </div>
                            <BriefcaseBusiness
                                className="size-4 text-muted-foreground"
                                aria-hidden="true"
                            />
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <InformationField label="Position">
                                {job.title}
                            </InformationField>
                            <InformationField label="Employer">
                                {job.employer}
                            </InformationField>
                            <InformationField label="Recruitment agency">
                                {job.agency}
                            </InformationField>
                            <InformationField label="Pathway">
                                <PathwayBadge pathway={job.pathway} />
                            </InformationField>
                            <InformationField label="Destination">
                                {job.location}
                            </InformationField>
                            <InformationField label="Salary range">
                                {job.salary}
                            </InformationField>
                            <InformationField label="Posted">
                                {job.posted}
                            </InformationField>
                            <InformationField label="Flags">
                                {job.featured || job.urgent
                                    ? [
                                          job.featured ? 'Featured' : null,
                                          job.urgent ? 'Urgent' : null,
                                      ]
                                          .filter(Boolean)
                                          .join(', ')
                                    : 'None'}
                            </InformationField>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                        <div>
                            <CardTitle>Custom questions</CardTitle>
                            <CardDescription>
                                Questions defined for this listing
                            </CardDescription>
                        </div>
                        <Clock3
                            className="size-4 text-muted-foreground"
                            aria-hidden="true"
                        />
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        {job.questions?.length ? (
                            job.questions.map((question) => (
                                <div
                                    key={question.id}
                                    className="flex flex-col gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <span className="text-sm font-medium text-[var(--navy)]">
                                        {question.label}
                                    </span>
                                    <span className="text-sm text-[var(--slate)]">
                                        <span className="rounded-md border border-[var(--line)] bg-white px-2 py-0.5 text-xs">
                                            {
                                                getQuestionAnswerType(
                                                    question.type,
                                                ).label
                                            }
                                        </span>{' '}
                                        <span className="font-medium text-[var(--navy)]">
                                            {question.answer ||
                                                'No default answer'}
                                        </span>
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="py-4 text-center text-sm text-[var(--slate)]">
                                This listing has no custom questions.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </DashboardPage>
        </>
    );
}

DashboardApplicationShow.layout = {
    breadcrumbs: [
        {
            title: 'Applications',
            href: applications(),
        },
    ],
};
