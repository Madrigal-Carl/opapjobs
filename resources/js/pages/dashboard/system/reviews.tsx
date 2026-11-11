import { Head, Link } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    Eye,
    MessageSquareText,
    Pencil,
    SearchX,
    ShieldQuestion,
    Sparkles,
    Star,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import type { StatusPillTone } from '@/components/dashboard/badges';
import { StatusPill } from '@/components/dashboard/badges';
import type { Column } from '@/components/dashboard/data-table';
import {
    DataTable,
    DataTableField,
    DataTableRefreshButton,
    DataTableSearch,
    DataTableSelect,
    DataTableToolbar,
} from '@/components/dashboard/data-table';
import { DashboardEmptyState } from '@/components/dashboard/empty-state';
import { FilterChip } from '@/components/dashboard/filter-chip';
import type { KpiCardProps } from '@/components/system/system-kpi-card';
import { KpiCard, KpiGrid } from '@/components/system/system-kpi-card';
import { SystemPage } from '@/components/system/system-page';
import { StarRating } from '@/components/site/star-rating';
import { BulkBar } from '@/components/system/bulk-bar';
import { ConfirmDialog } from '@/components/system/confirm-dialog';
import {
    EntitySheet,
    SheetSaveActions,
} from '@/components/system/entity-sheet';
import { TextAreaField } from '@/components/system/form-text-field';
import { LockedField } from '@/components/system/locked-field';
import { SystemPageHeader } from '@/components/system/system-page-header';
import type { SystemRowAction } from '@/components/system/system-row-menu';
import { SystemRowMenu } from '@/components/system/system-row-menu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useRowSelection } from '@/hooks/use-row-selection';
import { useFormChanges } from '@/hooks/use-form-changes';
import { agencyRating } from '@/data/system/selectors';
import {
    commitSystemChange,
    popAuditEntry,
    updateSystemState,
    useSystemState,
} from '@/data/system/store';
import type {
    AgencyRecord,
    AgencyReviewRecord,
    AuditChange,
    UserRecord,
} from '@/data/system/types';
import * as system from '@/routes/dashboard/system';
import { show as agencyShow } from '@/routes/dashboard/system/agencies';
import { show as applicantShow } from '@/routes/dashboard/system/applicants';

/**
 * Reviews (§7.4): one review per applicant per Agency, in one list.
 *
 * The console screen a superadmin lands on to moderate them. The record
 * itself carries no "published" flag — a review is either live or archived
 * (`deletedAt`), and a moderator edit is stamped into `editedByModeratorAt`
 * — so every status here is derived from those two fields rather than from
 * a state the data cannot express. Rating, reviewer and Agency are locked
 * by the one-review-per-Agency rule; only the text can be amended, and the
 * stars never change after the fact.
 *
 * Everything is read from the in-memory store, so a browser refresh resets
 * it. Every mutation writes its audit row inside `commitSystemChange`, and
 * Undo restores the record's own typed values while dropping that row, so a
 * reversal inside the toast's window never appears in the audit log.
 */

const PER_PAGE = 8;

/** Moderator edits stay a readable paragraph (§4.7 of the console spec). */
const MAX_REVIEW_CHARS = 2_000;

type ReviewDisplayStatus = 'unmoderated' | 'edited' | 'archived';

type StatusFilter = 'all' | ReviewDisplayStatus;

type SortKey = 'newest' | 'highest' | 'lowest';

const STATUS_LABELS: Record<ReviewDisplayStatus, string> = {
    unmoderated: 'Unmoderated',
    edited: 'Edited',
    archived: 'Archived',
};

const STATUS_TONE: Record<ReviewDisplayStatus, StatusPillTone> = {
    unmoderated: 'warning',
    edited: 'info',
    archived: 'neutral',
};

const ACCENT: Record<ReviewDisplayStatus, 'amber' | 'teal' | 'neutral'> = {
    unmoderated: 'amber',
    edited: 'teal',
    archived: 'neutral',
};

/** `all` deliberately excludes archived — archive takes a record out of lists. */
const STATUS_OPTIONS = [
    { value: 'all', label: 'All live reviews' },
    { value: 'unmoderated', label: 'Unmoderated' },
    { value: 'edited', label: 'Edited by a moderator' },
    { value: 'archived', label: 'Archived' },
];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'highest', label: 'Highest rating' },
    { value: 'lowest', label: 'Lowest rating' },
];

const reviewDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const reviewStamp = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

/**
 * Display status for a review. Archive wins because a review that has left
 * the list should not read as merely unmoderated (§4.4 pattern); between
 * the two live states, `editedByModeratorAt` is the only moderation mark
 * the record carries.
 */
function reviewDisplayStatus(review: AgencyReviewRecord): ReviewDisplayStatus {
    if (review.deletedAt !== null) {
        return 'archived';
    }

    return review.editedByModeratorAt === null ? 'unmoderated' : 'edited';
}

/** Mean of live reviews, rounded to one decimal, or null when there are none. */
function meanRating(reviews: AgencyReviewRecord[]): number | null {
    if (reviews.length === 0) {
        return null;
    }

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);

    return Math.round((total / reviews.length) * 10) / 10;
}

function validateReviewText(text: string): string | null {
    if (text.trim() === '') {
        return 'Enter the review text — a rating alone cannot be saved here. Archive the review instead.';
    }

    if (text.length > MAX_REVIEW_CHARS) {
        return `Keep the review text under ${MAX_REVIEW_CHARS.toLocaleString('en-US')} characters.`;
    }

    return null;
}

type PendingAction =
    | { kind: 'archive' | 'restore'; review: AgencyReviewRecord }
    | { kind: 'bulk-archive'; reviews: AgencyReviewRecord[] };

type DialogCopy = {
    title: string;
    description: string;
    consequences: string[];
    confirmLabel: string;
    destructive: boolean;
    testId: string;
};

/**
 * Applies a patch to one review, writes its audit row, and offers Undo.
 *
 * Undo does not commit a second audit entry — it restores the original field
 * values and drops the entry this call just wrote, so a change that was
 * reversed within the toast's window never appears to have happened.
 */
function mutateReview(
    review: AgencyReviewRecord,
    options: {
        action: string;
        subjectLabel: string;
        changes: AuditChange[];
        patch: Partial<AgencyReviewRecord>;
        undo: Partial<AgencyReviewRecord>;
        message: string;
    },
): void {
    commitSystemChange({
        action: options.action,
        subjectType: 'review',
        subjectId: review.id,
        subjectLabel: options.subjectLabel,
        changes: options.changes,
        apply: (current) => ({
            ...current,
            reviews: current.reviews.map((entry) =>
                entry.id === review.id ? { ...entry, ...options.patch } : entry,
            ),
        }),
    });

    toast.success(options.message, {
        duration: 6000,
        action: {
            label: 'Undo',
            onClick: () => {
                updateSystemState((current) => ({
                    ...current,
                    reviews: current.reviews.map((entry) =>
                        entry.id === review.id
                            ? { ...entry, ...options.undo }
                            : entry,
                    ),
                }));
                popAuditEntry();
            },
        },
    });
}

/** One label/value line inside a detail sheet. */
function DetailRow({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <dt className="text-[11px] font-semibold tracking-[0.06em] text-[var(--slate)] uppercase">
                {label}
            </dt>
            <dd className="min-w-0 text-right text-sm text-[var(--navy)]">
                {children}
            </dd>
        </div>
    );
}

/** The read-only detail sheet for one review. */
function ReviewDetailSheet({
    review,
    reviewer,
    agency,
    onClose,
}: {
    review: AgencyReviewRecord;
    reviewer: UserRecord | undefined;
    agency: AgencyRecord | undefined;
    onClose: () => void;
}) {
    const status = reviewDisplayStatus(review);
    const agencyName = agency?.agencyName ?? `Agency #${review.agencyId}`;

    return (
        <EntitySheet
            open
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
            title="Review details"
            description={`What ${reviewer?.name ?? 'this applicant'} wrote about ${agencyName}, in full.`}
            data-testid="sheet-review-details"
            footer={
                <Button
                    type="button"
                    variant="secondary"
                    className="ml-auto"
                    onClick={onClose}
                >
                    Close
                </Button>
            }
        >
            <dl className="flex flex-col gap-3">
                <DetailRow label="Reviewer">
                    <Link
                        href={applicantShow({
                            applicant: review.applicantUserId,
                        })}
                        className="rounded-sm font-semibold text-[var(--navy-deep)] underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
                        data-testid="link-review-applicant"
                    >
                        {reviewer?.name ?? 'Unknown applicant'}
                    </Link>
                    <span className="block text-xs text-[var(--slate)]">
                        {reviewer?.email ?? 'No account on file'}
                    </span>
                </DetailRow>
                <DetailRow label="Agency">
                    <Link
                        href={agencyShow({ agency: review.agencyId })}
                        className="rounded-sm font-semibold text-[var(--navy-deep)] underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
                        data-testid="link-review-agency"
                    >
                        {agencyName}
                    </Link>
                    {agency && (
                        <span className="block text-xs text-[var(--slate)]">
                            {agency.headquartersCity}
                        </span>
                    )}
                </DetailRow>
                <DetailRow label="Rating">
                    <span className="flex items-center justify-end gap-2">
                        <StarRating rating={review.rating} size={14} />
                        <span className="font-semibold tabular-nums">
                            {review.rating} / 5
                        </span>
                    </span>
                </DetailRow>
                <DetailRow label="Submitted">
                    {reviewStamp.format(new Date(review.createdAt))}
                </DetailRow>
                <DetailRow label="Status">
                    <StatusPill tone={STATUS_TONE[status]} dot>
                        {STATUS_LABELS[status]}
                    </StatusPill>
                </DetailRow>
                <DetailRow label="Moderator edit">
                    {review.editedByModeratorAt === null
                        ? 'Never edited'
                        : reviewStamp.format(
                              new Date(review.editedByModeratorAt),
                          )}
                </DetailRow>
            </dl>

            <section className="flex flex-col gap-2 border-t border-[var(--line)] pt-4">
                <h3 className="text-[11px] font-semibold tracking-[0.06em] text-[var(--slate)] uppercase">
                    Review text
                </h3>
                {review.reviewText === null ? (
                    <p className="text-sm text-[var(--slate)]">
                        No text — this review carries its rating alone.
                    </p>
                ) : (
                    <p className="text-sm leading-relaxed break-words whitespace-pre-line text-[var(--navy)]">
                        {review.reviewText}
                    </p>
                )}
            </section>
        </EntitySheet>
    );
}

/**
 * The moderator's edit surface. The stars and the reviewer are locked by the
 * one-review-per-Agency rule, so the text is the only field a save can touch
 * — and saving stamps `editedByModeratorAt`, which is exactly what the store
 * says that column is for (§4.7).
 */
function ReviewEditSheet({
    review,
    subjectLabel,
    reviewerName,
    onClose,
}: {
    review: AgencyReviewRecord;
    subjectLabel: string;
    reviewerName: string;
    onClose: () => void;
}) {
    const form = useFormChanges({ reviewText: review.reviewText ?? '' });
    const [error, setError] = useState<string | null>(null);

    function save() {
        const trimmed = form.values.reviewText.trim();
        const found = validateReviewText(trimmed);

        if (found !== null) {
            setError(found);
            return;
        }

        // Whitespace-only edits change nothing on the record.
        if (trimmed === review.reviewText) {
            onClose();
            return;
        }

        mutateReview(review, {
            action: 'edit',
            subjectLabel,
            changes: [
                {
                    field: 'Review text',
                    from: review.reviewText,
                    to: trimmed,
                },
            ],
            patch: {
                reviewText: trimmed,
                editedByModeratorAt: new Date().toISOString(),
            },
            undo: {
                reviewText: review.reviewText,
                editedByModeratorAt: review.editedByModeratorAt,
            },
            message: `Review by ${reviewerName} edited.`,
        });

        onClose();
    }

    return (
        <EntitySheet
            open
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
            title="Edit review"
            description={`Amend the text of ${reviewerName}’s review. The edit is stamped on the record.`}
            data-testid="sheet-review-edit"
            footer={
                <SheetSaveActions
                    onCancel={onClose}
                    onSave={save}
                    saveLabel="Save changes"
                    saveDisabled={!form.isDirty}
                    data-testid="sheet-save-review"
                />
            }
        >
            <LockedField
                label="Rating"
                value={
                    <span className="flex items-center gap-2">
                        <StarRating rating={review.rating} size={14} />
                        <span className="tabular-nums">
                            {review.rating} / 5
                        </span>
                    </span>
                }
                reason="An applicant rates an Agency once (§7.4), so a moderator can amend the text but never the stars."
                data-testid="locked-review-rating"
            />
            <TextAreaField
                id="edit-review-text"
                label="Review text"
                required
                value={form.values.reviewText}
                onChange={(value) => {
                    form.setValue('reviewText', value);
                    setError(null);
                }}
                error={error}
                hint="Plain text. Editing stamps the review as edited by a moderator."
                maxLength={MAX_REVIEW_CHARS}
                rows={6}
                data-testid="input-edit-review-text"
            />
        </EntitySheet>
    );
}

export default function SystemReviews() {
    const state = useSystemState();
    const selection = useRowSelection();

    const [q, setQ] = useState('');
    const [agency, setAgency] = useState('all');
    const [rating, setRating] = useState('all');
    const [status, setStatus] = useState<StatusFilter>('all');
    const [sort, setSort] = useState<SortKey>('newest');
    const [page, setPage] = useState(1);
    const [viewing, setViewing] = useState<AgencyReviewRecord | null>(null);
    const [editing, setEditing] = useState<AgencyReviewRecord | null>(null);
    const [pending, setPending] = useState<PendingAction | null>(null);

    const accountsById = useMemo(
        () => new Map(state.accounts.map((account) => [account.id, account])),
        [state.accounts],
    );

    const agenciesById = useMemo(
        () => new Map(state.agencies.map((entry) => [entry.id, entry])),
        [state.agencies],
    );

    // Filter options come from the data, so the toolbar never offers an
    // Agency or a rating that matches nothing.
    const agencyOptions = useMemo(() => {
        const ids = Array.from(
            new Set(state.reviews.map((review) => review.agencyId)),
        ).sort((a, b) => a - b);

        return [
            { value: 'all', label: 'All Agencies' },
            ...ids.map((id) => ({
                value: String(id),
                label: agenciesById.get(id)?.agencyName ?? `Agency #${id}`,
            })),
        ];
    }, [state.reviews, agenciesById]);

    const ratingOptions = useMemo(() => {
        const ratings = Array.from(
            new Set(state.reviews.map((review) => review.rating)),
        ).sort((a, b) => b - a);

        return [
            { value: 'all', label: 'All ratings' },
            ...ratings.map((value) => ({
                value: String(value),
                label: `${value} star${value === 1 ? '' : 's'}`,
            })),
        ];
    }, [state.reviews]);

    const rows = useMemo(() => {
        const needle = q.trim().toLowerCase();

        const filtered = state.reviews.filter((review) => {
            const displayStatus = reviewDisplayStatus(review);

            if (status === 'all') {
                if (displayStatus === 'archived') {
                    return false;
                }
            } else if (displayStatus !== status) {
                return false;
            }

            if (agency !== 'all' && String(review.agencyId) !== agency) {
                return false;
            }

            if (rating !== 'all' && String(review.rating) !== rating) {
                return false;
            }

            if (needle === '') {
                return true;
            }

            const reviewer = accountsById.get(review.applicantUserId);
            const reviewed = agenciesById.get(review.agencyId);

            return [
                reviewer?.name ?? '',
                reviewer?.email ?? '',
                reviewed?.agencyName ?? '',
                review.reviewText ?? '',
            ].some((value) => value.toLowerCase().includes(needle));
        });

        return [...filtered].sort((a, b) => {
            if (sort === 'highest') {
                return (
                    b.rating - a.rating ||
                    b.createdAt.localeCompare(a.createdAt)
                );
            }

            if (sort === 'lowest') {
                return (
                    a.rating - b.rating ||
                    b.createdAt.localeCompare(a.createdAt)
                );
            }

            return b.createdAt.localeCompare(a.createdAt);
        });
    }, [
        state.reviews,
        accountsById,
        agenciesById,
        q,
        agency,
        rating,
        status,
        sort,
    ]);

    const stats = useMemo(() => {
        const live = state.reviews.filter(
            (review) => review.deletedAt === null,
        );
        const total = live.length;

        return {
            total,
            average: meanRating(live),
            fiveStarShare:
                total === 0
                    ? 0
                    : Math.round(
                          (live.filter((review) => review.rating === 5).length /
                              total) *
                              100,
                      ),
            unmoderated: live.filter(
                (review) => review.editedByModeratorAt === null,
            ).length,
        };
    }, [state.reviews]);

    useEffect(() => {
        setPage(1);
    }, [q, agency, rating, status, sort]);

    const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const pageRows = rows.slice(
        (currentPage - 1) * PER_PAGE,
        currentPage * PER_PAGE,
    );
    const pageIds = pageRows.map((review) => String(review.id));

    const isFiltered =
        q.trim() !== '' ||
        agency !== 'all' ||
        rating !== 'all' ||
        status !== 'all';

    const resetFilters = () => {
        setQ('');
        setAgency('all');
        setRating('all');
        setStatus('all');
        setPage(1);
    };

    const selectAllOnPage = () => selection.setMany(pageIds, true);

    function agencyNameOf(review: AgencyReviewRecord): string {
        return (
            agenciesById.get(review.agencyId)?.agencyName ??
            `Agency #${review.agencyId}`
        );
    }

    function reviewerNameOf(review: AgencyReviewRecord): string {
        return (
            accountsById.get(review.applicantUserId)?.name ??
            'Unknown applicant'
        );
    }

    function subjectLabelOf(review: AgencyReviewRecord): string {
        return `${reviewerNameOf(review)} on ${agencyNameOf(review)}`;
    }

    function openBulkArchive() {
        // Only live reviews can be archived; a stale tick on an already
        // archived row would otherwise promise a change that cannot happen.
        const targets = rows.filter(
            (review) =>
                selection.isSelected(String(review.id)) &&
                review.deletedAt === null,
        );

        if (targets.length === 0) {
            toast.info('Select at least one live review to archive.');
            return;
        }

        setPending({ kind: 'bulk-archive', reviews: targets });
    }

    function confirmPending() {
        if (!pending) {
            return;
        }

        if (pending.kind === 'bulk-archive') {
            const ids = pending.reviews.map((review) => review.id);
            const stamp = new Date().toISOString();
            const label = `${pending.reviews.length} reviews`;

            commitSystemChange({
                action: 'archive',
                subjectType: 'review',
                subjectId: ids.join(','),
                subjectLabel: label,
                changes: [{ field: 'Archived', from: false, to: true }],
                apply: (current) => ({
                    ...current,
                    reviews: current.reviews.map((entry) =>
                        ids.includes(entry.id) && entry.deletedAt === null
                            ? { ...entry, deletedAt: stamp }
                            : entry,
                    ),
                }),
            });

            toast.success(`${label} archived.`, {
                duration: 6000,
                action: {
                    label: 'Undo',
                    onClick: () => {
                        updateSystemState((current) => ({
                            ...current,
                            reviews: current.reviews.map((entry) =>
                                ids.includes(entry.id)
                                    ? { ...entry, deletedAt: null }
                                    : entry,
                            ),
                        }));
                        popAuditEntry();
                    },
                },
            });

            selection.clear();
            setPending(null);
            return;
        }

        const { review, kind } = pending;
        const subjectLabel = subjectLabelOf(review);

        if (kind === 'archive') {
            mutateReview(review, {
                action: 'archive',
                subjectLabel,
                changes: [{ field: 'Archived', from: false, to: true }],
                patch: { deletedAt: new Date().toISOString() },
                undo: { deletedAt: review.deletedAt },
                message: `Review by ${reviewerNameOf(review)} archived.`,
            });
        } else {
            mutateReview(review, {
                action: 'restore',
                subjectLabel,
                changes: [{ field: 'Archived', from: true, to: false }],
                patch: { deletedAt: null },
                undo: { deletedAt: review.deletedAt },
                message: `Review by ${reviewerNameOf(review)} restored.`,
            });
        }

        setPending(null);
    }

    function dialogCopy(action: PendingAction): DialogCopy {
        if (action.kind === 'bulk-archive') {
            const agencyIds = new Set(
                action.reviews.map((review) => review.agencyId),
            );

            return {
                title: `Archive ${action.reviews.length} reviews?`,
                description: 'They leave the Reviews list straight away.',
                consequences: [
                    `${agencyIds.size} ${agencyIds.size === 1 ? 'Agency sees' : 'Agencies see'} their average rating recalculated from the reviews that stay live.`,
                    'Each applicant’s one-review-per-Agency slot is freed, so they can review again.',
                    'Restore them at any time from the Archived filter.',
                ],
                confirmLabel: 'Archive reviews',
                destructive: true,
                testId: 'confirm-review-bulk-archive',
            };
        }

        const { review, kind } = action;
        const agencyName = agencyNameOf(review);
        const liveSiblings = state.reviews.filter(
            (entry) =>
                entry.agencyId === review.agencyId && entry.deletedAt === null,
        );

        if (kind === 'archive') {
            const remaining = liveSiblings.filter(
                (entry) => entry.id !== review.id,
            );
            const remainingAvg = meanRating(remaining);
            const currentAvg = meanRating(liveSiblings);

            return {
                title: 'Archive this review?',
                description: `${reviewerNameOf(review)}’s ${review.rating}-star review of ${agencyName} disappears from every list straight away.`,
                consequences: [
                    `${agencyName} currently averages ${currentAvg === null ? 'no rating' : `${currentAvg.toFixed(1)} out of 5`} across ${liveSiblings.length} live ${liveSiblings.length === 1 ? 'review' : 'reviews'}.`,
                    remaining.length === 0
                        ? `It would keep no live reviews, so ${agencyName} shows no rating at all.`
                        : `It would keep ${remaining.length} live ${remaining.length === 1 ? 'review' : 'reviews'}, averaging ${remainingAvg?.toFixed(1) ?? '—'} out of 5.`,
                    'It frees the applicant’s one-review-per-Agency slot, so they can review again.',
                    'Restore it at any time from the Archived filter.',
                ],
                confirmLabel: 'Archive',
                destructive: true,
                testId: 'confirm-review-archive',
            };
        }

        const restoredCount = liveSiblings.length + 1;
        const currentAvg = agencyRating(state, review.agencyId);
        const restoredAvg = meanRating([...liveSiblings, review]);

        return {
            title: 'Restore this review?',
            description: `${reviewerNameOf(review)}’s ${review.rating}-star review of ${agencyName} returns to every list.`,
            consequences: [
                `${agencyName} currently averages ${currentAvg === null ? 'no rating' : `${currentAvg.toFixed(1)} out of 5`}.`,
                `This review would take it to ${restoredCount} live ${restoredCount === 1 ? 'review' : 'reviews'}, averaging ${restoredAvg?.toFixed(1) ?? '—'} out of 5.`,
                'It takes the applicant’s one-review-per-Agency slot once more.',
            ],
            confirmLabel: 'Restore',
            destructive: false,
            testId: 'confirm-review-restore',
        };
    }

    function rowMenu(review: AgencyReviewRecord) {
        const actions: SystemRowAction[] = [
            {
                label: 'View details',
                icon: Eye,
                testId: 'menu-view-review',
                onSelect: () => setViewing(review),
            },
        ];

        if (review.deletedAt !== null) {
            actions.push({
                label: 'Restore review',
                icon: ArchiveRestore,
                testId: 'menu-restore-review',
                onSelect: () => setPending({ kind: 'restore', review }),
            });
        } else {
            actions.push({
                label: 'Edit review',
                icon: Pencil,
                testId: 'menu-edit-review',
                onSelect: () => setEditing(review),
            });
            actions.push({
                label: 'Archive review',
                icon: Archive,
                destructive: true,
                hint: 'Archived reviews leave every list',
                testId: 'menu-archive-review',
                onSelect: () => setPending({ kind: 'archive', review }),
            });
        }

        return (
            <SystemRowMenu
                actions={actions}
                label={`Actions for the review by ${reviewerNameOf(review)}`}
                testId={`row-menu-review-${review.id}`}
            />
        );
    }

    const columns: Column<AgencyReviewRecord>[] = [
        {
            key: 'select',
            header: 'Select',
            width: '84px',
            headerClassName: 'px-3',
            cell: (review) => (
                <Checkbox
                    checked={selection.isSelected(String(review.id))}
                    onCheckedChange={() => selection.toggle(String(review.id))}
                    aria-label={`Select the review by ${reviewerNameOf(review)}`}
                    data-testid={`checkbox-review-${review.id}`}
                />
            ),
        },
        {
            key: 'reviewer',
            header: 'Reviewer',
            cell: (review) => {
                const reviewer = accountsById.get(review.applicantUserId);

                return (
                    <div className="min-w-0">
                        <Link
                            href={applicantShow({
                                applicant: review.applicantUserId,
                            })}
                            data-testid={`link-applicant-${review.id}`}
                            className="block truncate font-medium text-[var(--navy)] transition-colors hover:text-[var(--teal-ink)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
                        >
                            {reviewer?.name ?? 'Unknown applicant'}
                        </Link>
                        <span className="block truncate text-xs text-[var(--slate)]">
                            {reviewer?.email ?? 'No account on file'}
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'agency',
            header: 'Agency',
            width: '22%',
            cell: (review) => {
                const reviewed = agenciesById.get(review.agencyId);

                return (
                    <div className="min-w-0">
                        <Link
                            href={agencyShow({ agency: review.agencyId })}
                            data-testid={`link-agency-${review.id}`}
                            className="block truncate font-medium text-[var(--navy)] transition-colors hover:text-[var(--teal-ink)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
                        >
                            {reviewed?.agencyName ??
                                `Agency #${review.agencyId}`}
                        </Link>
                        {reviewed && (
                            <span className="block truncate text-xs text-[var(--slate)]">
                                {reviewed.headquartersCity}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'rating',
            header: 'Rating',
            width: '150px',
            cell: (review) => (
                <span className="flex items-center gap-2">
                    <StarRating
                        rating={review.rating}
                        size={13}
                        testId={`stars-review-${review.id}`}
                    />
                    <span className="text-sm font-semibold text-[var(--navy)] tabular-nums">
                        {review.rating} / 5
                    </span>
                </span>
            ),
        },
        {
            key: 'review',
            header: 'Review',
            cell: (review) =>
                review.reviewText === null ? (
                    <span className="text-xs text-[var(--slate)] italic">
                        Rating only — no text
                    </span>
                ) : (
                    <span
                        className="block max-w-[32rem] truncate text-sm text-[var(--slate)]"
                        title={review.reviewText}
                    >
                        {review.reviewText}
                    </span>
                ),
        },
        {
            key: 'date',
            header: 'Date',
            width: '130px',
            className: 'whitespace-nowrap',
            cell: (review) => (
                <span
                    className="block text-sm text-[var(--navy)]"
                    title={reviewStamp.format(new Date(review.createdAt))}
                >
                    {reviewDate.format(new Date(review.createdAt))}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            width: '140px',
            cell: (review) => {
                const displayStatus = reviewDisplayStatus(review);

                return (
                    <StatusPill
                        tone={STATUS_TONE[displayStatus]}
                        dot
                        data-testid={`status-review-${review.id}`}
                    >
                        {STATUS_LABELS[displayStatus]}
                    </StatusPill>
                );
            },
        },
    ];

    const copy = pending ? dialogCopy(pending) : null;

    const kpis: {
        label: string;
        value: number | string;
        caption: string;
        icon: KpiCardProps['icon'];
        tone: KpiCardProps['tone'];
        testId: string;
    }[] = [
        {
            label: 'Average rating',
            value:
                stats.average === null
                    ? '—'
                    : `${stats.average.toFixed(1)} / 5`,
            caption:
                stats.total === 0
                    ? 'No live reviews yet'
                    : `Across ${stats.total} live reviews`,
            icon: Star,
            tone: 'amber',
            testId: 'kpi-reviews-average',
        },
        {
            label: 'Live reviews',
            value: stats.total,
            caption: 'Not archived',
            icon: MessageSquareText,
            tone: 'blue',
            testId: 'kpi-reviews-total',
        },
        {
            label: '5-star share',
            value: `${stats.fiveStarShare}%`,
            caption: 'Of live reviews',
            icon: Sparkles,
            tone: 'teal',
            testId: 'kpi-reviews-five-star',
        },
        {
            label: 'Unmoderated',
            value: stats.unmoderated,
            caption: 'Never edited by a moderator',
            icon: ShieldQuestion,
            tone: 'violet',
            testId: 'kpi-reviews-unmoderated',
        },
    ];

    return (
        <>
            <Head title="Reviews" />

            <SystemPage>
                <SystemPageHeader
                    title="Reviews"
                    subtitle="What Applicants say about each Agency, and the moderation state of every review."
                    data-testid="header-reviews"
                />

                <KpiGrid>
                    {kpis.map((kpi) => (
                        <KpiCard
                            key={kpi.testId}
                            label={kpi.label}
                            value={kpi.value}
                            caption={kpi.caption}
                            icon={kpi.icon}
                            tone={kpi.tone}
                            data-testid={kpi.testId}
                        />
                    ))}
                </KpiGrid>

                {isFiltered && (
                    <div className="flex flex-wrap items-center gap-2">
                        {q.trim() !== '' && (
                            <FilterChip
                                label="Search"
                                value={q.trim()}
                                onRemove={() => setQ('')}
                                testId="chip-search"
                            />
                        )}
                        {agency !== 'all' && (
                            <FilterChip
                                label="Agency"
                                value={
                                    agenciesById.get(Number(agency))
                                        ?.agencyName ?? `Agency #${agency}`
                                }
                                onRemove={() => setAgency('all')}
                                testId="chip-agency"
                            />
                        )}
                        {rating !== 'all' && (
                            <FilterChip
                                label="Rating"
                                value={`${rating} star${rating === '1' ? '' : 's'}`}
                                onRemove={() => setRating('all')}
                                testId="chip-rating"
                            />
                        )}
                        {status !== 'all' && (
                            <FilterChip
                                label="Status"
                                value={STATUS_LABELS[status]}
                                onRemove={() => setStatus('all')}
                                testId="chip-status"
                            />
                        )}
                        <Button
                            variant="link"
                            size="sm"
                            onClick={resetFilters}
                            data-testid="button-clear-filters"
                        >
                            Clear all
                        </Button>
                    </div>
                )}

                <DataTable<AgencyReviewRecord>
                    columns={columns}
                    data={pageRows}
                    getRowId={(review) => String(review.id)}
                    getRowTestId={(review) => `row-review-${review.id}`}
                    getRowAccent={(review) =>
                        ACCENT[reviewDisplayStatus(review)]
                    }
                    renderRowActions={rowMenu}
                    toolbar={
                        <DataTableToolbar data-testid="reviews-table-toolbar">
                            <BulkBar
                                count={selection.count}
                                label="reviews"
                                onClear={selection.clear}
                            >
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={selectAllOnPage}
                                    data-testid="button-bulk-select-all"
                                >
                                    Select this page
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={openBulkArchive}
                                    data-testid="button-bulk-archive"
                                >
                                    <Archive
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Archive selected
                                </Button>
                            </BulkBar>

                            <DataTableField
                                label="Search"
                                htmlFor="filter-review-search"
                                className="basis-full sm:min-w-64 sm:flex-1 sm:basis-auto"
                            >
                                <DataTableSearch
                                    id="filter-review-search"
                                    value={q}
                                    onChange={setQ}
                                    placeholder="Search reviewer, Agency or review text..."
                                    className="w-full"
                                    data-testid="input-search-reviews"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Agency"
                                htmlFor="filter-review-agency"
                            >
                                <DataTableSelect
                                    id="filter-review-agency"
                                    value={agency}
                                    onValueChange={setAgency}
                                    options={agencyOptions}
                                    ariaLabel="Filter by Agency"
                                    data-testid="select-review-agency"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Rating"
                                htmlFor="filter-review-rating"
                            >
                                <DataTableSelect
                                    id="filter-review-rating"
                                    value={rating}
                                    onValueChange={setRating}
                                    options={ratingOptions}
                                    ariaLabel="Filter by rating"
                                    data-testid="select-review-rating"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Status"
                                htmlFor="filter-review-status"
                            >
                                <DataTableSelect<StatusFilter>
                                    id="filter-review-status"
                                    value={status}
                                    onValueChange={setStatus}
                                    options={STATUS_OPTIONS}
                                    ariaLabel="Filter by status"
                                    data-testid="select-review-status"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Sort by"
                                htmlFor="filter-review-sort"
                            >
                                <DataTableSelect<SortKey>
                                    id="filter-review-sort"
                                    value={sort}
                                    onValueChange={setSort}
                                    options={SORT_OPTIONS}
                                    ariaLabel="Sort reviews"
                                    data-testid="select-review-sort"
                                />
                            </DataTableField>
                            <DataTableRefreshButton
                                onClick={resetFilters}
                                data-testid="button-refresh-reviews"
                            />
                        </DataTableToolbar>
                    }
                    pagination={{
                        page: currentPage,
                        totalPages,
                        onPageChange: setPage,
                        alwaysShow: true,
                        label: 'Reviews pagination',
                        testIdPrefix: 'reviews-pagination',
                    }}
                    emptyState={
                        <DashboardEmptyState
                            icon={isFiltered ? SearchX : MessageSquareText}
                            title={
                                isFiltered
                                    ? 'No reviews match your filters'
                                    : 'No reviews yet'
                            }
                            message={
                                isFiltered
                                    ? 'Try a different Agency, rating or status.'
                                    : 'Applicants’ reviews of Agencies will appear here.'
                            }
                            onReset={isFiltered ? resetFilters : undefined}
                        />
                    }
                    data-testid="table-reviews"
                />
            </SystemPage>

            {viewing && (
                <ReviewDetailSheet
                    review={viewing}
                    reviewer={accountsById.get(viewing.applicantUserId)}
                    agency={agenciesById.get(viewing.agencyId)}
                    onClose={() => setViewing(null)}
                />
            )}

            {editing && (
                <ReviewEditSheet
                    key={editing.id}
                    review={editing}
                    subjectLabel={subjectLabelOf(editing)}
                    reviewerName={reviewerNameOf(editing)}
                    onClose={() => setEditing(null)}
                />
            )}

            {copy && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setPending(null);
                        }
                    }}
                    title={copy.title}
                    description={copy.description}
                    consequences={copy.consequences}
                    confirmLabel={copy.confirmLabel}
                    destructive={copy.destructive}
                    data-testid={copy.testId}
                    onConfirm={confirmPending}
                />
            )}
        </>
    );
}

SystemReviews.layout = {
    breadcrumbs: [
        {
            title: 'Reviews',
            href: system.reviews(),
        },
    ],
};
