import type { SystemState } from './store';
import type {
    AgencyRecord,
    JobPostRecord,
    JobPostStatus,
    UserRecord,
} from './types';
import type { JobPostDisplayStatus } from '@/types/job-post';
import type { Pathway } from '@/types/agency';

/**
 * Derived values for the console.
 *
 * Anything the docs call a computed column — a job post's display status,
 * an Agency's job-post count or seat usage, a category's usage — lives here
 * rather than on the record, so the store never carries a value that could
 * drift out of step with its inputs (§4 of `docs/database.md`).
 *
 * `today` is injectable so the status rules can be reasoned about in tests
 * instead of depending on the wall clock.
 */

export type Today = string;

/** ISO date (YYYY-MM-DD) suitable for comparing against closing dates. */
export function todayIso(date: Date = new Date()): Today {
    return date.toISOString().slice(0, 10);
}

/**
 * Display status for a job post (§8.2). The stored status is only ever
 * `pending | closed | archived`; `active` and `expired` are derived from
 * the closing date, and a post with no closing date never expires.
 */
export function jobPostDisplayStatus(
    post: JobPostRecord,
    today: Today = todayIso(),
): JobPostDisplayStatus {
    if (post.status === 'archived') {
        return 'archived';
    }

    if (post.status === 'closed') {
        return 'closed';
    }

    // `pending` still accepting applications.
    if (post.closingDate !== null && post.closingDate < today) {
        return 'expired';
    }

    return 'active';
}

/** True when reopening requires a new closing date (§8.2). */
export function reopeningNeedsNewDate(
    post: JobPostRecord,
    today: Today = todayIso(),
): boolean {
    return post.closingDate !== null && post.closingDate < today;
}

/**
 * Job posts still attached to an Agency. Archived posts are excluded from
 * counts shown as "job posts" because they are hidden everywhere; the
 * archive count is surfaced separately where it matters.
 */
export function agencyJobPosts(
    state: SystemState,
    agencyId: number,
    includeArchived = false,
): JobPostRecord[] {
    return state.jobPosts.filter(
        (post) =>
            post.agencyId === agencyId &&
            (includeArchived || post.status !== 'archived'),
    );
}

/**
 * Staff seats used toward `agency_user_limit` (§2.2). The Agency's admin
 * sits in its own card and does **not** count, so this is only `agency`
 * accounts. Suspended and archived accounts still hold their seat until
 * restored, which is the conservative reading of a limit.
 */
export function agencySeatsUsed(state: SystemState, agencyId: number): number {
    return state.accounts.filter(
        (account) =>
            account.agencyId === agencyId &&
            account.role === 'agency' &&
            account.suspendedAt === null &&
            account.deletedAt === null,
    ).length;
}

export function seatsRemaining(
    state: SystemState,
    agency: AgencyRecord,
): number {
    return Math.max(
        0,
        agency.agencyUserLimit - agencySeatsUsed(state, agency.id),
    );
}

/** The single `admin` account for an Agency (§2.2: exactly one). */
export function agencyAdmin(
    state: SystemState,
    agencyId: number,
): UserRecord | undefined {
    return state.accounts.find(
        (account) => account.agencyId === agencyId && account.role === 'admin',
    );
}

export type AgencyDisplayStatus = 'active' | 'suspended' | 'archived';

/**
 * Display status for an Agency. Suspension and archive are both stored, so
 * the label is derived rather than kept on the record — archive wins because
 * a record that has left the list should not read as merely suspended (§4.4).
 */
export function agencyDisplayStatus(agency: AgencyRecord): AgencyDisplayStatus {
    if (agency.deletedAt !== null) {
        return 'archived';
    }

    if (agency.suspendedAt !== null) {
        return 'suspended';
    }

    return 'active';
}

export const AGENCY_STATUS_LABELS: Record<AgencyDisplayStatus, string> = {
    active: 'Active',
    suspended: 'Suspended',
    archived: 'Archived',
};

/** Agencies that still appear in lists: everything except archived. */
export function visibleAgencies(agencies: AgencyRecord[]): AgencyRecord[] {
    return agencies.filter((agency) => agency.deletedAt === null);
}

/**
 * Pathway of the category a subcategory belongs to, so a move can be
 * restricted to categories of the same pathway (§4.8).
 */
export function subcategoryPathway(
    state: SystemState,
    subcategoryId: number,
): Pathway | null {
    const subcategory = state.subcategories.find(
        (entry) => entry.id === subcategoryId,
    );

    if (!subcategory) {
        return null;
    }

    return (
        state.categories.find(
            (category) => category.id === subcategory.jobCategoryId,
        )?.pathway ?? null
    );
}

/** Active (non-archived) subcategories of a category, in sort order. */
export function categorySubcategories(
    state: SystemState,
    categoryId: number,
    includeArchived = false,
) {
    return state.subcategories
        .filter(
            (subcategory) =>
                subcategory.jobCategoryId === categoryId &&
                (includeArchived || subcategory.deletedAt === null),
        )
        .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * How many job posts point at a category, counted through its
 * subcategories. Shown before an archive so the consequence is concrete.
 */
export function categoryUsage(state: SystemState, categoryId: number): number {
    const subcategoryIds = new Set(
        state.subcategories
            .filter((subcategory) => subcategory.jobCategoryId === categoryId)
            .map((subcategory) => subcategory.id),
    );

    return state.jobPosts.filter((post) =>
        subcategoryIds.has(post.jobSubcategoryId),
    ).length;
}

export function subcategoryUsage(
    state: SystemState,
    subcategoryId: number,
): number {
    return state.jobPosts.filter(
        (post) => post.jobSubcategoryId === subcategoryId,
    ).length;
}

/** Average rating rounded to one decimal, or null when there are none. */
export function agencyRating(
    state: SystemState,
    agencyId: number,
): number | null {
    const reviews = state.reviews.filter(
        (review) => review.agencyId === agencyId && review.deletedAt === null,
    );

    if (reviews.length === 0) {
        return null;
    }

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);

    return Math.round((total / reviews.length) * 10) / 10;
}

/** Case-insensitive uniqueness checks used before a save commits. */
export function isDuplicateSlug(
    state: SystemState,
    slug: string,
    exceptId?: number,
) {
    return state.agencies.some(
        (agency) => agency.id !== exceptId && agency.slug === slug,
    );
}

export function isDuplicateLicense(
    state: SystemState,
    license: string,
    exceptId?: number,
) {
    const needle = license.trim().toLowerCase();

    return state.agencies.some(
        (agency) =>
            agency.id !== exceptId &&
            agency.dmwLicenseNumber.trim().toLowerCase() === needle,
    );
}

export function isDuplicateEmail(
    state: SystemState,
    email: string,
    exceptId?: number,
) {
    const needle = email.trim().toLowerCase();

    return state.accounts.some(
        (account) =>
            account.id !== exceptId &&
            account.email.trim().toLowerCase() === needle,
    );
}

/** Job-post status labels, used by filters and pills throughout. */
export const DISPLAY_STATUS_LABELS: Record<JobPostDisplayStatus, string> = {
    active: 'Active',
    expired: 'Expired',
    closed: 'Closed',
    archived: 'Archived',
};

/** Pill tone per stored job-post status, limited to `badges.tsx` tones. */
export const JOB_POST_STATUS_TONE: Record<JobPostStatus, string> = {
    pending: 'info',
    closed: 'neutral',
    archived: 'navy',
};
