import { Head, Link, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import {
    Archive,
    BadgeCheck,
    BriefcaseBusiness,
    ClipboardList,
    CircleX,
    MoreHorizontal,
    Pencil,
    Plus,
    RotateCcw,
    SearchX,
    Users,
} from 'lucide-react';
import {
    JobPostStatusBadge,
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
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useServerTable } from '@/hooks/use-server-table';
import { formatJobPostSalary } from '@/lib/job-post-salary';
import { jobs } from '@/routes/dashboard';
import {
    create as jobsCreate,
    edit,
    status,
    archive,
} from '@/routes/dashboard/jobs';
import type { PostingType } from '@/types/job';
import type {
    JobPostDisplayStatus,
    JobPostIndexFilters,
    JobPostKpis,
    JobPostRow,
} from '@/types/job-post';
import type { Paginated } from '@/types/pagination';

const DEFAULT_FILTERS: JobPostIndexFilters = {
    q: null,
    status: null,
    recruitment_type: null,
    sort: 'newest',
    per_page: 10,
};
const TABLE_PROPS = ['jobPosts', 'filters'];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'expiring', label: 'Expiring soon' },
    { value: 'applicants', label: 'Most applicants' },
    { value: 'salary', label: 'Salary: high to low' },
];

const RECRUITMENT_TYPE_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'joborder', label: 'Job order' },
    { value: 'manpooling', label: 'Manpooling' },
];

const STATUS_OPTIONS = [
    { value: 'all', label: 'All status' },
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'closed', label: 'Closed' },
    { value: 'archived', label: 'Archived' },
];

const RECRUITMENT_TYPE_LABELS: Record<PostingType, string> = {
    joborder: 'Job order',
    manpooling: 'Manpooling',
};

const ACCENT_BY_STATUS: Record<
    JobPostDisplayStatus,
    'amber' | 'red' | 'neutral'
> = {
    active: 'amber',
    closed: 'red',
    expired: 'neutral',
    archived: 'neutral',
};
const postedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const jobPostColumns: Column<JobPostRow>[] = [
    {
        key: 'position',
        header: 'Position',
        width: '22%',
        cell: (post) => (
            <span
                className="block max-w-[20rem] truncate font-bold text-[var(--navy-deep)]"
                title={`${post.job_title} — ${post.work_location}`}
            >
                {post.job_title}
            </span>
        ),
    },
    {
        key: 'posted',
        header: 'Posted',
        width: '11%',
        className: 'whitespace-nowrap text-[var(--slate)]',
        cell: (post) => postedDate.format(new Date(post.created_at)),
    },
    {
        key: 'salary',
        header: 'Salary',
        width: '21%',
        cell: (post) => {
            const { amount, period } = formatJobPostSalary(post);

            return (
                <span className="block whitespace-nowrap" title={amount}>
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
        cell: (post) => (
            <PostingTypeBadge
                postingType={post.recruitment_type}
                labels={RECRUITMENT_TYPE_LABELS}
            />
        ),
    },
    {
        key: 'status',
        header: 'Status',
        width: '12%',
        cell: (post) => <JobPostStatusBadge status={post.display_status} />,
    },
    {
        key: 'applicants',
        header: 'Endorsed / Vacancies',
        width: '11%',
        align: 'right',
        cell: (post) => (
            <span
                className="inline-flex items-center gap-1.5 font-bold text-[var(--navy-deep)] tabular-nums"
                aria-label={`${post.hired_count} endorsed / ${post.vacant_positions} vacancies`}
                title={`${post.hired_count} endorsed / ${post.vacant_positions} vacancies`}
            >
                {`${post.hired_count}/${post.vacant_positions}`}
                <Users
                    className="size-4 text-[var(--slate)]"
                    aria-hidden="true"
                />
            </span>
        ),
    },
];

function JobPostRowMenu({ post }: { post: JobPostRow }) {
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);
    const isClosed = post.display_status === 'closed';
    const isArchived = post.display_status === 'archived';

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        ref={trigger}
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${post.job_title}`}
                        data-testid={`button-job-actions-${post.id}`}
                    >
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link href={edit(post.id)}>
                            <Pencil className="size-4" aria-hidden="true" />
                            Update
                        </Link>
                    </DropdownMenuItem>
                    {!isArchived && (
                        <DropdownMenuItem
                            onSelect={() =>
                                router.patch(
                                    status(post.id).url,
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                            data-testid={`button-toggle-status-${post.id}`}
                        >
                            {isClosed ? (
                                <RotateCcw
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ) : (
                                <CircleX
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            )}
                            {isClosed ? 'Open' : 'Close'}
                        </DropdownMenuItem>
                    )}
                    {!isArchived && (
                        <DropdownMenuItem
                            onSelect={() => setArchiveOpen(true)}
                            data-testid={`button-archive-job-${post.id}`}
                        >
                            <Archive className="size-4" aria-hidden="true" />
                            Archive
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
                <DialogContent
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        trigger.current?.focus();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>Archive job post?</DialogTitle>
                        <DialogDescription>
                            Archive “{post.job_title}”? It will no longer accept
                            applications or allow changes. Existing applications
                            will be kept.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() => setArchiveOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            loading={archiving}
                            onClick={() => {
                                if (archiving) return;
                                router.patch(
                                    archive(post.id).url,
                                    {},
                                    {
                                        preserveScroll: true,
                                        onStart: () => setArchiving(true),
                                        onSuccess: () => setArchiveOpen(false),
                                        onFinish: () => setArchiving(false),
                                    },
                                );
                            }}
                        >
                            Archive
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default function DashboardJobs({
    jobPosts,
    filters,
    kpis,
    canManageJobs,
}: {
    jobPosts: Paginated<JobPostRow>;
    filters: JobPostIndexFilters;
    kpis?: JobPostKpis;
    canManageJobs: boolean;
}) {
    const { errors } = usePage().props;
    const table = useServerTable({
        url: jobs().url,
        filters,
        page: jobPosts.meta.current_page,
        defaults: DEFAULT_FILTERS,
        only: TABLE_PROPS,
    });
    const isFiltered = Boolean(
        filters.q || filters.status || filters.recruitment_type,
    );

    return (
        <>
            <Head title="Jobs" />
            <DashboardPage className="md:px-8">
                <PageHeader
                    title="Jobs"
                    subtitle="Track every job post and the applicants it attracts."
                    action={
                        canManageJobs
                            ? {
                                  label: 'Post a job',
                                  icon: Plus,
                                  href: jobsCreate().url,
                                  testId: 'button-post-job',
                              }
                            : undefined
                    }
                />
                <KpiGrid>
                    <KpiCard
                        label="Active Jobs"
                        value={kpis?.active_jobs ?? 0}
                        loading={!kpis}
                        caption="Currently active job posts"
                        icon={BriefcaseBusiness}
                        tone="blue"
                    />
                    <KpiCard
                        label="Total Applicants"
                        value={kpis?.total_applicants ?? 0}
                        loading={!kpis}
                        caption="Across all job posts"
                        icon={Users}
                        tone="violet"
                    />
                    <KpiCard
                        label="With Job Order"
                        value={kpis?.with_job_order ?? 0}
                        loading={!kpis}
                        caption="Non-archived job order posts"
                        icon={ClipboardList}
                        tone="orange"
                    />
                    <KpiCard
                        label="Endorsed"
                        value={kpis?.successful_placements ?? 0}
                        loading={!kpis}
                        caption="Applications at the endorsed stage"
                        icon={BadgeCheck}
                        tone="emerald"
                    />
                </KpiGrid>
                <DataTable<JobPostRow>
                    columns={jobPostColumns}
                    data={jobPosts.data}
                    loading={table.loading}
                    getRowId={(post) => String(post.id)}
                    getRowTestId={(post) => `row-job-${post.id}`}
                    getRowAccent={(post) =>
                        ACCENT_BY_STATUS[post.display_status]
                    }
                    renderRowActions={
                        canManageJobs
                            ? (post) => <JobPostRowMenu post={post} />
                            : undefined
                    }
                    toolbar={
                        <DataTableToolbar data-testid="jobs-table-toolbar">
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
                                    placeholder="Search job posts by title, keyword..."
                                    className="w-full"
                                    data-testid="input-search-jobs"
                                />
                                <InputError message={errors.q} />
                            </DataTableField>
                            <DataTableField
                                label="Sort by"
                                htmlFor="filter-sort"
                            >
                                <DataTableSelect
                                    id="filter-sort"
                                    value={table.values.sort}
                                    onValueChange={(value) =>
                                        table.setFilter('sort', value)
                                    }
                                    options={SORT_OPTIONS}
                                    ariaLabel="Sort job posts by"
                                    data-testid="select-job-sort"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Recruitment type"
                                htmlFor="filter-recruitment-type"
                            >
                                <DataTableSelect<PostingType | 'all'>
                                    id="filter-recruitment-type"
                                    value={
                                        table.values.recruitment_type ?? 'all'
                                    }
                                    onValueChange={(value) =>
                                        table.setFilter(
                                            'recruitment_type',
                                            value === 'all' ? null : value,
                                        )
                                    }
                                    options={RECRUITMENT_TYPE_OPTIONS}
                                    ariaLabel="Filter by recruitment type"
                                    data-testid="select-job-posting-type"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Status"
                                htmlFor="filter-status"
                            >
                                <DataTableSelect<JobPostDisplayStatus | 'all'>
                                    id="filter-status"
                                    value={table.values.status ?? 'all'}
                                    onValueChange={(value) =>
                                        table.setFilter(
                                            'status',
                                            value === 'all' ? null : value,
                                        )
                                    }
                                    options={STATUS_OPTIONS}
                                    ariaLabel="Filter by status"
                                    data-testid="select-job-status-filter"
                                />
                            </DataTableField>
                            <DataTableRefreshButton
                                onClick={table.reset}
                                spinning={table.loading}
                                data-testid="button-refresh-jobs"
                            />
                        </DataTableToolbar>
                    }
                    pagination={{
                        page: table.page,
                        totalPages: jobPosts.meta.last_page,
                        onPageChange: table.setPage,
                        alwaysShow: true,
                        label: 'Jobs pagination',
                        testIdPrefix: 'jobs-pagination',
                    }}
                    emptyState={
                        <DashboardEmptyState
                            icon={isFiltered ? SearchX : BriefcaseBusiness}
                            title={
                                isFiltered
                                    ? 'No job posts match your filters'
                                    : 'No job posts yet'
                            }
                            message={
                                isFiltered
                                    ? 'Try a different keyword, recruitment type or status.'
                                    : 'No job posts are available right now.'
                            }
                            onReset={isFiltered ? table.reset : undefined}
                        />
                    }
                    data-testid="table-jobs"
                />
            </DashboardPage>
        </>
    );
}

DashboardJobs.layout = {
    breadcrumbs: [{ title: 'Jobs', href: jobs() }],
};
