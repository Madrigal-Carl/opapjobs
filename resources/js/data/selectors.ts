import { accounts } from '@/data/accounts';
import { applicants } from '@/data/applicant';
import { applications } from '@/data/applications';
import { agencies } from '@/data/agencies';
import { getJobList } from '@/data/job-store';
import { overviewDays } from '@/data/overview';
import type { Account, AccountStatus } from '@/types/account';
import type { Agency, Pathway } from '@/types/agency';
import type { Application, ApplicationStage } from '@/types/application';
import type { Applicant, Availability } from '@/types/applicant';
import type { Job } from '@/types/job';
import type { OverviewDayPoint } from '@/types/overview';

export const AGENCIES_PER_PAGE = 12;
export const JOBS_PER_PAGE = 10;
export const APPLICATIONS_PER_PAGE = 10;
export const APPLICANTS_PER_PAGE = 10;
export const ACCOUNTS_PER_PAGE = 10;

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
    const applicantCounts = getJobApplicantCounts();

    const rows: JobRow[] = (items ?? getJobList()).map((job) => ({
        job,
        applicants: applicantCounts[job.id] ?? 0,
    }));

    return rows.filter(({ job }) => {
        if (pathway !== 'all' && job.pathway !== pathway) {
            return false;
        }

        if (!keyword) {
            return true;
        }

        return [job.title, job.employer, job.agency, job.location].some(
            (value) => value.toLowerCase().includes(keyword),
        );
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

export type JobPageQuery = ListPageQuery & {
    pathway?: Pathway | 'all' | null;
};

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
        filterJobs(query, items),
        query.page,
        query.perPage ?? JOBS_PER_PAGE,
    );
}

export type JobSummary = {
    total: number;
    landbased: number;
    seabased: number;
    applicants: number;
};

/**
 * Totals for the jobs list summary row, reflecting the active
 * keyword and pathway filters.
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
        applicants: matches.reduce((sum, row) => sum + row.applicants, 0),
    };
}

export type ApplicationRow = {
    application: Application;
    applicant: Applicant;
    job: Job;
};

export type ApplicationPageQuery = ListPageQuery & {
    stage?: ApplicationStage | 'All stages' | null;
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
        Applied: 0,
        Reviewed: 0,
        Interview: 0,
        Hired: 0,
        Pending: 0,
    };

    for (const application of applications) {
        counts[application.stage] += 1;
    }

    return counts;
}

/**
 * Filters and paginates the applications list. Search matches the
 * applicant, their location, the job title and the employer.
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

            return [
                applicant.name,
                applicant.location,
                job.title,
                job.employer,
            ].some((value) => value.toLowerCase().includes(keyword));
        },
    );

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

export type AccountPageQuery = ListPageQuery & {
    status?: AccountStatus | 'all' | null;
};

/**
 * Filters and paginates the staff accounts list.
 */
export function getAccountPage(
    query: AccountPageQuery = {},
): PageResult<Account> {
    const keyword = normalizeKeyword(query.q);
    const status = query.status ?? 'all';

    const matches = accounts.filter((account) => {
        if (status !== 'all' && account.status !== status) {
            return false;
        }

        if (!keyword) {
            return true;
        }

        return [account.fullName, account.email].some((value) =>
            value.toLowerCase().includes(keyword),
        );
    });

    return paginate(matches, query.page, query.perPage ?? ACCOUNTS_PER_PAGE);
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
