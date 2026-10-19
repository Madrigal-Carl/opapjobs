import { Head, Link } from '@inertiajs/react';
import {
    FileSearch,
    MoreHorizontal,
    SearchX,
    UserCheck,
    UserPlus,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { StageBadge } from '@/components/dashboard/badges';
import {
    DataTable,
    DataTableField,
    DataTableRefreshButton,
    DataTableSearch,
    DataTableSelect,
    DataTableToolbar,
    type Column,
} from '@/components/dashboard/data-table';
import { DashboardEmptyState } from '@/components/dashboard/empty-state';
import { KpiCard, KpiGrid } from '@/components/dashboard/kpi-card';
import { DashboardPage } from '@/components/dashboard/page';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    APPLICATIONS_PER_PAGE,
    getApplicationDashboardKpis,
    getApplicationPage,
    type ApplicationRow,
} from '@/data/selectors';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { applications } from '@/routes/dashboard';
import { show as showApplication } from '@/routes/dashboard/applications';
import type { ApplicationStage } from '@/types/application';

type ApplicationFilters = {
    q: string;
    sort: 'newest' | 'oldest';
    stage: ApplicationStage | 'All stages';
};

const DEFAULT_FILTERS: ApplicationFilters = {
    q: '',
    sort: 'newest',
    stage: 'All stages',
};

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
];

const STAGE_OPTIONS = [
    { value: 'All stages', label: 'All stages' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Under review', label: 'Under review' },
    { value: 'Shortlisted', label: 'Shortlisted' },
    { value: 'Interviewed', label: 'Interviewed' },
    { value: 'Hired', label: 'Hired' },
];

const appliedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const applicationColumns: Column<ApplicationRow>[] = [
    {
        key: 'applicant',
        header: 'Applicant name',
        width: '28%',
        cell: ({ applicant }) => (
            <span
                className="block max-w-[20rem] truncate font-bold text-[var(--navy-deep)]"
                title={applicant.name}
            >
                {applicant.name}
            </span>
        ),
    },
    {
        key: 'job',
        header: 'Applied for',
        width: '28%',
        cell: ({ job }) => (
            <span
                className="block max-w-[20rem] truncate text-[var(--navy-deep)]"
                title={`${job.title} — ${job.employer}`}
            >
                {job.title}
            </span>
        ),
    },
    {
        key: 'stage',
        header: 'Stage',
        width: '18%',
        cell: ({ application }) => <StageBadge stage={application.stage} />,
    },
    {
        key: 'applied',
        header: 'Applied by',
        width: '20%',
        className: 'whitespace-nowrap text-[var(--slate)]',
        cell: ({ application }) =>
            appliedDate.format(new Date(`${application.appliedAt}T12:00:00`)),
    },
];

function ApplicationRowMenu({ row }: { row: ApplicationRow }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Actions for ${row.applicant.name}`}
                    data-testid={`button-application-actions-${row.application.id}`}
                >
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link
                        href={showApplication(row.application.id)}
                        data-testid={`button-view-application-${row.application.id}`}
                    >
                        View application
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function DashboardApplications() {
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [page, setPage] = useState(1);
    const debouncedQ = useDebouncedValue(filters.q, 300);
    const results = getApplicationPage({
        ...filters,
        q: filters.q.trim() ? debouncedQ : '',
        page,
        perPage: APPLICATIONS_PER_PAGE,
    });
    const kpis = getApplicationDashboardKpis();
    const isFiltered =
        filters.q.trim() !== '' || filters.stage !== 'All stages';

    const setFilter = <K extends keyof ApplicationFilters>(
        key: K,
        value: ApplicationFilters[K],
    ) => {
        setFilters((current) => ({ ...current, [key]: value }));
        setPage(1);
    };

    const resetFilters = () => {
        setFilters(DEFAULT_FILTERS);
        setPage(1);
    };

    return (
        <>
            <Head title="Applications" />
            <DashboardPage className="md:px-8">
                <PageHeader
                    title="Applications"
                    subtitle="Keep promising applicants informed at every step."
                />
                <KpiGrid>
                    <KpiCard
                        label="Total Applicants"
                        value={kpis.totalApplicants}
                        caption="Across all job posts"
                        icon={Users}
                        tone="violet"
                    />
                    <KpiCard
                        label="New Applications Today"
                        value={kpis.newApplicationsToday}
                        caption="Applied today"
                        icon={UserPlus}
                        tone="blue"
                    />
                    <KpiCard
                        label="Under Review"
                        value={kpis.underReview}
                        caption="Currently being reviewed"
                        icon={FileSearch}
                        tone="orange"
                    />
                    <KpiCard
                        label="Shortlisted Applicants"
                        value={kpis.shortlistedApplicants}
                        caption="Moved to the shortlist"
                        icon={UserCheck}
                        tone="emerald"
                    />
                </KpiGrid>
                <DataTable<ApplicationRow>
                    columns={applicationColumns}
                    data={results.items}
                    getRowId={(row) => String(row.application.id)}
                    getRowTestId={(row) =>
                        `row-application-${row.application.id}`
                    }
                    renderRowActions={(row) => <ApplicationRowMenu row={row} />}
                    toolbar={
                        <DataTableToolbar data-testid="applications-table-toolbar">
                            <DataTableField
                                label="Search"
                                htmlFor="filter-search"
                                className="basis-full sm:min-w-64 sm:flex-1 sm:basis-auto"
                            >
                                <DataTableSearch
                                    id="filter-search"
                                    value={filters.q}
                                    onChange={(value) => setFilter('q', value)}
                                    placeholder="Search by applicant name or job title..."
                                    className="w-full"
                                    data-testid="input-search-applications"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Sort by"
                                htmlFor="filter-sort"
                            >
                                <DataTableSelect<ApplicationFilters['sort']>
                                    id="filter-sort"
                                    value={filters.sort}
                                    onValueChange={(value) =>
                                        setFilter('sort', value)
                                    }
                                    options={SORT_OPTIONS}
                                    ariaLabel="Sort applications by"
                                    data-testid="select-application-sort"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Stage"
                                htmlFor="filter-stage"
                            >
                                <DataTableSelect<ApplicationFilters['stage']>
                                    id="filter-stage"
                                    value={filters.stage}
                                    onValueChange={(value) =>
                                        setFilter('stage', value)
                                    }
                                    options={STAGE_OPTIONS}
                                    ariaLabel="Filter application stage"
                                    data-testid="select-application-stage"
                                />
                            </DataTableField>
                            <DataTableRefreshButton
                                onClick={resetFilters}
                                data-testid="button-refresh-applications"
                            />
                        </DataTableToolbar>
                    }
                    pagination={{
                        page: results.page,
                        totalPages: results.totalPages,
                        onPageChange: setPage,
                        alwaysShow: true,
                        label: 'Applications pagination',
                        testIdPrefix: 'applications-pagination',
                    }}
                    emptyState={
                        <DashboardEmptyState
                            icon={isFiltered ? SearchX : Users}
                            title={
                                isFiltered
                                    ? 'No applications match your filters'
                                    : 'No applications yet'
                            }
                            message={
                                isFiltered
                                    ? 'Try a different applicant name, job title or stage.'
                                    : 'Applications will appear here once applicants apply to your job posts.'
                            }
                            onReset={isFiltered ? resetFilters : undefined}
                        />
                    }
                    data-testid="table-applications"
                />
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
