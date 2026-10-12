import { Head, Link } from '@inertiajs/react';
import { Search, SearchX, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { elapsedSince } from '@/lib/application-utils';
import { StageBadge } from '@/components/dashboard/badges';
import { DashboardEmptyState } from '@/components/dashboard/empty-state';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import { SummaryStat } from '@/components/dashboard/summary-stat';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/pagination';
import {
    getApplicationPage,
    getApplicationStageCounts,
    APPLICATIONS_PER_PAGE,
} from '@/data/selectors';
import { applications } from '@/routes/dashboard';
import { show as showApplication } from '@/routes/dashboard/applications';
import type { ApplicationStage } from '@/types/application';
import { DashboardPage } from '@/components/dashboard/page';

const STAGE_OPTIONS: ApplicationStage[] = [
    'Applied',
    'Reviewed',
    'Interview',
    'Hired',
    'Pending',
];

type StageFilter = ApplicationStage | 'All stages';

export default function DashboardApplications() {
    const [keyword, setKeyword] = useState('');
    const [stage, setStage] = useState<StageFilter>('All stages');
    const [page, setPage] = useState(1);
    const [overrides, setOverrides] = useState<
        Record<number, ApplicationStage>
    >({});

    useEffect(() => {
        setPage(1);
    }, [keyword, stage]);

    const results = getApplicationPage({
        q: keyword,
        stage,
        page,
        perPage: APPLICATIONS_PER_PAGE,
    });

    const stageCounts = getApplicationStageCounts();
    const isFiltered = keyword.trim() !== '' || stage !== 'All stages';

    const resetFilters = () => {
        setKeyword('');
        setStage('All stages');
        setPage(1);
    };

    const changeStage = (id: number, nextStage: ApplicationStage) => {
        setOverrides((current) => ({ ...current, [id]: nextStage }));
        toast.success('Application stage updated.');
    };

    return (
        <>
            <Head title="Applications" />

            <DashboardPage>
                <DashboardPageHeader
                    title="Applications"
                    subtitle="Keep promising applicants informed at every step."
                />

                <div className="flex flex-wrap gap-2" aria-label="Stage totals">
                    {STAGE_OPTIONS.map((option) => (
                        <SummaryStat
                            key={option}
                            label={option.toLowerCase()}
                            value={stageCounts[option]}
                        />
                    ))}
                </div>

                <Card>
                    <CardContent className="flex flex-col gap-4 pt-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative min-w-56 flex-1">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    type="search"
                                    value={keyword}
                                    onChange={(event) =>
                                        setKeyword(event.target.value)
                                    }
                                    placeholder="Search an applicant or role"
                                    aria-label="Search applications"
                                    className="pl-9"
                                    data-testid="input-search-applications"
                                />
                            </div>
                            <Select
                                value={stage}
                                onValueChange={(value) =>
                                    setStage(value as StageFilter)
                                }
                            >
                                <SelectTrigger
                                    className="w-40"
                                    aria-label="Filter application stage"
                                    data-testid="select-application-stage"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All stages">
                                        All stages
                                    </SelectItem>
                                    {STAGE_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-sm text-[var(--slate)] tabular-nums">
                                {results.total}{' '}
                                {results.total === 1
                                    ? 'application'
                                    : 'applications'}
                            </span>
                        </div>

                        {results.items.length ? (
                            <Table data-testid="table-applications">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Applicant</TableHead>
                                        <TableHead>Applied for</TableHead>
                                        <TableHead>Stage</TableHead>
                                        <TableHead>
                                            Time since applied
                                        </TableHead>
                                        <TableHead>Update stage</TableHead>
                                        <TableHead className="text-right">
                                            Details
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.items.map(
                                        ({ application, applicant, job }) => {
                                            const currentStage =
                                                overrides[application.id] ??
                                                application.stage;

                                            return (
                                                <TableRow
                                                    key={application.id}
                                                    data-testid={`row-application-${application.id}`}
                                                >
                                                    <TableCell>
                                                        <div className="max-w-52">
                                                            <p
                                                                className="truncate font-semibold text-[var(--navy)]"
                                                                title={
                                                                    applicant.name
                                                                }
                                                            >
                                                                {applicant.name}
                                                            </p>
                                                            <p
                                                                className="truncate text-xs text-[var(--slate)]"
                                                                title={
                                                                    applicant.location
                                                                }
                                                            >
                                                                {
                                                                    applicant.location
                                                                }
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="max-w-52">
                                                            <p
                                                                className="truncate text-sm"
                                                                title={
                                                                    job.title
                                                                }
                                                            >
                                                                {job.title}
                                                            </p>
                                                            <p
                                                                className="truncate text-xs text-[var(--slate)]"
                                                                title={
                                                                    job.employer
                                                                }
                                                            >
                                                                {job.employer}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <StageBadge
                                                            stage={currentStage}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="text-sm font-medium whitespace-nowrap">
                                                            {new Date(
                                                                `${application.appliedAt}T12:00:00`,
                                                            ).toLocaleDateString(
                                                                'en-US',
                                                                {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                },
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-[var(--slate)]">
                                                            {elapsedSince(
                                                                application.appliedAt,
                                                            )}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={currentStage}
                                                            onValueChange={(
                                                                value,
                                                            ) =>
                                                                changeStage(
                                                                    application.id,
                                                                    value as ApplicationStage,
                                                                )
                                                            }
                                                        >
                                                            <SelectTrigger
                                                                className="w-36"
                                                                aria-label={`Update stage for ${applicant.name}`}
                                                                data-testid={`select-stage-${application.id}`}
                                                            >
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {STAGE_OPTIONS.map(
                                                                    (
                                                                        option,
                                                                    ) => (
                                                                        <SelectItem
                                                                            key={
                                                                                option
                                                                            }
                                                                            value={
                                                                                option
                                                                            }
                                                                        >
                                                                            {
                                                                                option
                                                                            }
                                                                        </SelectItem>
                                                                    ),
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            asChild
                                                        >
                                                            <Link
                                                                href={showApplication(
                                                                    application.id,
                                                                )}
                                                                data-testid={`button-view-application-${application.id}`}
                                                            >
                                                                View
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        },
                                    )}
                                </TableBody>
                            </Table>
                        ) : (
                            <DashboardEmptyState
                                icon={isFiltered ? SearchX : Users}
                                title="No applications found"
                                message={
                                    isFiltered
                                        ? 'No applicants here yet. Adjust your search or stage filter.'
                                        : 'Applications will appear here once applicants apply to your jobs.'
                                }
                                onReset={isFiltered ? resetFilters : undefined}
                            />
                        )}

                        <Pagination
                            page={results.page}
                            totalPages={results.totalPages}
                            label="Applications pagination"
                            testIdPrefix="applications-pagination"
                            onPageChange={setPage}
                        />
                    </CardContent>
                </Card>
            </DashboardPage>
        </>
    );
}

DashboardApplications.layout = {
    breadcrumbs: [
        {
            title: 'Applications',
            href: applications(),
        },
    ],
};
