import { Head } from '@inertiajs/react';
import {
    BadgeCheck,
    BriefcaseBusiness,
    ClipboardList,
    MoreHorizontal,
    Plus,
    SearchX,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    ListingStatusBadge,
    PostingTypeBadge,
} from '@/components/dashboard/badges';
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
import { getAgencyPathway } from '@/data/agency-context';
import {
    formatSalary,
    getEffectiveStatus,
    STATUS_LABELS,
    type EffectiveStatus,
} from '@/data/job-attributes';
import { archiveJob, closeJob, getJobList, reopenJob } from '@/data/job-store';
import {
    getJobPage,
    getJobsDashboardKpis,
    JOBS_PER_PAGE,
    type JobRow,
    type JobSortField,
    type SortDirection,
} from '@/data/selectors';
import { jobs } from '@/routes/dashboard';
import { create as jobsCreate } from '@/routes/dashboard/jobs';
import type { Job, PostingType } from '@/types/job';

type PostingTypeFilter = PostingType | 'all';
type StatusFilter = EffectiveStatus | 'all';
type SortOption = 'newest' | 'oldest' | 'expiring' | 'applicants' | 'salary';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'expiring', label: 'Expiring soon' },
    { value: 'applicants', label: 'Most applicants' },
    { value: 'salary', label: 'Salary: high to low' },
];

const POSTING_TYPE_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'joborder', label: 'Job order' },
    { value: 'manpooling', label: 'Manpooling' },
];

const STATUS_OPTIONS = [
    { value: 'all', label: 'All status' },
    { value: 'published', label: STATUS_LABELS.published },
    { value: 'expired', label: STATUS_LABELS.expired },
    { value: 'closed', label: STATUS_LABELS.closed },
    { value: 'archived', label: STATUS_LABELS.archived },
];

const POSTING_TYPE_LABELS: Record<PostingType, string> = {
    joborder: 'Job order',
    manpooling: 'Manpooling',
};

/** Accent bar colour per effective status: published amber, closed red. */
const ACCENT_BY_STATUS: Record<EffectiveStatus, 'amber' | 'red' | 'neutral'> = {
    published: 'amber',
    closed: 'red',
    expired: 'neutral',
    archived: 'neutral',
};

/** The Sort by select drives ordering, so column headers stay static. */
function sortQuery(option: SortOption): {
    sort: JobSortField;
    sortDirection: SortDirection;
} {
    switch (option) {
        case 'oldest':
            return { sort: 'posted', sortDirection: 'desc' };
        case 'expiring':
            return { sort: 'closingDate', sortDirection: 'asc' };
        case 'applicants':
            return { sort: 'applicants', sortDirection: 'desc' };
        case 'salary':
            return { sort: 'salary', sortDirection: 'desc' };
        case 'newest':
        default:
            return { sort: 'posted', sortDirection: 'asc' };
    }
}

const jobColumns: Column<JobRow>[] = [
    {
        key: 'position',
        header: 'Position',
        width: '22%',
        cell: (row) => (
            <span
                className="block max-w-[20rem] truncate font-bold text-[var(--navy-deep)]"
                title={row.job.title}
            >
                {row.job.title}
            </span>
        ),
    },
    {
        key: 'posted',
        header: 'Posted',
        width: '11%',
        className: 'whitespace-nowrap text-[var(--slate)]',
        cell: (row) => row.job.posted,
    },
    {
        key: 'salary',
        header: 'Salary',
        width: '21%',
        cell: (row) => {
            const { amount, period } = formatSalary(row.job.salary);

            return (
                <span
                    className="block whitespace-nowrap"
                    title={row.job.salary}
                >
                    <span className="font-semibold text-[var(--navy-deep)]">
                        {amount}
                    </span>
                    {period && (
                        <span className="ml-1 text-xs text-[var(--slate)]">
                            / {period}
                        </span>
                    )}
                </span>
            );
        },
    },
    {
        key: 'type',
        header: 'Type',
        width: '11%',
        cell: (row) => (
            <PostingTypeBadge
                postingType={row.job.postingType}
                labels={POSTING_TYPE_LABELS}
            />
        ),
    },
    {
        key: 'status',
        header: 'Status',
        width: '12%',
        cell: (row) => (
            <ListingStatusBadge status={getEffectiveStatus(row.job)} />
        ),
    },
    {
        key: 'applicants',
        header: 'Applicants',
        width: '11%',
        align: 'right',
        cell: (row) => (
            <span className="inline-flex items-center gap-1.5 font-bold text-[var(--navy-deep)] tabular-nums">
                {row.applicants}
                <Users
                    className="size-4 text-[var(--slate)]"
                    aria-hidden="true"
                />
            </span>
        ),
    },
];

function JobRowMenu({
    job,
    onToggle,
    onArchive,
}: {
    job: Job;
    onToggle: (id: string, title: string) => void;
    onArchive: (id: string, title: string) => void;
}) {
    const status = getEffectiveStatus(job);
    const isClosed = status === 'closed';
    const isArchived = status === 'archived';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Actions for ${job.title}`}
                    data-testid={`button-job-actions-${job.id}`}
                >
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                    Edit listing
                    <span className="ml-auto text-xs text-muted-foreground">
                        Soon
                    </span>
                </DropdownMenuItem>
                {!isArchived && (
                    <DropdownMenuItem
                        onSelect={() => onToggle(job.id, job.title)}
                        data-testid={`button-toggle-status-${job.id}`}
                    >
                        {isClosed ? 'Reopen listing' : 'Close listing'}
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem
                    onSelect={() => onArchive(job.id, job.title)}
                    data-testid={`button-archive-job-${job.id}`}
                >
                    {isArchived ? 'Unarchive listing' : 'Archive listing'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function DashboardJobs() {
    const [keyword, setKeyword] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('newest');
    const [postingType, setPostingType] = useState<PostingTypeFilter>('all');
    const [status, setStatus] = useState<StatusFilter>('all');
    const [page, setPage] = useState(1);
    const [refreshing, setRefreshing] = useState(false);
    // The listing store is module level, so the page keeps its own copy
    // and refreshes it after a mutation to re-read the list.
    const [listings, setListings] = useState(() => getJobList());

    useEffect(() => {
        setPage(1);
    }, [keyword, sortOption, postingType, status]);

    const resetFilters = () => {
        setKeyword('');
        setSortOption('newest');
        setPostingType('all');
        setStatus('all');
    };

    const handleRefresh = () => {
        resetFilters();
        setRefreshing(true);
        window.setTimeout(() => setRefreshing(false), 600);
    };

    // The only status the agency sets by hand is closing early, for
    // example once the role is filled. Everything else follows from the
    // closing date.
    const toggleListing = (id: string, title: string) => {
        const job = getJobList().find((item) => item.id === id);
        const isClosed = job ? getEffectiveStatus(job) === 'closed' : false;

        if (isClosed) {
            reopenJob(id);
            toast.success(`${title} is open for applications again.`);
        } else {
            closeJob(id);
            toast.success(`${title} closed. Applicants can no longer apply.`);
        }

        setListings(getJobList());
    };

    const archiveListing = (id: string, title: string) => {
        const job = getJobList().find((item) => item.id === id);
        const isArchived = job ? getEffectiveStatus(job) === 'archived' : false;

        archiveJob(id, !isArchived);
        toast.success(
            isArchived
                ? `${title} is back on the jobs list.`
                : `${title} archived. Find it under the Archived status.`,
        );
        setListings(getJobList());
    };

    const isFiltered =
        keyword.trim() !== '' || postingType !== 'all' || status !== 'all';

    const { sort, sortDirection } = sortQuery(sortOption);
    const results = getJobPage(
        {
            q: keyword,
            pathway: getAgencyPathway(),
            postingType,
            status,
            sort,
            sortDirection,
            page,
            perPage: JOBS_PER_PAGE,
        },
        listings,
    );
    const kpis = getJobsDashboardKpis();

    return (
        <>
            <Head title="Jobs" />

            <DashboardPage className="md:px-8">
                <PageHeader
                    title="Jobs"
                    subtitle="Track every listing and the applicants it attracts."
                    action={{
                        label: 'Post a job',
                        icon: Plus,
                        href: jobsCreate().url,
                        testId: 'button-post-job',
                    }}
                />

                <KpiGrid>
                    <KpiCard
                        label="Active Jobs"
                        value={kpis.activeJobs}
                        caption="Currently published listings"
                        icon={BriefcaseBusiness}
                        tone="blue"
                    />
                    <KpiCard
                        label="Total Applicants"
                        value={kpis.totalApplicants}
                        caption="Across all job listings"
                        icon={Users}
                        tone="violet"
                    />
                    <KpiCard
                        label="With Job Order"
                        value={kpis.withJobOrder}
                        caption="Listings with job orders"
                        icon={ClipboardList}
                        tone="orange"
                    />
                    <KpiCard
                        label="Successful Placements"
                        value={kpis.successfulPlacements}
                        caption="Applicants placed with employers"
                        icon={BadgeCheck}
                        tone="emerald"
                    />
                </KpiGrid>

                <DataTable<JobRow>
                    columns={jobColumns}
                    data={results.items}
                    getRowId={(row) => row.job.id}
                    getRowTestId={(row) => `row-job-${row.job.id}`}
                    getRowAccent={(row) =>
                        ACCENT_BY_STATUS[getEffectiveStatus(row.job)]
                    }
                    renderRowActions={(row) => (
                        <JobRowMenu
                            job={row.job}
                            onToggle={toggleListing}
                            onArchive={archiveListing}
                        />
                    )}
                    toolbar={
                        <DataTableToolbar data-testid="jobs-table-toolbar">
                            <DataTableField
                                label="Search"
                                htmlFor="filter-search"
                                className="basis-full sm:min-w-64 sm:flex-1 sm:basis-auto"
                            >
                                <DataTableSearch
                                    id="filter-search"
                                    value={keyword}
                                    onChange={setKeyword}
                                    placeholder="Search jobs by title, keyword..."
                                    className="w-full"
                                    data-testid="input-search-jobs"
                                />
                            </DataTableField>

                            <DataTableField
                                label="Sort by"
                                htmlFor="filter-sort"
                            >
                                <DataTableSelect
                                    id="filter-sort"
                                    value={sortOption}
                                    onValueChange={setSortOption}
                                    options={SORT_OPTIONS}
                                    ariaLabel="Sort jobs by"
                                    data-testid="select-job-sort"
                                />
                            </DataTableField>

                            <DataTableField
                                label="Recruitment type"
                                htmlFor="filter-posting-type"
                            >
                                <DataTableSelect
                                    id="filter-posting-type"
                                    value={postingType}
                                    onValueChange={setPostingType}
                                    options={POSTING_TYPE_OPTIONS}
                                    ariaLabel="Filter by recruitment type"
                                    data-testid="select-job-posting-type"
                                />
                            </DataTableField>

                            <DataTableField
                                label="Status"
                                htmlFor="filter-status"
                            >
                                <DataTableSelect
                                    id="filter-status"
                                    value={status}
                                    onValueChange={setStatus}
                                    options={STATUS_OPTIONS}
                                    ariaLabel="Filter by status"
                                    data-testid="select-job-status-filter"
                                />
                            </DataTableField>

                            <DataTableRefreshButton
                                onClick={handleRefresh}
                                spinning={refreshing}
                                data-testid="button-refresh-jobs"
                            />
                        </DataTableToolbar>
                    }
                    pagination={{
                        page: results.page,
                        totalPages: results.totalPages,
                        onPageChange: setPage,
                        alwaysShow: true,
                        label: 'Jobs pagination',
                        testIdPrefix: 'jobs-pagination',
                    }}
                    emptyState={
                        <DashboardEmptyState
                            icon={isFiltered ? SearchX : BriefcaseBusiness}
                            title={
                                isFiltered
                                    ? 'No listings match your filters'
                                    : 'No listings found'
                            }
                            message={
                                isFiltered
                                    ? 'Try a different keyword, recruitment type or status.'
                                    : 'No job listings are available right now.'
                            }
                            onReset={isFiltered ? resetFilters : undefined}
                        />
                    }
                    data-testid="table-jobs"
                />
            </DashboardPage>
        </>
    );
}

DashboardJobs.layout = {
    breadcrumbs: [
        {
            title: 'Jobs',
            href: jobs(),
        },
    ],
};
