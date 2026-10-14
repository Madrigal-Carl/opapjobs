import { Head, Link } from '@inertiajs/react';
import {
    BriefcaseBusiness,
    FilterX,
    MoreHorizontal,
    Search,
    SearchX,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ClosingSoonBadge,
    FeaturedBadge,
    ListingStatusBadge,
    PostingTypeBadge,
    UrgentBadge,
} from '@/components/dashboard/badges';
import { getEffectiveStatus } from '@/data/job-attributes';
import { DashboardEmptyState } from '@/components/dashboard/empty-state';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import { FilterChip } from '@/components/dashboard/filter-chip';
import { SummaryStat } from '@/components/dashboard/summary-stat';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { SortableHead } from '@/components/dashboard/sortable-head';
import { getAgencyPathway } from '@/data/agency-context';
import { getCategories } from '@/data/job-categories';
import { isClosingSoon, STATUS_LABELS } from '@/data/job-attributes';
import { getJobList, closeJob, reopenJob } from '@/data/job-store';
import {
    getJobPage,
    getJobSummary,
    JOBS_PER_PAGE,
    type JobSortField,
    type SortDirection,
} from '@/data/selectors';
import { jobs } from '@/routes/dashboard';
import { create as jobsCreate } from '@/routes/dashboard/jobs';
import type {
    GenderRequirement,
    ListingStatus,
    PostingType,
} from '@/types/job';
import { DashboardPage } from '@/components/dashboard/page';

type PostingTypeFilter = PostingType | 'all';

const POSTING_TYPE_LABELS: Record<PostingType, string> = {
    joborder: 'With Job Order',
    manpooling: 'Manpooling',
};

const GENDER_LABELS: Record<GenderRequirement, string> = {
    any: 'Any',
    male: 'Male only',
    female: 'Female only',
};

function PostingTypeCell({ postingType }: { postingType: PostingType }) {
    return (
        <span data-testid={`badge-posting-type-${postingType}`}>
            <PostingTypeBadge
                postingType={postingType}
                labels={POSTING_TYPE_LABELS}
            />
        </span>
    );
}

export default function DashboardJobs() {
    const [keyword, setKeyword] = useState('');
    const [postingType, setPostingType] = useState<PostingTypeFilter>('all');
    const [category, setCategory] = useState('all');
    const [employer, setEmployer] = useState('all');
    const [status, setStatus] = useState<ListingStatus | 'all'>('all');
    const [closingSoonOnly, setClosingSoonOnly] = useState(false);
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState<JobSortField | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // The agency posts for a single pathway, so the category list and
    // the listing list both follow the agency rather than a filter.
    const agencyPathway = getAgencyPathway();

    const categoryOptions = useMemo(
        () => getCategories(agencyPathway),
        [agencyPathway],
    );

    const employerOptions = useMemo(() => {
        const seen = new Set<string>();

        return getJobList()
            .map((job) => job.employer)
            .filter((name) => {
                if (seen.has(name)) {
                    return false;
                }

                seen.add(name);
                return true;
            })
            .sort((left, right) => left.localeCompare(right));
    }, []);

    useEffect(() => {
        setPage(1);
    }, [
        keyword,
        postingType,
        category,
        employer,
        status,
        closingSoonOnly,
        sort,
        sortDirection,
    ]);

    // Clicking the active column flips the direction; a new column
    // starts ascending, except the count columns which read best
    // with the largest value first.
    const toggleSort = (field: JobSortField) => {
        const descendingByDefault =
            field === 'applicants' || field === 'quantity';

        if (sort !== field) {
            setSort(field);
            setSortDirection(descendingByDefault ? 'desc' : 'asc');
            return;
        }

        setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    };

    // The category list depends on the pathway, so a category that is
    // no longer offered falls back to "all".
    useEffect(() => {
        if (category !== 'all' && !categoryOptions.includes(category)) {
            setCategory('all');
        }
    }, [category, categoryOptions]);

    const query = {
        q: keyword,
        pathway: agencyPathway,
        postingType,
        category,
        employer,
        status,
        closingSoon: closingSoonOnly || null,
        sort,
        sortDirection,
        page,
        perPage: JOBS_PER_PAGE,
    };

    const results = getJobPage(query, getJobList());
    const summary = getJobSummary(
        {
            q: keyword,
            pathway: agencyPathway,
            postingType,
            category,
            employer,
        },
        getJobList(),
    );

    // The only status the agency sets by hand is closing early, for
    // example once the role is filled. Everything else follows from the
    // closing date.
    const toggleListing = (id: string, title: string) => {
        const job = getJobList().find((item) => item.id === id);
        const isClosed = job ? getEffectiveStatus(job) === 'closed' : false;

        if (isClosed) {
            reopenJob(id);
            toast.success(`${title} is open for applications again.`);
            return;
        }

        closeJob(id);
        toast.success(`${title} closed. Applicants can no longer apply.`);
    };

    // Each active filter becomes a removable chip so the current
    // state is always visible and can be undone one at a time.
    const activeFilters = [
        ...(keyword.trim() !== ''
            ? [
                  {
                      key: 'q',
                      label: 'Search',
                      value: keyword.trim(),
                      clear: () => setKeyword(''),
                  },
              ]
            : []),
        ...(status !== 'all'
            ? [
                  {
                      key: 'status',
                      label: 'Status',
                      value: STATUS_LABELS[status],
                      clear: () => setStatus('all'),
                  },
              ]
            : []),
        ...(closingSoonOnly
            ? [
                  {
                      key: 'closingSoon',
                      label: 'Closing',
                      value: 'Within 7 days',
                      clear: () => setClosingSoonOnly(false),
                  },
              ]
            : []),
        ...(postingType !== 'all'
            ? [
                  {
                      key: 'postingType',
                      label: 'Posting',
                      value: POSTING_TYPE_LABELS[postingType],
                      clear: () => setPostingType('all'),
                  },
              ]
            : []),
        ...(category !== 'all'
            ? [
                  {
                      key: 'category',
                      label: 'Category',
                      value: category,
                      clear: () => setCategory('all'),
                  },
              ]
            : []),
        ...(employer !== 'all'
            ? [
                  {
                      key: 'employer',
                      label: 'Employer',
                      value: employer,
                      clear: () => setEmployer('all'),
                  },
              ]
            : []),
    ];

    const isFiltered = activeFilters.length > 0;

    const resetFilters = () => {
        setKeyword('');
        setPostingType('all');
        setCategory('all');
        setEmployer('all');
        setStatus('all');
        setClosingSoonOnly(false);
        setPage(1);
    };

    return (
        <>
            <Head title="Jobs" />

            <DashboardPage>
                <DashboardPageHeader
                    title="Jobs"
                    subtitle="Track every listing and the applicants it attracts."
                    actions={
                        <Button asChild data-testid="button-post-job">
                            <Link href={jobsCreate()}>Post a job</Link>
                        </Button>
                    }
                />

                <div className="flex flex-wrap gap-2" aria-label="Job totals">
                    <SummaryStat
                        label="total listings"
                        value={summary.total}
                        active={isFiltered}
                    />
                    <SummaryStat
                        label="job order"
                        value={summary.jobOrder}
                        active={postingType === 'joborder'}
                    />
                    <SummaryStat
                        label="manpooling"
                        value={summary.manpooling}
                        active={postingType === 'manpooling'}
                    />
                    <SummaryStat label="vacancies" value={summary.vacancies} />
                    <SummaryStat
                        label="applicants"
                        value={summary.applicants}
                    />
                </div>

                <Card>
                    <CardContent className="flex flex-col gap-4 pt-6">
                        <div className="flex flex-wrap items-end gap-2">
                            <div className="flex w-full flex-col gap-1.5 sm:w-64">
                                <Label
                                    htmlFor="filter-search"
                                    className="text-xs text-[var(--slate)]"
                                >
                                    Search
                                </Label>
                                <div className="relative">
                                    <Search
                                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        id="filter-search"
                                        type="search"
                                        value={keyword}
                                        onChange={(event) =>
                                            setKeyword(event.target.value)
                                        }
                                        placeholder="Title, employer, skill"
                                        aria-label="Search job listings"
                                        className="h-9 pl-9 text-sm"
                                        data-testid="input-search-jobs"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label
                                    htmlFor="filter-posting-type"
                                    className="text-xs text-[var(--slate)]"
                                >
                                    Posting
                                </Label>
                                <Select
                                    value={postingType}
                                    onValueChange={(value) =>
                                        setPostingType(
                                            value as PostingTypeFilter,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="filter-posting-type"
                                        className="h-9 w-36 text-sm"
                                        data-testid="select-job-posting-type"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All types
                                        </SelectItem>
                                        <SelectItem value="joborder">
                                            With Job Order
                                        </SelectItem>
                                        <SelectItem value="manpooling">
                                            Manpooling
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label
                                    htmlFor="filter-category"
                                    className="text-xs text-[var(--slate)]"
                                >
                                    Category
                                </Label>
                                <Select
                                    value={category}
                                    onValueChange={setCategory}
                                    disabled={categoryOptions.length === 0}
                                >
                                    <SelectTrigger
                                        id="filter-category"
                                        className="h-9 w-40 text-sm"
                                        data-testid="select-job-category"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All categories
                                        </SelectItem>
                                        {categoryOptions.map((option) => (
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

                            <div className="flex flex-col gap-1.5">
                                <Label
                                    htmlFor="filter-employer"
                                    className="text-xs text-[var(--slate)]"
                                >
                                    Employer
                                </Label>
                                <Select
                                    value={employer}
                                    onValueChange={setEmployer}
                                >
                                    <SelectTrigger
                                        id="filter-employer"
                                        className="h-9 w-44 text-sm"
                                        data-testid="select-job-employer"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All employers
                                        </SelectItem>
                                        {employerOptions.map((option) => (
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

                            <div className="flex flex-col gap-1.5">
                                <Label
                                    htmlFor="filter-status"
                                    className="text-xs text-[var(--slate)]"
                                >
                                    Status
                                </Label>
                                <Select
                                    value={status}
                                    onValueChange={(value) =>
                                        setStatus(
                                            value as ListingStatus | 'all',
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="filter-status"
                                        className="h-9 w-32 text-sm"
                                        data-testid="select-job-status-filter"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All statuses
                                        </SelectItem>
                                        <SelectItem value="published">
                                            Published
                                        </SelectItem>
                                        <SelectItem value="draft">
                                            Draft
                                        </SelectItem>
                                        <SelectItem value="closed">
                                            Closed
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <label
                                htmlFor="filter-closing-soon"
                                className="flex h-9 cursor-pointer items-center gap-2 self-end rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--navy)]"
                            >
                                <input
                                    id="filter-closing-soon"
                                    type="checkbox"
                                    checked={closingSoonOnly}
                                    onChange={(event) =>
                                        setClosingSoonOnly(event.target.checked)
                                    }
                                    className="size-4 accent-[var(--teal)]"
                                    data-testid="checkbox-closing-soon"
                                />
                                Closing soon
                                <span className="text-[var(--slate)] tabular-nums">
                                    ({summary.closingSoon})
                                </span>
                            </label>
                        </div>

                        {isFiltered && (
                            <div
                                className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3"
                                data-testid="active-job-filters"
                            >
                                <span className="text-xs text-[var(--slate)]">
                                    Filtering by
                                </span>
                                {activeFilters.map((filter) => (
                                    <FilterChip
                                        key={filter.key}
                                        label={filter.label}
                                        value={filter.value}
                                        onRemove={filter.clear}
                                        testId={`chip-filter-${filter.key}`}
                                    />
                                ))}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetFilters}
                                    data-testid="button-clear-job-filters"
                                >
                                    <FilterX aria-hidden="true" />
                                    Clear all
                                </Button>
                            </div>
                        )}

                        {results.items.length ? (
                            <Table data-testid="table-jobs">
                                <TableHeader>
                                    <TableRow>
                                        <SortableHead
                                            field="title"
                                            label="Position"
                                            activeField={sort}
                                            direction={sortDirection}
                                            onSort={toggleSort}
                                        />
                                        <SortableHead
                                            field="employer"
                                            label="Employer"
                                            activeField={sort}
                                            direction={sortDirection}
                                            onSort={toggleSort}
                                        />
                                        <SortableHead
                                            field="postingType"
                                            label="Posting type"
                                            activeField={sort}
                                            direction={sortDirection}
                                            onSort={toggleSort}
                                        />
                                        <SortableHead
                                            field="category"
                                            label="Category"
                                            activeField={sort}
                                            direction={sortDirection}
                                            onSort={toggleSort}
                                        />
                                        <SortableHead
                                            field="quantity"
                                            label="Vacancies"
                                            activeField={sort}
                                            direction={sortDirection}
                                            onSort={toggleSort}
                                            align="right"
                                        />
                                        <SortableHead
                                            field="gender"
                                            label="Gender"
                                            activeField={sort}
                                            direction={sortDirection}
                                            onSort={toggleSort}
                                        />
                                        <SortableHead
                                            field="salary"
                                            label="Salary"
                                            activeField={sort}
                                            direction={sortDirection}
                                            onSort={toggleSort}
                                        />
                                        <SortableHead
                                            field="posted"
                                            label="Posted"
                                            activeField={sort}
                                            direction={sortDirection}
                                            onSort={toggleSort}
                                        />
                                        <SortableHead
                                            field="applicants"
                                            label="Applicants"
                                            activeField={sort}
                                            direction={sortDirection}
                                            onSort={toggleSort}
                                            align="right"
                                        />
                                        <TableHead className="text-right">
                                            <span className="sr-only">
                                                Actions
                                            </span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.items.map(
                                        ({ job, applicants }) => (
                                            <TableRow
                                                key={job.id}
                                                data-testid={`row-job-${job.id}`}
                                                className="group"
                                            >
                                                <TableCell>
                                                    <div className="flex max-w-72 items-start gap-2.5">
                                                        <span
                                                            className={`mt-1 h-8 w-1 shrink-0 rounded-full ${
                                                                job.urgent
                                                                    ? 'bg-destructive'
                                                                    : job.featured
                                                                      ? 'bg-[var(--amber)]'
                                                                      : 'bg-transparent'
                                                            }`}
                                                            aria-hidden="true"
                                                        />
                                                        <div className="min-w-0">
                                                            <p
                                                                className="truncate font-semibold text-[var(--navy)] group-hover:underline"
                                                                title={
                                                                    job.title
                                                                }
                                                            >
                                                                {job.title}
                                                            </p>
                                                            <p
                                                                className="truncate text-xs text-[var(--slate)]"
                                                                title={
                                                                    job.agency
                                                                }
                                                            >
                                                                {job.agency}
                                                            </p>
                                                            <div className="mt-1 flex flex-wrap gap-1">
                                                                <ListingStatusBadge
                                                                    status={getEffectiveStatus(
                                                                        job,
                                                                    )}
                                                                />
                                                                {isClosingSoon(
                                                                    job.closingDate,
                                                                ) && (
                                                                    <ClosingSoonBadge />
                                                                )}
                                                                {job.featured && (
                                                                    <FeaturedBadge />
                                                                )}
                                                                {job.urgent && (
                                                                    <UrgentBadge />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="max-w-48">
                                                        <p
                                                            className="truncate text-sm"
                                                            title={job.employer}
                                                        >
                                                            {job.employer}
                                                        </p>
                                                        {job.postingType ===
                                                            'manpooling' && (
                                                            <p
                                                                className="truncate text-xs text-[var(--slate)]"
                                                                data-testid={`text-employer-hidden-${job.id}`}
                                                            >
                                                                Hidden from
                                                                applicants
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <PostingTypeCell
                                                        postingType={
                                                            job.postingType
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="max-w-48">
                                                        <p
                                                            className="truncate text-sm"
                                                            title={job.category}
                                                        >
                                                            {job.category}
                                                        </p>
                                                        <p
                                                            className="truncate text-xs text-[var(--slate)]"
                                                            title={
                                                                job.subCategory
                                                            }
                                                        >
                                                            {job.subCategory}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {job.quantity}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {GENDER_LABELS[job.gender]}
                                                </TableCell>
                                                <TableCell>
                                                    <span
                                                        className="block max-w-44 truncate text-sm"
                                                        title={job.salary}
                                                    >
                                                        {job.salary}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {job.posted}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {applicants}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                aria-label={`Actions for ${job.title}`}
                                                                data-testid={`button-job-actions-${job.id}`}
                                                            >
                                                                <MoreHorizontal
                                                                    className="size-4"
                                                                    aria-hidden="true"
                                                                />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>
                                                                {getEffectiveStatus(
                                                                    job,
                                                                ) === 'closed'
                                                                    ? 'Reopen'
                                                                    : 'Close listing'}
                                                            </DropdownMenuLabel>
                                                            <DropdownMenuItem
                                                                onSelect={() =>
                                                                    toggleListing(
                                                                        job.id,
                                                                        job.title,
                                                                    )
                                                                }
                                                                data-testid={`button-toggle-status-${job.id}`}
                                                            >
                                                                {getEffectiveStatus(
                                                                    job,
                                                                ) === 'closed'
                                                                    ? 'Reopen listing'
                                                                    : 'Close listing'}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ),
                                    )}
                                </TableBody>
                            </Table>
                        ) : (
                            <DashboardEmptyState
                                icon={isFiltered ? SearchX : BriefcaseBusiness}
                                title={
                                    isFiltered
                                        ? 'No listings match your filters'
                                        : 'No listings found'
                                }
                                message={
                                    isFiltered
                                        ? 'Try a different keyword, pathway, posting type or category.'
                                        : 'No job listings are available right now.'
                                }
                                onReset={isFiltered ? resetFilters : undefined}
                            />
                        )}

                        <Pagination
                            page={results.page}
                            totalPages={results.totalPages}
                            label="Jobs pagination"
                            testIdPrefix="jobs-pagination"
                            onPageChange={setPage}
                            alwaysShow
                        />
                    </CardContent>
                </Card>
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
