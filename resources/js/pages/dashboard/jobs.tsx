import { Head, Link } from '@inertiajs/react';
import { BriefcaseBusiness, Search, SearchX } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    FeaturedBadge,
    PathwayBadge,
    UrgentBadge,
} from '@/components/dashboard/badges';
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
import { getJobList } from '@/data/job-store';
import { getQuestionAnswerType } from '@/data/job-questions';
import { getJobPage, getJobSummary, JOBS_PER_PAGE } from '@/data/selectors';
import { jobs } from '@/routes/dashboard';
import { create as jobsCreate } from '@/routes/dashboard/jobs';
import type { Pathway } from '@/types/agency';
import { DashboardPage } from '@/components/dashboard/page';

type PathwayFilter = Pathway | 'all';

export default function DashboardJobs() {
    const [keyword, setKeyword] = useState('');
    const [pathway, setPathway] = useState<PathwayFilter>('all');
    const [page, setPage] = useState(1);

    useEffect(() => {
        setPage(1);
    }, [keyword, pathway]);

    const results = getJobPage(
        {
            q: keyword,
            pathway,
            page,
            perPage: JOBS_PER_PAGE,
        },
        getJobList(),
    );

    const summary = getJobSummary({ q: keyword, pathway }, getJobList());
    const isFiltered = keyword.trim() !== '' || pathway !== 'all';

    const resetFilters = () => {
        setKeyword('');
        setPathway('all');
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
                    <SummaryStat label="total listings" value={summary.total} />
                    <SummaryStat label="landbased" value={summary.landbased} />
                    <SummaryStat label="seabased" value={summary.seabased} />
                    <SummaryStat
                        label="applicants"
                        value={summary.applicants}
                    />
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
                                    placeholder="Search roles, employers or locations"
                                    aria-label="Search job listings"
                                    className="pl-9"
                                    data-testid="input-search-jobs"
                                />
                            </div>
                            <Select
                                value={pathway}
                                onValueChange={(value) =>
                                    setPathway(value as PathwayFilter)
                                }
                            >
                                <SelectTrigger
                                    className="w-40"
                                    aria-label="Filter by pathway"
                                    data-testid="select-job-pathway"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All pathways
                                    </SelectItem>
                                    <SelectItem value="landbased">
                                        Landbased
                                    </SelectItem>
                                    <SelectItem value="seabased">
                                        Seabased
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="text-sm text-[var(--slate)] tabular-nums">
                                {results.total}{' '}
                                {results.total === 1 ? 'listing' : 'listings'}
                            </span>
                        </div>

                        {results.items.length ? (
                            <Table data-testid="table-jobs">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Position</TableHead>
                                        <TableHead>Agency</TableHead>
                                        <TableHead>Pathway</TableHead>
                                        <TableHead>
                                            Location &amp; salary
                                        </TableHead>
                                        <TableHead>Posted</TableHead>
                                        <TableHead className="text-right">
                                            Applicants
                                        </TableHead>
                                        <TableHead>Flags</TableHead>
                                        <TableHead className="text-right">
                                            Questions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.items.map(
                                        ({ job, applicants }) => (
                                            <TableRow
                                                key={job.id}
                                                data-testid={`row-job-${job.id}`}
                                            >
                                                <TableCell>
                                                    <div className="max-w-64">
                                                        <p
                                                            className="truncate font-semibold text-[var(--navy)]"
                                                            title={job.title}
                                                        >
                                                            {job.title}
                                                        </p>
                                                        <p
                                                            className="truncate text-xs text-[var(--slate)]"
                                                            title={job.employer}
                                                        >
                                                            {job.employer}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span
                                                        className="block max-w-44 truncate text-sm"
                                                        title={job.agency}
                                                    >
                                                        {job.agency}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <PathwayBadge
                                                        pathway={job.pathway}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="max-w-52">
                                                        <p
                                                            className="truncate text-sm"
                                                            title={job.location}
                                                        >
                                                            {job.location}
                                                        </p>
                                                        <p
                                                            className="truncate text-xs text-[var(--slate)]"
                                                            title={job.salary}
                                                        >
                                                            {job.salary}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {job.posted}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {applicants}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {job.featured && (
                                                            <FeaturedBadge />
                                                        )}
                                                        {job.urgent && (
                                                            <UrgentBadge />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    <span
                                                        title={
                                                            job.questions
                                                                ?.length
                                                                ? job.questions
                                                                      .map(
                                                                          (
                                                                              question,
                                                                          ) =>
                                                                              `${question.label} (${getQuestionAnswerType(question.type).label}): ${question.answer || 'No default answer'}`,
                                                                      )
                                                                      .join(
                                                                          '\n',
                                                                      )
                                                                : undefined
                                                        }
                                                    >
                                                        {job.questions
                                                            ?.length ?? 0}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ),
                                    )}
                                </TableBody>
                            </Table>
                        ) : (
                            <DashboardEmptyState
                                icon={isFiltered ? SearchX : BriefcaseBusiness}
                                title="No listings found"
                                message={
                                    isFiltered
                                        ? 'No listings match your search. Try a different title or pathway.'
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
