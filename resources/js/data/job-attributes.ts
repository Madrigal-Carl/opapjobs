import type {
    EducationLevel,
    GenderRequirement,
    LanguageProficiency,
    ListingStatus,
    PostingType,
} from '@/types/job';

export type EffectiveStatus = ListingStatus | 'closed';

export const STATUS_LABELS: Record<EffectiveStatus, string> = {
    draft: 'Draft',
    published: 'Published',
    closed: 'Closed',
};

export const GENDER_LABELS: Record<GenderRequirement, string> = {
    any: 'Any',
    male: 'Male only',
    female: 'Female only',
};

export const POSTING_TYPE_LABELS: Record<PostingType, string> = {
    joborder: 'With job order',
    manpooling: 'Manpooling',
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
 * "Closes in 3 days" / "Closes tomorrow" / "Closes today", or an empty
 * string when the listing has no closing date, has already closed, or is
 * not close enough to be worth flagging.
 */
export function closingUrgencyLabel(
    dateValue: string | undefined,
    withinDays = CLOSING_SOON_DAYS,
): string {
    if (!isClosingSoon(dateValue, withinDays)) {
        return '';
    }

    const days = daysUntil(dateValue ?? '');

    if (days === 0) {
        return 'Closes today';
    }

    if (days === 1) {
        return 'Closes tomorrow';
    }

    return `Closes in ${days} days`;
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
 * What an applicant is allowed to see about the hiring employer.
 *
 * A manpooling listing keeps the company, its location and its licence to
 * itself; applicants only ever deal with the agency. Both the agency-side
 * preview and every applicant-facing card read these functions, so the
 * redaction rule cannot drift between the two.
 */
export type PublicEmployer = {
    name: string;
    location: string;
    poeaLicenseNo: string;
};

export function isManpooling(job: { postingType?: PostingType }): boolean {
    return (job.postingType ?? 'joborder') === 'manpooling';
}

/** The employer details an applicant may see, or `null` when redacted. */
export function getPublicEmployer(job: {
    employer: string;
    employerLocation: string;
    poeaLicenseNo: string;
    postingType?: PostingType;
}): PublicEmployer | null {
    if (isManpooling(job)) {
        return null;
    }

    return {
        name: job.employer,
        location: job.employerLocation,
        poeaLicenseNo: job.poeaLicenseNo,
    };
}

/** The line shown in place of a redacted employer name. */
export const CONFIDENTIAL_EMPLOYER_LABEL = 'Confidential employer';

/** The trailing region of "Doha, Qatar" — "Qatar". */
function destinationOf(location: string): string {
    const parts = location
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

    return parts.length > 1 ? parts[parts.length - 1] : location;
}

/**
 * Where the role actually is, as an applicant may read it.
 *
 * A manpooling listing keeps the employer's exact site to itself and shows
 * only the destination region, which is how these vacancies are advertised.
 * A job-order listing shows its full location.
 */
export function getPublicLocation(job: {
    location: string;
    employerLocation: string;
    postingType?: PostingType;
}): string {
    const location = job.location || job.employerLocation;

    if (!isManpooling(job)) {
        return location;
    }

    return destinationOf(location);
}

/**
 * The experience band as applicants read it: "3–7 years", "5+ years" or an
 * empty string when the agency set no requirement.
 */
export function experienceRangeLabel(job: {
    minExperienceYears?: number;
    maxExperienceYears?: number;
}): string {
    const { minExperienceYears: min, maxExperienceYears: max } = job;

    if (min && max) {
        return `${min}–${max} years`;
    }

    if (min) {
        return `${min}+ years`;
    }

    if (max) {
        return `Up to ${max} years`;
    }

    return '';
}

/**
 * The age band as applicants read it, or an empty string when the agency
 * left both bounds blank.
 */
export function ageRangeLabel(job: {
    ageMin?: number;
    ageMax?: number;
}): string {
    const { ageMin, ageMax } = job;

    if (ageMin && ageMax) {
        return `${ageMin}–${ageMax}`;
    }

    if (ageMin) {
        return `${ageMin}+`;
    }

    if (ageMax) {
        return `Up to ${ageMax}`;
    }

    return '';
}

/**
 * "Category / Sub-category" as applicants read it. Empty when the agency has
 * not classified the listing yet.
 */
export function categoryLabel(job: {
    category?: string;
    subCategory?: string;
}): string {
    if (job.category && job.subCategory) {
        return `${job.category} · ${job.subCategory}`;
    }

    return job.subCategory ?? job.category ?? '';
}

/**
 * A closing date as applicants read it: "Dec 1, 2026", or "Open" when the
 * agency left it off or the value is not a date at all.
 */
export function closingLabel(closingDate: string | undefined): string {
    if (!closingDate) {
        return 'Open';
    }

    const date = new Date(`${closingDate}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return closingDate;
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
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
