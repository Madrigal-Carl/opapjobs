import { applicants } from '@/data/applicant';
import { applications } from '@/data/applications';
import { agencies } from '@/data/agencies';
import {
    daysUntil,
    getEffectiveStatus,
    isClosingSoon,
    type EffectiveStatus,
} from '@/data/job-attributes';
import { getJobList } from '@/data/job-store';
import { overviewDays } from '@/data/overview';
import type { Agency, Pathway } from '@/types/agency';
import type { Application, ApplicationStage } from '@/types/application';
import type { Applicant, Availability } from '@/types/applicant';
import type { Job, PostingType } from '@/types/job';
import type { OverviewDayPoint } from '@/types/overview';

export const AGENCIES_PER_PAGE = 12;
export const JOBS_PER_PAGE = 10;
export const APPLICATIONS_PER_PAGE = 10;
export const APPLICANTS_PER_PAGE = 10;

export function getAgencies(): Agency[] {
    return agencies;
}

export function getAgencyBySlug(slug: string): Agency | undefined {
    return agencies.find((agency) => agency.slug === slug);
}

export function getJobsByAgency(agencyName: string): Job[] {
    return getJobList().filter((job) => job.agency === agencyName);
}

export type AgencyPageQuery = {
    pathway?: string | null;
    q?: string | null;
    country?: string | null;
    page?: number | string | null;
    perPage?: number;
};

export type AgencyPage = {
    items: Agency[];
    total: number;
    totalPages: number;
    page: number;
};

/**
 * Filters and paginates the directory. An unknown pathway falls back to
 * landbased, the page is clamped to the available range, and the keyword is
 * capped at 100 characters.
 */
export function getAgencyPage(query: AgencyPageQuery = {}): AgencyPage {
    const pathway: Pathway =
        query.pathway === 'seabased' ? 'seabased' : 'landbased';
    const keyword = normalizeKeyword(query.q);
    const perPage = query.perPage ?? AGENCIES_PER_PAGE;

    const matches = agencies.filter((agency) => {
        if (agency.pathway !== pathway) {
            return false;
        }

        if (!keyword) {
            return true;
        }

        return [agency.name, agency.location, agency.license].some((value) =>
            value.toLowerCase().includes(keyword),
        );
    });

    return paginate(matches, query.page, perPage);
}

export type PageResult<T> = {
    items: T[];
    total: number;
    totalPages: number;
    page: number;
};

export type ListPageQuery = {
    q?: string | null;
    page?: number | string | null;
    perPage?: number;
};

/**
 * Lowercases and caps the keyword at 100 characters.
 */
export function normalizeKeyword(keyword: string | null | undefined): string {
    return String(keyword ?? '')
        .trim()
        .slice(0, 100)
        .toLowerCase();
}

/**
 * Paginates a filtered list. The page is clamped to the valid range.
 */
export function paginate<T>(
    items: T[],
    page: number | string | null | undefined,
    perPage: number,
): PageResult<T> {
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const requested = Number(page ?? 1);
    const current = Number.isFinite(requested)
        ? Math.min(Math.max(Math.trunc(requested), 1), totalPages)
        : 1;
    const start = (current - 1) * perPage;

    return {
        items: items.slice(start, start + perPage),
        total,
        totalPages,
        page: current,
    };
}

export function getJobPathwayCounts(): Record<Pathway, number> {
    const counts: Record<Pathway, number> = { landbased: 0, seabased: 0 };

    for (const job of getJobList()) {
        counts[job.pathway] += 1;
    }

    return counts;
}

/**
 * Total applicants across every listing, derived from the
 * applications list.
 */
export function getTotalApplicants(): number {
    return Object.values(getJobApplicantCounts()).reduce(
        (sum, count) => sum + count,
        0,
    );
}

export function getTotalJobs(): number {
    return getJobList().length;
}

export type JobRow = {
    job: Job;
    applicants: number;
};

function filterJobs(query: JobPageQuery, items?: Job[]): JobRow[] {
    const keyword = normalizeKeyword(query.q);
    const pathway = query.pathway ?? 'all';
    const postingType = query.postingType ?? 'all';
    const category = query.category ?? 'all';
    const employer = query.employer ?? 'all';
    const status = query.status ?? 'all';
    const applicantCounts = getJobApplicantCounts();

    const rows: JobRow[] = (items ?? getJobList()).map((job) => ({
        job,
        applicants: applicantCounts[job.id] ?? 0,
    }));

    return rows.filter(({ job }) => {
        if (pathway !== 'all' && job.pathway !== pathway) {
            return false;
        }

        if (postingType !== 'all' && job.postingType !== postingType) {
            return false;
        }

        if (category !== 'all' && job.category !== category) {
            return false;
        }

        if (employer !== 'all' && job.employer !== employer) {
            return false;
        }

        const effectiveStatus = getEffectiveStatus(job);

        // Archived listings are tucked away and only surface when the
        // status filter asks for them.
        const matchesStatus =
            status === 'all'
                ? effectiveStatus !== 'archived'
                : effectiveStatus === status;

        if (!matchesStatus) {
            return false;
        }

        if (query.closingSoon && !isClosingSoon(job.closingDate)) {
            return false;
        }

        if (!keyword) {
            return true;
        }

        return [
            job.title,
            job.employer,
            job.agency,
            job.location,
            job.category,
            job.subCategory,
        ].some((value) => value.toLowerCase().includes(keyword));
    });
}

/**
 * The jobs receiving the most interest, descending by the
 * derived applicant count.
 */
export function getTopJobs(limit: number): JobRow[] {
    const applicantCounts = getJobApplicantCounts();

    return getJobList()
        .map((job) => ({ job, applicants: applicantCounts[job.id] ?? 0 }))
        .sort((left, right) => right.applicants - left.applicants)
        .slice(0, limit);
}

export type JobSortField =
    | 'title'
    | 'employer'
    | 'postingType'
    | 'category'
    | 'pathway'
    | 'quantity'
    | 'gender'
    | 'salary'
    | 'posted'
    | 'closingDate'
    | 'applicants';

export type SortDirection = 'asc' | 'desc';

export type JobPageQuery = ListPageQuery & {
    pathway?: Pathway | 'all' | null;
    postingType?: PostingType | 'all' | null;
    category?: string | null;
    employer?: string | null;
    status?: EffectiveStatus | 'all' | null;
    closingSoon?: boolean | null;
    sort?: JobSortField | null;
    sortDirection?: SortDirection | null;
};

/**
 * Turns a relative label such as "2 days ago" or "Just now"
 * into a comparable number of days.
 */
function postedDays(posted: string): number {
    const value = posted.trim().toLowerCase();

    if (value === 'just now') {
        return 0;
    }

    const match = value.match(/^(\d+)\s*(day|week|month)/);

    if (!match) {
        return Number.MAX_SAFE_INTEGER;
    }

    const amount = Number.parseInt(match[1], 10);

    if (match[2] === 'week') {
        return amount * 7;
    }

    if (match[2] === 'month') {
        return amount * 30;
    }

    return amount;
}

/**
 * Days until the closing date, for ordering the "Expiring soon" list.
 * Listings that already expired sink to the bottom instead of topping a
 * soonest-first list, and so does a missing date.
 */
function closingDays(dateValue: string | undefined): number {
    const days = daysUntil(dateValue ?? '');

    return days === null || days < 0 ? Number.MAX_SAFE_INTEGER : days;
}

/**
 * Extracts the leading amount from a salary range so ranges can be
 * ordered by their lower bound.
 */
function salaryAmount(salary: string): number {
    const match = salary.replaceAll(',', '').match(/\d+/);

    return match ? Number.parseInt(match[0], 10) : 0;
}

function sortValue(row: JobRow, field: JobSortField): string | number {
    const { job, applicants } = row;

    switch (field) {
        case 'applicants':
            return applicants;
        case 'quantity':
            return job.quantity;
        case 'posted':
            return postedDays(job.posted);
        case 'closingDate':
            return closingDays(job.closingDate);
        case 'salary':
            return salaryAmount(job.salary);
        case 'employer':
            return job.employer.toLowerCase();
        case 'category':
            return `${job.category} ${job.subCategory}`.toLowerCase();
        case 'pathway':
            return job.pathway;
        case 'postingType':
            return job.postingType;
        case 'gender':
            return job.gender;
        case 'title':
        default:
            return job.title.toLowerCase();
    }
}

/**
 * Sorts the filtered jobs. Numeric columns sort by magnitude, text
 * columns by value. Sorting happens before pagination so the first
 * page always holds the true top results.
 */
export function sortJobRows(
    rows: JobRow[],
    field: JobSortField | null | undefined,
    direction: SortDirection | null | undefined,
): JobRow[] {
    if (!field) {
        return rows;
    }

    const factor = direction === 'desc' ? -1 : 1;

    return [...rows].sort((left, right) => {
        const a = sortValue(left, field);
        const b = sortValue(right, field);

        if (typeof a === 'number' && typeof b === 'number') {
            return (a - b) * factor;
        }

        return String(a).localeCompare(String(b)) * factor;
    });
}

/**
 * Applicant counts per job, derived from the applications list so the
 * numbers agree across pages.
 */
export function getJobApplicantCounts(): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const application of applications) {
        counts[application.jobId] = (counts[application.jobId] ?? 0) + 1;
    }

    return counts;
}

/**
 * Filters and paginates the jobs list. The pathway filter falls back to
 * showing every pathway, and each job carries its derived applicant count.
 */
export function getJobPage(
    query: JobPageQuery = {},
    items?: Job[],
): PageResult<JobRow> {
    return paginate(
        sortJobRows(filterJobs(query, items), query.sort, query.sortDirection),
        query.page,
        query.perPage ?? JOBS_PER_PAGE,
    );
}

export type JobSummary = {
    total: number;
    landbased: number;
    seabased: number;
    jobOrder: number;
    manpooling: number;
    vacancies: number;
    applicants: number;
    published: number;
    closed: number;
    closingSoon: number;
};

/**
 * Totals for the jobs list summary row, reflecting the active
 * keyword, pathway, posting type and category filters.
 */
export function getJobSummary(
    query: JobPageQuery = {},
    items?: Job[],
): JobSummary {
    const matches = filterJobs(query, items);

    return {
        total: matches.length,
        landbased: matches.filter((row) => row.job.pathway === 'landbased')
            .length,
        seabased: matches.filter((row) => row.job.pathway === 'seabased')
            .length,
        jobOrder: matches.filter((row) => row.job.postingType === 'joborder')
            .length,
        manpooling: matches.filter(
            (row) => row.job.postingType === 'manpooling',
        ).length,
        vacancies: matches.reduce((sum, row) => sum + row.job.quantity, 0),
        applicants: matches.reduce((sum, row) => sum + row.applicants, 0),
        published: matches.filter(
            (row) => getEffectiveStatus(row.job) === 'published',
        ).length,
        closed: matches.filter(
            (row) => getEffectiveStatus(row.job) === 'closed',
        ).length,
        closingSoon: matches.filter((row) => isClosingSoon(row.job.closingDate))
            .length,
    };
}

export type ApplicationRow = {
    application: Application;
    applicant: Applicant;
    job: Job;
};

export type ApplicationPageQuery = ListPageQuery & {
    stage?: ApplicationStage | 'All stages' | null;
    sort?: 'newest' | 'oldest';
};

/**
 * Joins applications with the applicant and job records they reference.
 */
export function getApplicationRows(): ApplicationRow[] {
    const rows: ApplicationRow[] = [];

    for (const application of applications) {
        const applicant = applicants.find(
            (item) => item.id === application.applicantId,
        );
        const job = getJobList().find((item) => item.id === application.jobId);

        if (applicant && job) {
            rows.push({ application, applicant, job });
        }
    }

    return rows;
}

/**
 * Looks up a single application with the applicant and job
 * records it references.
 */
export function getApplicationRow(id: number): ApplicationRow | undefined {
    const application = applications.find((item) => item.id === id);

    if (!application) {
        return undefined;
    }

    const applicant = applicants.find(
        (item) => item.id === application.applicantId,
    );
    const job = getJobList().find((item) => item.id === application.jobId);

    if (!applicant || !job) {
        return undefined;
    }

    return { application, applicant, job };
}

export function getApplicationStageCounts(): Record<ApplicationStage, number> {
    const counts: Record<ApplicationStage, number> = {
        Pending: 0,
        Reviewed: 0,
        Shortlisted: 0,
        Interviewed: 0,
        Hired: 0,
        Rejected: 0,
    };

    for (const application of applications) {
        counts[application.stage] += 1;
    }

    return counts;
}

export function getApplicationDashboardKpis(today = new Date()) {
    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const stageCounts = getApplicationStageCounts();

    // KPIs cover all applications, independent of table filters, sort and page.
    return {
        totalApplicants: applications.length,
        newApplicationsToday: applications.filter(
            (application) => application.appliedAt === localDate,
        ).length,
        reviewed: stageCounts.Reviewed,
        shortlistedApplicants: stageCounts.Shortlisted,
    };
}

/**
 * Filters, sorts and paginates applications. Search matches only the
 * applicant name and job title.
 */
export function getApplicationPage(
    query: ApplicationPageQuery = {},
): PageResult<ApplicationRow> {
    const keyword = normalizeKeyword(query.q);
    const stage = query.stage ?? 'All stages';

    const rows = getApplicationRows().filter(
        ({ application, applicant, job }) => {
            if (stage !== 'All stages' && application.stage !== stage) {
                return false;
            }

            if (!keyword) {
                return true;
            }

            return [applicant.name, job.title].some((value) =>
                value.toLowerCase().includes(keyword),
            );
        },
    );

    const direction = query.sort === 'oldest' ? 1 : -1;
    rows.sort((left, right) => {
        const dateOrder = left.application.appliedAt.localeCompare(
            right.application.appliedAt,
        );

        return (
            (dateOrder || left.application.id - right.application.id) *
            direction
        );
    });

    return paginate(rows, query.page, query.perPage ?? APPLICATIONS_PER_PAGE);
}

export type ApplicantPageQuery = ListPageQuery & {
    pathway?: Pathway | 'all' | null;
    sector?: string | null;
};

/**
 * Filters and paginates the candidate pool. Search matches the
 * name, role, location and skills; the sector filter matches
 * the role and skills.
 */
export function getApplicantPage(
    query: ApplicantPageQuery = {},
): PageResult<Applicant> {
    return paginate(
        filterApplicants(query),
        query.page,
        query.perPage ?? APPLICANTS_PER_PAGE,
    );
}

export type ApplicantSummary = {
    total: number;
    landbased: number;
    seabased: number;
};

/**
 * Totals for the candidate summary row, reflecting the active
 * filters.
 */
export function getApplicantSummary(
    query: ApplicantPageQuery = {},
): ApplicantSummary {
    const matches = filterApplicants(query);

    return {
        total: matches.length,
        landbased: matches.filter(
            (applicant) => applicant.pathway === 'landbased',
        ).length,
        seabased: matches.filter(
            (applicant) => applicant.pathway === 'seabased',
        ).length,
    };
}

function filterApplicants(query: ApplicantPageQuery): Applicant[] {
    const keyword = normalizeKeyword(query.q);
    const pathway = query.pathway ?? 'all';
    const sector = normalizeKeyword(query.sector);

    return applicants.filter((applicant) => {
        if (pathway !== 'all' && applicant.pathway !== pathway) {
            return false;
        }

        if (
            sector &&
            !`${applicant.role} ${applicant.skills.join(' ')}`
                .toLowerCase()
                .includes(sector)
        ) {
            return false;
        }

        if (!keyword) {
            return true;
        }

        return [
            applicant.name,
            applicant.role,
            applicant.location,
            applicant.skills.join(' '),
        ].some((value) => value.toLowerCase().includes(keyword));
    });
}

export type ApplicantSector = {
    label: string;
    value: string;
};

/**
 * Sectors for the candidate filter, derived from the roles in the pool.
 */
export function getApplicantSectors(): ApplicantSector[] {
    const roles = Array.from(new Set(applicants.map((item) => item.role)))
        .sort()
        .map((role) => ({ label: role, value: role.toLowerCase() }));

    return [{ label: 'All roles', value: 'all' }, ...roles];
}

export type AvailabilityOption = {
    label: Availability;
    value: Availability;
};

export const AVAILABILITY_OPTIONS: AvailabilityOption[] = [
    { label: 'Available now', value: 'Available now' },
    { label: 'Available in 2 weeks', value: 'Available in 2 weeks' },
    { label: 'Available in 1 month', value: 'Available in 1 month' },
];

export type OverviewSummary = {
    totalJobs: number;
    featuredJobs: number;
    totalApplications: number;
    stageCounts: Record<ApplicationStage, number>;
};

/**
 * Totals for the dashboard overview, derived from the jobs and
 * applications lists so the numbers agree across pages.
 */
export function getOverviewSummary(): OverviewSummary {
    return {
        totalJobs: getJobList().length,
        featuredJobs: getJobList().filter((job) => job.featured).length,
        totalApplications: applications.length,
        stageCounts: getApplicationStageCounts(),
    };
}

export function getOverviewDays(): OverviewDayPoint[] {
    return overviewDays;
}

export type JobsDashboardKpis = {
    activeJobs: number;
    totalApplicants: number;
    withJobOrder: number;
    successfulPlacements: number;
};

/**
 * Headline figures for the jobs dashboard KPI row. The demo data set
 * only holds a handful of listings, so these stand in for the full
 * platform numbers the design shows.
 */
const JOBS_DASHBOARD_KPIS: JobsDashboardKpis = {
    activeJobs: 1248,
    totalApplicants: 3562,
    withJobOrder: 186,
    successfulPlacements: 324,
};

export function getJobsDashboardKpis(): JobsDashboardKpis {
    return JOBS_DASHBOARD_KPIS;
}
