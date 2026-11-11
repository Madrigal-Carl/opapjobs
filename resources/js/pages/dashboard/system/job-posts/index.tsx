import { Head, Link, router } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    BriefcaseBusiness,
    CalendarClock,
    CalendarX2,
    CircleCheck,
    CircleX,
    Clock,
    Eye,
    Pencil,
    RotateCcw,
    SearchX,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { StatusPillTone } from '@/components/dashboard/badges';
import {
    ClosingSoonBadge,
    PathwayBadge,
    StatusPill,
    UrgentBadge,
} from '@/components/dashboard/badges';
import { DashboardEmptyState } from '@/components/dashboard/empty-state';
import { FilterChip } from '@/components/dashboard/filter-chip';
import { KpiCard, KpiGrid } from '@/components/system/system-kpi-card';
import { SystemPage } from '@/components/system/system-page';
import type { Column } from '@/components/dashboard/data-table';
import {
    DataTable,
    DataTableField,
    DataTableRefreshButton,
    DataTableSearch,
    DataTableSelect,
    DataTableToolbar,
} from '@/components/dashboard/data-table';
import InputError from '@/components/input-error';
import { BulkBar } from '@/components/system/bulk-bar';
import { ConfirmDialog } from '@/components/system/confirm-dialog';
import {
    EntitySheet,
    SheetSaveActions,
} from '@/components/system/entity-sheet';
import { LockedField } from '@/components/system/locked-field';
import { SystemPageHeader } from '@/components/system/system-page-header';
import type { SystemRowAction } from '@/components/system/system-row-menu';
import { SystemRowMenu } from '@/components/system/system-row-menu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useFormChanges } from '@/hooks/use-form-changes';
import { useRowSelection } from '@/hooks/use-row-selection';
import type { SystemState } from '@/data/system/store';
import {
    commitSystemChange,
    popAuditEntry,
    updateSystemState,
    useSystemState,
} from '@/data/system/store';
import {
    DISPLAY_STATUS_LABELS,
    jobPostDisplayStatus,
    reopeningNeedsNewDate,
    todayIso,
    visibleAgencies,
} from '@/data/system/selectors';
import type {
    AgencyRecord,
    AuditChange,
    JobPostRecord,
    JobPostStatus,
    RecruitmentType,
} from '@/data/system/types';
import type { JobPostDisplayStatus } from '@/types/job-post';
import type { Pathway } from '@/types/agency';
import * as system from '@/routes/dashboard/system';
import {
    create as jobPostCreate,
    show as jobPostShow,
} from '@/routes/dashboard/system/job-posts';
import { show as agencyShow } from '@/routes/dashboard/system/agencies';

/**
 * Job posts, every post on the platform in one list (§8.2).
 *
 * The one screen a superadmin lands on for this entity: search by title or
 * work location, status/Agency/pathway filters, a sort, bulk close, and a
 * row menu offering only the reversible verbs. Detail and creation live on
 * their own routes (`/job-posts/{id}` and `/job-posts/new`) so they can be
 * linked to and reloaded; everything here is derived from the in-memory
 * store, so a browser refresh resets it.
 *
 * The stored status is only ever `pending | closed | archived` — `active`
 * and `expired` are derived from the closing date, so the operator always
 * sees the *display* status. Archived posts leave every list until the
 * Archived filter is chosen, which is why the default filter is labelled
 * "Active, expired and closed" rather than "All statuses".
 */

const PER_PAGE = 8;

type StatusFilter = 'all' | JobPostDisplayStatus;
type PathwayFilter = 'all' | Pathway;
type SortKey = 'newest' | 'oldest' | 'closing' | 'title';

/**
 * Pill tone per *display* status. `JOB_POST_STATUS_TONE` in the selectors
 * is keyed by the stored status and typed `string`, so this screen builds
 * its own map limited to `StatusPill`'s tones.
 */
const STATUS_TONE: Record<JobPostDisplayStatus, StatusPillTone> = {
    active: 'success',
    expired: 'warning',
    closed: 'danger',
    archived: 'neutral',
};

const ACCENT: Record<
    JobPostDisplayStatus,
    'teal' | 'amber' | 'navy' | 'neutral'
> = {
    active: 'teal',
    expired: 'amber',
    closed: 'navy',
    archived: 'neutral',
};

const RECRUITMENT_LABELS: Record<RecruitmentType, string> = {
    joborder: 'Job order',
    manpooling: 'Manpooling',
};

/* `all` deliberately excludes archived — archive hides a record from lists. */
const STATUS_OPTIONS = [
    { value: 'all', label: 'Active, expired and closed' },
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'closed', label: 'Closed' },
    { value: 'archived', label: 'Archived' },
];

const PATHWAY_OPTIONS = [
    { value: 'all', label: 'All pathways' },
    { value: 'landbased', label: 'Land-based' },
    { value: 'seabased', label: 'Sea-based' },
];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'closing', label: 'Closing date' },
    { value: 'title', label: 'Title A–Z' },
];

const dateFormat = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

function plural(count: number, noun: string): string {
    return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

function pathwayLabel(pathway: Pathway): string {
    return pathway === 'landbased' ? 'Land-based' : 'Sea-based';
}

/** Formats an ISO date or timestamp as "Dec 31, 2026" without a TZ shift. */
function formatDate(value: string): string {
    return dateFormat.format(
        new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value),
    );
}

/** Adds whole days to a `YYYY-MM-DD` string, staying in UTC. */
function addDays(iso: string, days: number): string {
    const date = new Date(`${iso}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);

    return date.toISOString().slice(0, 10);
}

/**
 * An open post closing within the next seven days (inclusive). Only a
 * `pending` post can be "closing soon" — closed and archived posts are not
 * accepting applications whatever their date says.
 */
function isClosingSoon(post: JobPostRecord, today: string): boolean {
    return (
        post.status === 'pending' &&
        post.closingDate !== null &&
        post.closingDate >= today &&
        post.closingDate <= addDays(today, 7)
    );
}

function agencyOf(
    state: SystemState,
    post: JobPostRecord,
): AgencyRecord | undefined {
    return state.agencies.find((agency) => agency.id === post.agencyId);
}

/** Applications already submitted to one job post. */
function applicationsOn(state: SystemState, jobPostId: number): number {
    return state.applications.filter(
        (application) => application.jobPostId === jobPostId,
    ).length;
}

type PendingAction =
    | {
          kind: 'close' | 'reopen' | 'archive' | 'restore';
          post: JobPostRecord;
      }
    | { kind: 'bulk-close'; posts: JobPostRecord[] };

/**
 * Applies a patch to one job post, writes its audit row, and offers Undo.
 *
 * Undo does not commit a second audit entry — it restores the record's own
 * field values (numbers, nulls and enums, never a string draft) and drops
 * the entry this call just wrote, so a change that was reversed within the
 * toast's window never appears to have happened.
 */
function mutateJobPost(
    post: JobPostRecord,
    options: {
        action: string;
        changes: AuditChange[];
        patch: Partial<JobPostRecord>;
        undo: Partial<JobPostRecord>;
        message: string;
    },
): void {
    commitSystemChange({
        action: options.action,
        subjectType: 'job_post',
        subjectId: post.id,
        subjectLabel: post.jobTitle,
        changes: options.changes,
        apply: (current) => ({
            ...current,
            jobPosts: current.jobPosts.map((entry) =>
                entry.id === post.id ? { ...entry, ...options.patch } : entry,
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
                    jobPosts: current.jobPosts.map((entry) =>
                        entry.id === post.id
                            ? { ...entry, ...options.undo }
                            : entry,
                    ),
                }));
                popAuditEntry();
            },
        },
    });
}

type JobPostEditValues = {
    jobTitle: string;
    workLocation: string;
    /** `YYYY-MM-DD`, empty string means "no closing date". */
    closingDate: string;
    isUrgent: boolean;
};

type JobPostEditErrors = {
    jobTitle: string | null;
    workLocation: string | null;
    closingDate: string | null;
};

/**
 * Create/edit sheet for one job post, with dirty tracking and inline errors.
 *
 * Only the fields a superadmin may change in place are editable. Status is
 * deliberately not one of them: close, reopen, archive and restore each go
 * through the row menu so every transition is confirmed and audited.
 */
function JobPostEditSheet({
    post,
    state,
    today,
    onClose,
}: {
    post: JobPostRecord;
    state: SystemState;
    today: string;
    onClose: () => void;
}) {
    const { values, setValue, isDirty } = useFormChanges<JobPostEditValues>({
        jobTitle: post.jobTitle,
        workLocation: post.workLocation,
        closingDate: post.closingDate ?? '',
        isUrgent: post.isUrgent,
    });
    const [errors, setErrors] = useState<JobPostEditErrors>({
        jobTitle: null,
        workLocation: null,
        closingDate: null,
    });

    const agency = agencyOf(state, post);
    const display = jobPostDisplayStatus(post, today);

    const notice =
        display === 'expired'
            ? 'This job post is Expired. Set a new closing date to make it Active again.'
            : post.status === 'closed' && reopeningNeedsNewDate(post, today)
              ? 'Reopening this job post requires a future closing date. Set one here, then reopen it from the row menu.'
              : null;

    const clearError = (key: keyof JobPostEditErrors) => {
        setErrors((current) =>
            current[key] === null ? current : { ...current, [key]: null },
        );
    };

    function save() {
        const jobTitle = values.jobTitle.trim();
        const workLocation = values.workLocation.trim();
        const closingDate =
            values.closingDate === '' ? null : values.closingDate;

        const nextErrors: JobPostEditErrors = {
            jobTitle: jobTitle === '' ? 'Enter a job title.' : null,
            workLocation: workLocation === '' ? 'Enter a work location.' : null,
            closingDate:
                closingDate !== null && closingDate < today
                    ? 'Pick today or a future date — a past date would show the job post as Expired straight away.'
                    : null,
        };

        setErrors(nextErrors);

        if (
            nextErrors.jobTitle !== null ||
            nextErrors.workLocation !== null ||
            nextErrors.closingDate !== null
        ) {
            return;
        }

        const changes: AuditChange[] = [];

        if (jobTitle !== post.jobTitle) {
            changes.push({
                field: 'Job title',
                from: post.jobTitle,
                to: jobTitle,
            });
        }

        if (workLocation !== post.workLocation) {
            changes.push({
                field: 'Work location',
                from: post.workLocation,
                to: workLocation,
            });
        }

        if (closingDate !== post.closingDate) {
            changes.push({
                field: 'Closing date',
                from: post.closingDate,
                to: closingDate,
            });
        }

        if (values.isUrgent !== post.isUrgent) {
            changes.push({
                field: 'Urgent',
                from: post.isUrgent,
                to: values.isUrgent,
            });
        }

        if (changes.length === 0) {
            onClose();
            return;
        }

        mutateJobPost(post, {
            action: 'update',
            changes,
            patch: {
                jobTitle,
                workLocation,
                closingDate,
                isUrgent: values.isUrgent,
            },
            undo: {
                jobTitle: post.jobTitle,
                workLocation: post.workLocation,
                closingDate: post.closingDate,
                isUrgent: post.isUrgent,
            },
            message: `“${jobTitle}” updated.`,
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
            title="Edit job post"
            description={`Change the details of “${post.jobTitle}”. Close, reopen, archive and restore live in the row menu so every status change is audited.`}
            size="wide"
            data-testid="sheet-job-post-edit"
            footer={
                <SheetSaveActions
                    onCancel={onClose}
                    onSave={save}
                    saveLabel="Save changes"
                    saveDisabled={!isDirty}
                    data-testid="sheet-save-job-post"
                />
            }
        >
            <DataTableField label="Job title" htmlFor="job-post-title">
                <Input
                    id="job-post-title"
                    value={values.jobTitle}
                    onChange={(event) => {
                        clearError('jobTitle');
                        setValue('jobTitle', event.target.value);
                    }}
                    placeholder="e.g. Registered Nurse"
                    autoComplete="off"
                    data-testid="input-job-post-title"
                />
                <InputError
                    message={errors.jobTitle ?? undefined}
                    data-testid="error-job-post-title"
                />
            </DataTableField>

            <DataTableField label="Work location" htmlFor="job-post-location">
                <Input
                    id="job-post-location"
                    value={values.workLocation}
                    onChange={(event) => {
                        clearError('workLocation');
                        setValue('workLocation', event.target.value);
                    }}
                    placeholder="e.g. Abu Dhabi, UAE"
                    autoComplete="off"
                    data-testid="input-job-post-location"
                />
                <InputError
                    message={errors.workLocation ?? undefined}
                    data-testid="error-job-post-location"
                />
            </DataTableField>

            <DataTableField
                label="Closing date"
                htmlFor="job-post-closing-date"
            >
                <Input
                    id="job-post-closing-date"
                    type="date"
                    value={values.closingDate}
                    min={today}
                    onChange={(event) => {
                        clearError('closingDate');
                        setValue('closingDate', event.target.value);
                    }}
                    data-testid="input-job-post-closing-date"
                />
                <InputError
                    message={errors.closingDate ?? undefined}
                    data-testid="error-job-post-closing-date"
                />
                <p className="text-xs text-[var(--slate)]">
                    {post.closingDate === null
                        ? 'A job post with no closing date stays Active until you close it.'
                        : 'Leave empty to clear the closing date — the job post then never expires.'}
                </p>
            </DataTableField>

            <div className="flex items-center gap-3">
                <Checkbox
                    id="job-post-urgent"
                    checked={values.isUrgent}
                    onCheckedChange={(checked) =>
                        setValue('isUrgent', checked === true)
                    }
                    data-testid="checkbox-job-post-urgent"
                />
                <label
                    htmlFor="job-post-urgent"
                    className="text-sm font-medium text-[var(--navy)]"
                >
                    Urgent — highlighted to applicants
                </label>
            </div>

            {notice && (
                <p
                    className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--navy)]"
                    data-testid="note-job-post-status"
                >
                    {notice}
                </p>
            )}

            <LockedField
                label="Agency"
                value={
                    agency === undefined
                        ? 'Agency not found'
                        : `${agency.agencyName} · ${pathwayLabel(agency.pathway)}`
                }
                reason="A job post is filed under its Agency's pathway — change the Agency from its own screen."
                data-testid="locked-agency"
            />

            <LockedField
                label="Recruitment type"
                value={RECRUITMENT_LABELS[post.recruitmentType]}
                reason="Fixed when the job post is created so its screening rules stay consistent."
                data-testid="locked-recruitment-type"
            />

            <LockedField
                label="Status"
                value={DISPLAY_STATUS_LABELS[display]}
                reason="Close, reopen, archive and restore from the row menu so every change is confirmed and audited."
                data-testid="locked-status"
            />
        </EntitySheet>
    );
}

export default function SystemJobPosts() {
    const state = useSystemState();
    const selection = useRowSelection();
    const today = todayIso();

    const [q, setQ] = useState('');
    const [status, setStatus] = useState<StatusFilter>('all');
    const [agency, setAgency] = useState('all');
    const [pathway, setPathway] = useState<PathwayFilter>('all');
    const [sort, setSort] = useState<SortKey>('newest');
    const [page, setPage] = useState(1);
    const [pending, setPending] = useState<PendingAction | null>(null);
    const [editId, setEditId] = useState<number | null>(null);

    useEffect(() => {
        setPage(1);
    }, [q, status, agency, pathway, sort]);

    const rows = useMemo(() => {
        const needle = q.trim().toLowerCase();

        const filtered = state.jobPosts.filter((post) => {
            const displayStatus = jobPostDisplayStatus(post, today);

            if (status === 'all') {
                if (displayStatus === 'archived') {
                    return false;
                }
            } else if (displayStatus !== status) {
                return false;
            }

            if (agency !== 'all' && String(post.agencyId) !== agency) {
                return false;
            }

            if (pathway !== 'all') {
                const own = state.agencies.find(
                    (entry) => entry.id === post.agencyId,
                );

                if (own === undefined || own.pathway !== pathway) {
                    return false;
                }
            }

            if (needle === '') {
                return true;
            }

            return [post.jobTitle, post.workLocation].some((value) =>
                value.toLowerCase().includes(needle),
            );
        });

        return [...filtered].sort((a, b) => {
            if (sort === 'oldest') {
                return a.createdAt.localeCompare(b.createdAt);
            }

            if (sort === 'title') {
                return a.jobTitle.localeCompare(b.jobTitle);
            }

            if (sort === 'closing') {
                const aDate = a.closingDate ?? '9999-12-31';
                const bDate = b.closingDate ?? '9999-12-31';

                return aDate.localeCompare(bDate);
            }

            return b.createdAt.localeCompare(a.createdAt);
        });
    }, [state, q, status, agency, pathway, sort, today]);

    const stats = useMemo(() => {
        const live = state.jobPosts.filter(
            (post) => jobPostDisplayStatus(post, today) !== 'archived',
        );

        return {
            total: live.length,
            active: live.filter(
                (post) => jobPostDisplayStatus(post, today) === 'active',
            ).length,
            closingSoon: live.filter((post) => isClosingSoon(post, today))
                .length,
            expired: live.filter(
                (post) => jobPostDisplayStatus(post, today) === 'expired',
            ).length,
        };
    }, [state, today]);

    const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    const pageRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const pageIds = pageRows
        .filter((post) => post.status !== 'archived')
        .map((post) => String(post.id));

    const isFiltered =
        q.trim() !== '' ||
        status !== 'all' ||
        agency !== 'all' ||
        pathway !== 'all';

    const resetFilters = () => {
        setQ('');
        setStatus('all');
        setAgency('all');
        setPathway('all');
        setPage(1);
    };

    const selectAllOnPage = () => selection.setMany(pageIds, true);

    const editRecord =
        editId === null
            ? null
            : (state.jobPosts.find((post) => post.id === editId) ?? null);

    function openBulkClose() {
        const selected = rows.filter((post) =>
            selection.isSelected(String(post.id)),
        );

        if (selected.length === 0) {
            return;
        }

        setPending({ kind: 'bulk-close', posts: selected });
    }

    function confirmPending() {
        if (!pending) {
            return;
        }

        if (pending.kind === 'bulk-close') {
            const closable = pending.posts.filter(
                (post) => post.status === 'pending',
            );
            const ids = closable.map((post) => post.id);
            const label = plural(closable.length, 'job post');

            if (ids.length > 0) {
                // Undo restores each record's own status, not a string form.
                const undoStatus = new Map<number, JobPostStatus>(
                    closable.map((post) => [post.id, post.status]),
                );

                commitSystemChange({
                    action: 'close',
                    subjectType: 'job_post',
                    subjectId: ids.join(','),
                    subjectLabel: label,
                    changes: [{ field: 'Closed', from: false, to: true }],
                    apply: (current) => ({
                        ...current,
                        jobPosts: current.jobPosts.map((entry) =>
                            ids.includes(entry.id)
                                ? { ...entry, status: 'closed' }
                                : entry,
                        ),
                    }),
                });

                toast.success(`${label} closed.`, {
                    duration: 6000,
                    action: {
                        label: 'Undo',
                        onClick: () => {
                            updateSystemState((current) => ({
                                ...current,
                                jobPosts: current.jobPosts.map((entry) => {
                                    const prior = undoStatus.get(entry.id);

                                    return prior === undefined
                                        ? entry
                                        : { ...entry, status: prior };
                                }),
                            }));
                            popAuditEntry();
                        },
                    },
                });
            } else {
                toast.info('Those job posts are already closed.');
            }

            selection.clear();
            setPending(null);
            return;
        }

        const { post, kind } = pending;

        if (kind === 'close') {
            mutateJobPost(post, {
                action: 'close',
                changes: [{ field: 'Closed', from: false, to: true }],
                patch: { status: 'closed' },
                undo: { status: post.status },
                message: `“${post.jobTitle}” closed.`,
            });
        } else if (kind === 'reopen') {
            mutateJobPost(post, {
                action: 'reopen',
                changes: [{ field: 'Closed', from: true, to: false }],
                patch: { status: 'pending' },
                undo: { status: post.status },
                message: `“${post.jobTitle}” reopened.`,
            });
        } else if (kind === 'archive') {
            mutateJobPost(post, {
                action: 'archive',
                changes: [{ field: 'Archived', from: false, to: true }],
                patch: { status: 'archived' },
                undo: { status: post.status },
                message: `“${post.jobTitle}” archived.`,
            });
        } else {
            mutateJobPost(post, {
                action: 'restore',
                changes: [{ field: 'Archived', from: true, to: false }],
                patch: { status: 'pending' },
                undo: { status: post.status },
                message: `“${post.jobTitle}” restored.`,
            });
        }

        setPending(null);
    }

    function dialogCopy(action: PendingAction) {
        if (action.kind === 'bulk-close') {
            const closable = action.posts.filter(
                (post) => post.status === 'pending',
            );
            const alreadyClosed = action.posts.length - closable.length;
            const applications = closable.reduce(
                (sum, post) => sum + applicationsOn(state, post.id),
                0,
            );

            return {
                title: `Close ${plural(action.posts.length, 'job post')}?`,
                description:
                    'The selected job posts stop accepting applications straight away.',
                consequences: [
                    `${plural(closable.length, 'job post')} move${closable.length === 1 ? 's' : ''} to Closed.`,
                    `${plural(applications, 'application')} already submitted stay readable with their stage unchanged.`,
                    alreadyClosed > 0
                        ? `${plural(alreadyClosed, 'job post')} in the selection ${alreadyClosed === 1 ? 'is' : 'are'} already closed and will be left as it is.`
                        : 'Each one can be reopened at any time from the Closed filter.',
                ],
                confirmLabel: 'Close job posts',
                destructive: true,
                testId: 'confirm-job-post-bulk-close',
            };
        }

        const { post, kind } = action;
        const applications = applicationsOn(state, post.id);
        const applicationsLine = `${plural(applications, 'application')} already submitted stay readable with their stage unchanged.`;

        if (kind === 'close') {
            return {
                title: 'Close this job post?',
                description: `“${post.jobTitle}” stops accepting applications straight away.`,
                consequences: [
                    applicationsLine,
                    'Its display status becomes Closed straight away.',
                    'Reopen it at any time — reopening asks for a new closing date if the current one has passed.',
                ],
                confirmLabel: 'Close job post',
                destructive: true,
                testId: 'confirm-job-post-close',
            };
        }

        if (kind === 'reopen') {
            const closingLine =
                post.closingDate === null
                    ? 'It has no closing date, so it stays Active until you close it.'
                    : `It keeps its closing date of ${formatDate(post.closingDate)} and shows as Active until then.`;

            return {
                title: 'Reopen this job post?',
                description: `“${post.jobTitle}” goes back to accepting applications.`,
                consequences: [
                    closingLine,
                    applicationsLine,
                    'It appears to applicants again straight away.',
                ],
                confirmLabel: 'Reopen job post',
                destructive: false,
                testId: 'confirm-job-post-reopen',
            };
        }

        if (kind === 'archive') {
            return {
                title: 'Archive this job post?',
                description: `“${post.jobTitle}” disappears from every list and picker straight away.`,
                consequences: [
                    `${plural(applications, 'application')} stay readable by the Agency, and applicants keep seeing their stage.`,
                    'Its screening questions and answers are kept with it.',
                    'Restore keeps its closing date — a past date comes back as Expired until a new one is set.',
                ],
                confirmLabel: 'Archive job post',
                destructive: true,
                testId: 'confirm-job-post-archive',
            };
        }

        const restoreClosingLine =
            post.closingDate === null
                ? 'With no closing date it comes back as Active.'
                : post.closingDate < today
                  ? `Its closing date of ${formatDate(post.closingDate)} has passed, so it returns as Expired until a new date is set.`
                  : `It keeps its closing date of ${formatDate(post.closingDate)} and comes back as Active.`;

        return {
            title: 'Restore this job post?',
            description: `“${post.jobTitle}” returns to every list and picker.`,
            consequences: [
                restoreClosingLine,
                `${plural(applications, 'application')} are unchanged.`,
                'No new closing date is required to restore it.',
            ],
            confirmLabel: 'Restore job post',
            destructive: false,
            testId: 'confirm-job-post-restore',
        };
    }

    function rowMenu(post: JobPostRecord) {
        const displayStatus = jobPostDisplayStatus(post, today);
        const needsNewDate = reopeningNeedsNewDate(post, today);

        const actions: SystemRowAction[] = [
            {
                label: 'View details',
                icon: Eye,
                testId: 'menu-view-job-post',
                onSelect: () =>
                    router.get(jobPostShow({ jobPost: post.id }).url),
            },
            {
                label: 'Edit job post',
                icon: Pencil,
                testId: 'menu-edit-job-post',
                onSelect: () => setEditId(post.id),
            },
        ];

        if (displayStatus === 'archived') {
            actions.push({
                label: 'Restore job post',
                icon: ArchiveRestore,
                testId: 'menu-restore-job-post',
                onSelect: () => setPending({ kind: 'restore', post }),
            });

            return <SystemRowMenu actions={actions} />;
        }

        if (post.status === 'closed') {
            if (needsNewDate) {
                // Reopening with a past closing date is refused (§8.2) —
                // the way out is a new date, so open the edit sheet.
                actions.push({
                    label: 'Set new closing date',
                    icon: CalendarClock,
                    testId: 'menu-set-closing-date',
                    onSelect: () => setEditId(post.id),
                });
            } else {
                actions.push({
                    label: 'Reopen job post',
                    icon: RotateCcw,
                    testId: 'menu-reopen-job-post',
                    onSelect: () => setPending({ kind: 'reopen', post }),
                });
            }
        } else if (displayStatus === 'expired') {
            actions.push({
                label: 'Set new closing date',
                icon: CalendarClock,
                testId: 'menu-set-closing-date',
                onSelect: () => setEditId(post.id),
            });
        }

        if (post.status === 'pending') {
            actions.push({
                label: 'Close job post',
                icon: CircleX,
                testId: 'menu-close-job-post',
                onSelect: () => setPending({ kind: 'close', post }),
            });
        }

        actions.push({
            label: 'Archive job post',
            icon: Archive,
            destructive: true,
            hint: 'Archive hides it everywhere; nothing is erased',
            testId: 'menu-archive-job-post',
            onSelect: () => setPending({ kind: 'archive', post }),
        });

        return <SystemRowMenu actions={actions} />;
    }

    const columns: Column<JobPostRecord>[] = [
        {
            key: 'select',
            header: 'Select',
            width: '84px',
            headerClassName: 'px-3',
            cell: (post) => (
                <Checkbox
                    checked={selection.isSelected(String(post.id))}
                    onCheckedChange={() => selection.toggle(String(post.id))}
                    disabled={post.status === 'archived'}
                    aria-label={`Select ${post.jobTitle}`}
                    data-testid={`checkbox-job-post-${post.id}`}
                />
            ),
        },
        {
            key: 'job',
            header: 'Job post',
            cell: (post) => (
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <Link
                            href={jobPostShow({ jobPost: post.id })}
                            data-testid={`link-job-post-${post.id}`}
                            className="block truncate font-medium text-[var(--navy)] transition-colors hover:text-[var(--teal-ink)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none motion-reduce:transition-none"
                        >
                            {post.jobTitle}
                        </Link>
                        {post.isUrgent && <UrgentBadge />}
                    </div>
                    <span className="block truncate text-xs text-[var(--slate)]">
                        {post.workLocation}
                    </span>
                </div>
            ),
        },
        {
            key: 'agency',
            header: 'Agency',
            width: '200px',
            cell: (post) => {
                const own = agencyOf(state, post);

                if (own === undefined) {
                    return (
                        <span className="text-sm text-[var(--slate)]">
                            Agency not found
                        </span>
                    );
                }

                return (
                    <div className="min-w-0">
                        <Link
                            href={agencyShow({ agency: own.id })}
                            data-testid={`link-agency-${post.id}`}
                            className="block truncate text-sm font-medium text-[var(--navy)] underline-offset-2 transition-colors hover:text-[var(--teal-ink)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none motion-reduce:transition-none"
                        >
                            {own.agencyName}
                        </Link>
                        <span className="mt-1 flex items-center gap-1.5">
                            <PathwayBadge pathway={own.pathway} />
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'closing',
            header: 'Closes',
            width: '150px',
            cell: (post) => (
                <div className="flex flex-col items-start gap-1">
                    <span className="text-sm text-[var(--navy)] tabular-nums">
                        {post.closingDate === null
                            ? 'No closing date'
                            : formatDate(post.closingDate)}
                    </span>
                    {isClosingSoon(post, today) && <ClosingSoonBadge />}
                </div>
            ),
        },
        {
            key: 'posted',
            header: 'Posted',
            width: '130px',
            cell: (post) => (
                <span className="text-sm text-[var(--slate)]">
                    {formatDate(post.createdAt)}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            width: '130px',
            cell: (post) => {
                const displayStatus = jobPostDisplayStatus(post, today);

                return (
                    <StatusPill
                        tone={STATUS_TONE[displayStatus]}
                        dot
                        data-testid={`status-job-post-${post.id}`}
                    >
                        {DISPLAY_STATUS_LABELS[displayStatus]}
                    </StatusPill>
                );
            },
        },
    ];

    const copy = pending ? dialogCopy(pending) : null;
    const agencyFilterName =
        agency === 'all'
            ? null
            : (state.agencies.find((entry) => String(entry.id) === agency)
                  ?.agencyName ?? 'Unknown Agency');

    const agencyOptions = [
        { value: 'all', label: 'All Agencies' },
        ...visibleAgencies(state.agencies).map((entry) => ({
            value: String(entry.id),
            label: entry.agencyName,
        })),
    ];

    return (
        <>
            <Head title="Job posts" />

            <SystemPage>
                <SystemPageHeader
                    title="Job posts"
                    subtitle="Every job post on the platform, with its Agency, closing date and display status."
                    action={{
                        label: 'Add job post',
                        href: jobPostCreate(),
                        testId: 'button-job-post-add',
                    }}
                    data-testid="header-job-posts"
                />

                <KpiGrid>
                    <KpiCard
                        label="Job posts"
                        value={stats.total}
                        caption="Active, expired and closed"
                        icon={BriefcaseBusiness}
                        tone="blue"
                        data-testid="kpi-job-posts"
                    />
                    <KpiCard
                        label="Active"
                        value={stats.active}
                        caption="Accepting applications"
                        icon={CircleCheck}
                        tone="emerald"
                        data-testid="kpi-job-posts-active"
                    />
                    <KpiCard
                        label="Closing soon"
                        value={stats.closingSoon}
                        caption="Closing within 7 days"
                        icon={Clock}
                        tone="amber"
                        data-testid="kpi-job-posts-closing-soon"
                    />
                    <KpiCard
                        label="Expired"
                        value={stats.expired}
                        caption="Past the closing date"
                        icon={CalendarX2}
                        tone="red"
                        data-testid="kpi-job-posts-expired"
                    />
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
                        {status !== 'all' && (
                            <FilterChip
                                label="Status"
                                value={DISPLAY_STATUS_LABELS[status]}
                                onRemove={() => setStatus('all')}
                                testId="chip-status"
                            />
                        )}
                        {agency !== 'all' && agencyFilterName !== null && (
                            <FilterChip
                                label="Agency"
                                value={agencyFilterName}
                                onRemove={() => setAgency('all')}
                                testId="chip-agency"
                            />
                        )}
                        {pathway !== 'all' && (
                            <FilterChip
                                label="Pathway"
                                value={pathwayLabel(pathway)}
                                onRemove={() => setPathway('all')}
                                testId="chip-pathway"
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

                <DataTable<JobPostRecord>
                    columns={columns}
                    data={pageRows}
                    getRowId={(post) => String(post.id)}
                    getRowTestId={(post) => `row-job-post-${post.id}`}
                    getRowAccent={(post) =>
                        ACCENT[jobPostDisplayStatus(post, today)]
                    }
                    renderRowActions={rowMenu}
                    toolbar={
                        <DataTableToolbar data-testid="job-posts-table-toolbar">
                            <BulkBar
                                count={selection.count}
                                label="job posts"
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
                                    onClick={openBulkClose}
                                    data-testid="button-bulk-close"
                                >
                                    <CircleX
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Close selected
                                </Button>
                            </BulkBar>

                            <DataTableField
                                label="Search"
                                htmlFor="filter-job-post-search"
                                className="basis-full sm:min-w-64 sm:flex-1 sm:basis-auto"
                            >
                                <DataTableSearch
                                    id="filter-job-post-search"
                                    value={q}
                                    onChange={setQ}
                                    placeholder="Search job posts by title or location..."
                                    className="w-full"
                                    data-testid="input-search-job-posts"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Status"
                                htmlFor="filter-job-post-status"
                            >
                                <DataTableSelect<StatusFilter>
                                    id="filter-job-post-status"
                                    value={status}
                                    onValueChange={setStatus}
                                    options={STATUS_OPTIONS}
                                    ariaLabel="Filter by status"
                                    data-testid="select-job-post-status"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Agency"
                                htmlFor="filter-job-post-agency"
                            >
                                <DataTableSelect<string>
                                    id="filter-job-post-agency"
                                    value={agency}
                                    onValueChange={setAgency}
                                    options={agencyOptions}
                                    ariaLabel="Filter by Agency"
                                    data-testid="select-job-post-agency"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Pathway"
                                htmlFor="filter-job-post-pathway"
                            >
                                <DataTableSelect<PathwayFilter>
                                    id="filter-job-post-pathway"
                                    value={pathway}
                                    onValueChange={setPathway}
                                    options={PATHWAY_OPTIONS}
                                    ariaLabel="Filter by pathway"
                                    data-testid="select-job-post-pathway"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Sort by"
                                htmlFor="filter-job-post-sort"
                            >
                                <DataTableSelect<SortKey>
                                    id="filter-job-post-sort"
                                    value={sort}
                                    onValueChange={setSort}
                                    options={SORT_OPTIONS}
                                    ariaLabel="Sort job posts"
                                    data-testid="select-job-post-sort"
                                />
                            </DataTableField>
                            <DataTableRefreshButton
                                onClick={resetFilters}
                                data-testid="button-refresh-job-posts"
                            />
                        </DataTableToolbar>
                    }
                    pagination={{
                        page,
                        totalPages,
                        onPageChange: setPage,
                        alwaysShow: true,
                        label: 'Job posts pagination',
                        testIdPrefix: 'job-posts-pagination',
                    }}
                    emptyState={
                        <DashboardEmptyState
                            icon={isFiltered ? SearchX : BriefcaseBusiness}
                            title={
                                isFiltered
                                    ? 'No job posts match your filters'
                                    : 'No job posts yet'
                            }
                            message={
                                isFiltered
                                    ? 'Try a different title, Agency, pathway or status.'
                                    : 'Add the first job post to start accepting applications.'
                            }
                            onReset={isFiltered ? resetFilters : undefined}
                        />
                    }
                    data-testid="table-job-posts"
                />
            </SystemPage>

            {editRecord !== null && (
                <JobPostEditSheet
                    key={`edit-job-post-${editRecord.id}`}
                    post={editRecord}
                    state={state}
                    today={today}
                    onClose={() => setEditId(null)}
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

SystemJobPosts.layout = {
    breadcrumbs: [
        {
            title: 'Job posts',
            href: system.jobPosts(),
        },
    ],
};
