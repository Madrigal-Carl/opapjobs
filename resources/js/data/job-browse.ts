/**
 * Browsing rules for the public jobs page.
 *
 * The job list itself lives in `data/jobs.ts`; this module only decides which
 * of those listings an applicant sees. Drafts never appear, and closed
 * listings are kept out of the default browse so a dead posting is never the
 * first thing an applicant clicks.
 */
import {
    getPublicEmployer,
    getPublicLocation,
    isAcceptingApplications,
} from '@/data/job-attributes';
import { getJobList } from '@/data/job-store';
import { normalizeKeyword } from '@/data/selectors';
import type { Pathway } from '@/types/agency';
import type { Job } from '@/types/job';

export type JobFilterId =
    | 'landbased'
    | 'seabased'
    | 'featured'
    | 'urgent'
    | 'recent';

export const JOB_FILTERS: JobFilterId[] = [
    'landbased',
    'seabased',
    'featured',
    'urgent',
    'recent',
];

export const JOB_FILTER_LABELS: Record<JobFilterId, string> = {
    landbased: 'Landbased',
    seabased: 'Seabased',
    featured: 'Featured',
    urgent: 'Urgent',
    recent: 'Recent',
};

export type JobBrowseQuery = {
    /** Free text matched against the title, employer, agency and location. */
    q?: string;
    /** Country or region, matched against the location. */
    country?: string;
    filters?: JobFilterId[];
};

function matchesFilter(job: Job, filter: JobFilterId): boolean {
    switch (filter) {
        case 'landbased':
        case 'seabased':
            return job.pathway === filter;
        case 'featured':
            return Boolean(job.featured);
        case 'urgent':
            return Boolean(job.urgent);
        case 'recent':
            return Boolean(job.recent);
    }
}

/**
 * Turns a relative label such as "2 days ago" or "Just now" into a
 * comparable number of days. Mirrors the dashboard's sort so both sides
 * order the same listing the same way.
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
 * Every listing an applicant can currently act on, newest first.
 *
 * `isAcceptingApplications` rather than a `=== 'published'` comparison, so a
 * listing that expired, was closed early, or was archived by the agency all
 * drop out of the browse without anyone remembering to update this list.
 */
export function getOpenJobs(): Job[] {
    return getJobList()
        .filter(isAcceptingApplications)
        .sort(
            (left, right) => postedDays(left.posted) - postedDays(right.posted),
        );
}

/**
 * The listings matching a keyword, a country and any number of toggles.
 * All active toggles must hold, so Landbased + Urgent means urgent
 * landbased roles.
 */
export function browseJobs(query: JobBrowseQuery = {}): Job[] {
    const keyword = normalizeKeyword(query.q);
    const country = normalizeKeyword(query.country);
    const filters = query.filters ?? [];

    return getOpenJobs().filter((job) => {
        if (
            filters.length > 0 &&
            !filters.every((f) => matchesFilter(job, f))
        ) {
            return false;
        }

        // Matched against what the applicant can actually read, so the
        // country filter can never surface a location a listing has hidden.
        if (
            country &&
            !getPublicLocation(job).toLowerCase().includes(country)
        ) {
            return false;
        }

        if (!keyword) {
            return true;
        }

        return [
            job.title,
            // Only the employer an applicant is allowed to know about.
            getPublicEmployer(job)?.name ?? '',
            job.agency,
            getPublicLocation(job),
            job.category,
            job.subCategory,
        ].some((value) => value.toLowerCase().includes(keyword));
    });
}

/**
 * How many listings each toggle would leave, given the current keyword and
 * country but ignoring the toggles themselves, so the number beside a filter
 * always answers "how many of these do I actually get?".
 */
export function getJobFilterCounts(
    query: JobBrowseQuery = {},
): Record<JobFilterId, number> {
    const base = browseJobs({ ...query, filters: [] });

    return JOB_FILTERS.reduce(
        (counts, filter) => {
            counts[filter] = base.filter((job) =>
                matchesFilter(job, filter),
            ).length;

            return counts;
        },
        {} as Record<JobFilterId, number>,
    );
}

/**
 * Listings an applicant can take seriously next to this one: same agency
 * first, then the same discipline. Never crosses pathway, because a
 * landbased electrician is not a near miss for a galley role.
 */
export function getRelatedJobs(job: Job, limit = 3): Job[] {
    const open = getOpenJobs().filter(
        (item) => item.id !== job.id && item.pathway === job.pathway,
    );
    const sameAgency = open.filter((item) => item.agency === job.agency);

    if (sameAgency.length >= limit) {
        return sameAgency.slice(0, limit);
    }

    const sameDiscipline = open.filter(
        (item) => item.agency !== job.agency && item.category === job.category,
    );

    return [...sameAgency, ...sameDiscipline].slice(0, limit);
}

/**
 * Other open listings from the same agency.
 *
 * Deliberately narrower than `getRelatedJobs`: that one widens to the same
 * discipline so there is always something to show, which is fine under a
 * "you might also consider" heading but would be a lie under "more jobs
 * from this agency".
 */
export function getOtherJobsFromAgency(job: Job, limit = 4): Job[] {
    return getOpenJobs()
        .filter((item) => item.id !== job.id && item.agency === job.agency)
        .slice(0, limit);
}

export type PathwayCounts = Record<Pathway, number>;

export function getOpenJobPathwayCounts(): PathwayCounts {
    return getOpenJobs().reduce<PathwayCounts>(
        (counts, job) => {
            counts[job.pathway] += 1;

            return counts;
        },
        { landbased: 0, seabased: 0 },
    );
}
