import type {
    EducationLevel,
    LanguageProficiency,
    ListingStatus,
} from '@/types/job';

export type EffectiveStatus = ListingStatus | 'closed';

export const STATUS_LABELS: Record<EffectiveStatus, string> = {
    draft: 'Draft',
    published: 'Published',
    closed: 'Closed',
};

export const EDUCATION_LABELS: Record<EducationLevel, string> = {
    any: 'Any education level',
    secondary: 'High school graduate',
    vocational: 'Vocational certificate',
    bachelor: "Bachelor's degree",
    master: "Master's degree",
};

export const PROFICIENCY_LABELS: Record<LanguageProficiency, string> = {
    basic: 'Basic',
    conversational: 'Conversational',
    fluent: 'Fluent',
};

export const CONTRACT_LABELS: Record<
    'permanent' | 'fixed' | 'seasonal',
    string
> = {
    permanent: 'Permanent',
    fixed: 'Fixed term',
    seasonal: 'Seasonal',
};

/**
 * Languages commonly requested by overseas employers in these
 * sectors, ordered roughly by how often they come up.
 */
export const LANGUAGES = [
    'English',
    'Tagalog',
    'Arabic',
    'Mandarin',
    'Spanish',
    'Hindi',
    'Urdu',
    'Korean',
    'Japanese',
    'Russian',
] as const;

/**
 * Days before the closing date at which a listing is flagged
 * as closing soon.
 */
export const CLOSING_SOON_DAYS = 7;

/**
 * Turns an ISO date into whole days from today. Negative when the
 * date has passed.
 */
export function daysUntil(dateValue: string): number | null {
    if (!dateValue) {
        return null;
    }

    const target = new Date(`${dateValue}T23:59:59`);

    if (!Number.isFinite(target.getTime())) {
        return null;
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    // floor, not ceil: for a date that has just passed the difference
    // is a tiny negative fraction, and Math.ceil would round it up to
    // -0, which is not < 0 and would leave the listing open a day late.
    return Math.floor((target.getTime() - start.getTime()) / 86400000);
}

export function isClosingSoon(
    dateValue: string | undefined,
    withinDays = CLOSING_SOON_DAYS,
): boolean {
    const days = daysUntil(dateValue ?? '');

    return days !== null && days >= 0 && days <= withinDays;
}

/**
 * The status a listing actually presents. Draft listings stay drafts;
 * published ones close themselves once the closing date has passed or
 * the agency stops them early. Nothing here is set by hand.
 */
export function getEffectiveStatus(job: {
    status?: ListingStatus;
    closingDate?: string;
    closedEarly?: boolean;
}): EffectiveStatus {
    if ((job.status ?? 'published') === 'draft') {
        return 'draft';
    }

    if (job.closedEarly) {
        return 'closed';
    }

    return hasClosingPassed(job.closingDate) ? 'closed' : 'published';
}

/**
 * Whether applicants can currently see and apply to the listing.
 */
export function isAcceptingApplications(job: {
    status?: ListingStatus;
    closingDate?: string;
    closedEarly?: boolean;
}): boolean {
    return getEffectiveStatus(job) === 'published';
}

export function hasClosingPassed(dateValue: string | undefined): boolean {
    const days = daysUntil(dateValue ?? '');

    return days !== null && days < 0;
}

/**
 * A listing counts as similar when the same employer already has a
 * listing for the same title and category. Closed listings are
 * ignored so a re-post after closing is not flagged.
 */
export function findSimilarListing<
    T extends {
        id: string;
        employer: string;
        title: string;
        category: string;
        status?: ListingStatus;
    },
>(
    draft: { employer: string; title: string; category: string },
    existing: T[],
): T[] {
    if (!draft.employer.trim() || !draft.title.trim() || !draft.category) {
        return [];
    }

    const normalise = (value: string) =>
        value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ');

    const title = normalise(draft.title);

    return existing.filter(
        (job) =>
            getEffectiveStatus(job) !== 'closed' &&
            normalise(job.employer) === normalise(draft.employer) &&
            normalise(job.title) === title &&
            job.category === draft.category,
    );
}
