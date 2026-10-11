import { agencies } from '@/data/agencies';
import { jobs } from '@/data/jobs';
import type { Agency, Pathway } from '@/types/agency';
import type { Job } from '@/types/job';

export const AGENCIES_PER_PAGE = 12;

export function getAgencies(): Agency[] {
    return agencies;
}

export function getAgencyBySlug(slug: string): Agency | undefined {
    return agencies.find((agency) => agency.slug === slug);
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
    const keyword = String(query.q ?? '')
        .trim()
        .slice(0, 100)
        .toLowerCase();
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

    const total = matches.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const requested = Number(query.page ?? 1);
    const page = Number.isFinite(requested)
        ? Math.min(Math.max(Math.trunc(requested), 1), totalPages)
        : 1;
    const start = (page - 1) * perPage;

    return {
        items: matches.slice(start, start + perPage),
        total,
        totalPages,
        page,
    };
}

export function getJobsByAgency(agencyName: string): Job[] {
    return jobs.filter((job) => job.agency === agencyName);
}
