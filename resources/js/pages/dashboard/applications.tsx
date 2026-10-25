import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    CircleX,
    Eye,
    FileSearch,
    MoreHorizontal,
    SearchX,
    UserCheck,
    UserPlus,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import {
    RejectApplicationDialog,
    useApplicationStageTransition,
} from '@/components/dashboard/application-actions';
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
import { useServerTable } from '@/hooks/use-server-table';
import { applications as applicationsRoute } from '@/routes/dashboard';
import { show as showApplication } from '@/routes/dashboard/applications';

import {
    APPLICATION_STAGE_LABELS,
    type ApplicationStageValue,
    type DashboardApplicationFilters,
    type DashboardApplicationKpis,
    type DashboardApplicationRow,
} from '@/types/dashboard-application';
import type { Paginated } from '@/types/pagination';

const DEFAULT_FILTERS: DashboardApplicationFilters = {
    q: null,
    sort: 'newest',
    stage: null,
    per_page: 10,
};
const TABLE_PROPS = ['applications', 'filters'];
const TRANSITION_PROPS = ['applications', 'kpis'];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
];

const STAGE_OPTIONS = [
    { value: 'all', label: 'All stages' },
    { value: 'pending', label: 'Pending' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'shortlisted', label: 'Shortlisted' },
    { value: 'interviewed', label: 'Interviewed' },
    { value: 'hired', label: 'Hired' },
    { value: 'rejected', label: 'Rejected' },
];

const appliedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const applicationColumns: Column<DashboardApplicationRow>[] = [
    {
        key: 'applicant',
        header: 'Applicant name',
        width: '28%',
        cell: ({ applicant_name }) => (
            <span
                className="block max-w-[20rem] truncate font-bold text-[var(--navy-deep)]"
                title={applicant_name}
            >
                {applicant_name}
            </span>
        ),
    },
    {
        key: 'job',
        header: 'Applied for',
        width: '28%',
        cell: ({ job_title, employer_name }) => (
            <span
                className="block max-w-[20rem] truncate text-[var(--navy-deep)]"
                title={
                    employer_name
                        ? `${job_title} — ${employer_name}`
                        : job_title
                }
            >
                {job_title}
            </span>
        ),
    },
    {
        key: 'stage',
        header: 'Stage',
        width: '18%',
        cell: ({ stage }) => (
            <StageBadge stage={APPLICATION_STAGE_LABELS[stage]} />
        ),
    },
    {
        key: 'applied',
        header: 'Applied by',
        width: '20%',
        className: 'whitespace-nowrap text-[var(--slate)]',
        cell: ({ submitted_at }) => appliedDate.format(new Date(submitted_at)),
    },
];

function ApplicationRowMenu({
    row,
    canManage,
}: {
    row: DashboardApplicationRow;
    canManage: boolean;
}) {
    const { processing, proceed, reject } = useApplicationStageTransition(
        TRANSITION_PROPS,
        row.id,
    );
    const [rejectOpen, setRejectOpen] = useState(false);
    const canProceed = canManage && row.can_proceed;
    const canReject = canManage && row.can_reject;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${row.applicant_name}`}
                        data-testid={`button-application-actions-${row.id}`}
                    >
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link
                            href={showApplication(row.id)}
                            data-testid={`button-view-application-${row.id}`}
                        >
                            <Eye className="size-4" aria-hidden="true" />
                            View application
                        </Link>
                    </DropdownMenuItem>
                    {canProceed && (
                        <DropdownMenuItem
                            disabled={processing}
                            onSelect={() => proceed()}
                            data-testid={`button-proceed-application-${row.id}`}
                        >
                            <ArrowRight className="size-4" aria-hidden="true" />
                            Proceed
                            {row.next_stage
                                ? ` to ${APPLICATION_STAGE_LABELS[row.next_stage]}`
                                : ''}
                        </DropdownMenuItem>
                    )}
                    {canReject && (
                        <DropdownMenuItem
                            variant="destructive"
                            disabled={processing}
                            onSelect={() => setRejectOpen(true)}
                            data-testid={`button-reject-application-${row.id}`}
                        >
                            <CircleX className="size-4" aria-hidden="true" />
                            Reject application
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            {canReject && (
                <RejectApplicationDialog
                    applicationId={row.id}
                    applicantName={row.applicant_name}
                    open={rejectOpen}
                    busy={processing}
                    onOpenChange={setRejectOpen}
                    onConfirm={(note) => {
                        reject(note);
                        setRejectOpen(false);
                    }}
                />
            )}
        </>
    );
}

export default function DashboardApplications({
    applications,
    filters,
    kpis,
    canManageApplications = false,
}: {
    applications: Paginated<DashboardApplicationRow>;
    filters: DashboardApplicationFilters;
    kpis?: DashboardApplicationKpis;
    canManageApplications?: boolean;
}) {
    const table = useServerTable({
        url: applicationsRoute().url,
        filters,
        page: applications.meta.current_page,
        defaults: DEFAULT_FILTERS,
        only: TABLE_PROPS,
    });
    const isFiltered = Boolean(filters.q || filters.stage);

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
                        value={kpis?.total_applicants ?? 0}
                        loading={!kpis}
                        caption="Across all job posts"
                        icon={Users}
                        tone="violet"
                    />
                    <KpiCard
                        label="New Applications Today"
                        value={kpis?.new_today ?? 0}
                        loading={!kpis}
                        caption="Applied today"
                        icon={UserPlus}
                        tone="blue"
                    />
                    <KpiCard
                        label="Reviewed"
                        value={kpis?.reviewed ?? 0}
                        loading={!kpis}
                        caption="Applications at the reviewed stage"
                        icon={FileSearch}
                        tone="orange"
                    />
                    <KpiCard
                        label="Shortlisted Applicants"
                        value={kpis?.shortlisted ?? 0}
                        loading={!kpis}
                        caption="Moved to the shortlist"
                        icon={UserCheck}
                        tone="emerald"
                    />
                </KpiGrid>
                <DataTable<DashboardApplicationRow>
                    columns={applicationColumns}
                    data={applications.data}
                    loading={table.loading}
                    getRowId={(row) => String(row.id)}
                    getRowTestId={(row) => `row-application-${row.id}`}
                    renderRowActions={(row) => (
                        <ApplicationRowMenu
                            row={row}
                            canManage={canManageApplications}
                        />
                    )}
                    toolbar={
                        <DataTableToolbar data-testid="applications-table-toolbar">
                            <DataTableField
                                label="Search"
                                htmlFor="filter-search"
                                className="basis-full sm:min-w-64 sm:flex-1 sm:basis-auto"
                            >
                                <DataTableSearch
                                    id="filter-search"
                                    value={table.values.q ?? ''}
                                    onChange={(value) =>
                                        table.setFilter('q', value)
                                    }
                                    placeholder="Search by applicant name or job title..."
                                    className="w-full"
                                    data-testid="input-search-applications"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Sort by"
                                htmlFor="filter-sort"
                            >
                                <DataTableSelect<
                                    DashboardApplicationFilters['sort']
                                >
                                    id="filter-sort"
                                    value={table.values.sort}
                                    onValueChange={(value) =>
                                        table.setFilter('sort', value)
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
                                <DataTableSelect<ApplicationStageValue | 'all'>
                                    id="filter-stage"
                                    value={table.values.stage ?? 'all'}
                                    onValueChange={(value) =>
                                        table.setFilter(
                                            'stage',
                                            value === 'all' ? null : value,
                                        )
                                    }
                                    options={STAGE_OPTIONS}
                                    ariaLabel="Filter application stage"
                                    data-testid="select-application-stage"
                                />
                            </DataTableField>
                            <DataTableRefreshButton
                                onClick={table.reset}
                                spinning={table.loading}
                                data-testid="button-refresh-applications"
                            />
                        </DataTableToolbar>
                    }
                    pagination={{
                        page: table.page,
                        totalPages: applications.meta.last_page,
                        onPageChange: table.setPage,
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
                            onReset={isFiltered ? table.reset : undefined}
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
            href: applicationsRoute(),
        },
    ],
};
