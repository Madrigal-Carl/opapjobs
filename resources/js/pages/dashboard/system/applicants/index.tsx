import { Head, Link, router } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    CalendarCheck,
    Eye,
    Pencil,
    Route as RouteIcon,
    SearchX,
    Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { StatusPillTone } from '@/components/dashboard/badges';
import { PathwayBadge, StatusPill } from '@/components/dashboard/badges';
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
import { BulkBar } from '@/components/system/bulk-bar';
import { ConfirmDialog } from '@/components/system/confirm-dialog';
import {
    EntitySheet,
    SheetSaveActions,
} from '@/components/system/entity-sheet';
import { TextAreaField, TextField } from '@/components/system/form-text-field';
import { SystemPageHeader } from '@/components/system/system-page-header';
import { SystemRowMenu } from '@/components/system/system-row-menu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useFormChanges } from '@/hooks/use-form-changes';
import { useRowSelection } from '@/hooks/use-row-selection';
import { useSystemLoading } from '@/hooks/use-system-loading';
import {
    commitSystemChange,
    popAuditEntry,
    updateSystemState,
    useSystemState,
    type SystemState,
} from '@/data/system/store';
import {
    AVAILABILITY_LABELS,
    type ApplicantProfileRecord,
    type Availability,
    type UserRecord,
} from '@/data/system/types';
import * as system from '@/routes/dashboard/system';
import { show as applicantShow } from '@/routes/dashboard/system/applicants';
import type { Pathway } from '@/types/agency';

/**
 * Applicants, all candidates in one list (§9.1).
 *
 * The one screen a superadmin lands on for this entity: search by name or
 * email, filters for pathway, availability and archive state, a sort, bulk
 * archive, and a row menu that offers the reversible verbs only. The detail
 * lives on `/applicants/{id}` so it can be linked to and reloaded; every
 * value here is derived from the in-memory store, so a browser refresh
 * resets it.
 */

const PER_PAGE = 8;

/**
 * Directory visibility is derived, never stored on the profile: the
 * account's archive timestamp wins, then the profile's visibility flag.
 */
type ApplicantStatus = 'visible' | 'hidden' | 'archived';

type StatusFilter = 'all' | ApplicantStatus;
type PathwayFilter = 'all' | Pathway;
type AvailabilityFilter = 'all' | Availability;
type SortKey = 'name' | 'newest' | 'active' | 'applications';

type ApplicantRow = {
    profile: ApplicantProfileRecord;
    account: UserRecord | null;
};

const STATUS_TONE: Record<ApplicantStatus, StatusPillTone> = {
    visible: 'success',
    hidden: 'warning',
    archived: 'neutral',
};

const STATUS_LABELS: Record<ApplicantStatus, string> = {
    visible: 'Visible',
    hidden: 'Hidden',
    archived: 'Archived',
};

const ACCENT: Record<ApplicantStatus, 'teal' | 'amber' | 'neutral'> = {
    visible: 'teal',
    hidden: 'amber',
    archived: 'neutral',
};

const PATHWAY_OPTIONS = [
    { value: 'all', label: 'All pathways' },
    { value: 'landbased', label: 'Land-based' },
    { value: 'seabased', label: 'Sea-based' },
];

const AVAILABILITY_OPTIONS = [
    { value: 'all', label: 'Any availability' },
    { value: 'immediately', label: AVAILABILITY_LABELS.immediately },
    { value: 'within_2_weeks', label: AVAILABILITY_LABELS.within_2_weeks },
    { value: 'within_1_month', label: AVAILABILITY_LABELS.within_1_month },
    {
        value: 'more_than_1_month',
        label: AVAILABILITY_LABELS.more_than_1_month,
    },
];

/** `all` deliberately excludes archived — archive removes a record from lists. */
const STATUS_OPTIONS = [
    { value: 'all', label: 'Visible and hidden' },
    { value: 'visible', label: 'Visible' },
    { value: 'hidden', label: 'Hidden' },
    { value: 'archived', label: 'Archived' },
];

const SORT_OPTIONS = [
    { value: 'name', label: 'Name A–Z' },
    { value: 'newest', label: 'Newest first' },
    { value: 'active', label: 'Recently active' },
    { value: 'applications', label: 'Most applications' },
];

function pathwayLabel(pathway: Pathway): string {
    return pathway === 'landbased' ? 'Land-based' : 'Sea-based';
}

function plural(count: number, noun: string): string {
    return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

function applicantStatus(
    profile: ApplicantProfileRecord,
    account: UserRecord | null,
): ApplicantStatus {
    if (account !== null && account.deletedAt !== null) {
        return 'archived';
    }

    return profile.isVisibleToAgencies ? 'visible' : 'hidden';
}

function accountOf(state: SystemState, userId: number): UserRecord | null {
    return state.accounts.find((account) => account.id === userId) ?? null;
}

/** Applications one applicant has already submitted. */
function applicationCount(state: SystemState, userId: number): number {
    return state.applications.filter(
        (application) => application.applicantUserId === userId,
    ).length;
}

/** Active (non-archived) documents one applicant has on file. */
function documentCount(state: SystemState, userId: number): number {
    return state.applicantDocuments.filter(
        (document) =>
            document.applicantUserId === userId && document.deletedAt === null,
    ).length;
}

/**
 * Accounts a bulk archive would actually change: a record that is already
 * archived is skipped rather than re-stamped, and Undo needs to know which
 * originals to hand back.
 */
function pendingTargets(rows: ApplicantRow[]): UserRecord[] {
    return rows
        .map((row) => row.account)
        .filter(
            (account): account is UserRecord =>
                account !== null && account.deletedAt === null,
        );
}

/** Top skills in sort order, e.g. "LV switchgear maintenance · Motor control". */
function skillsLine(state: SystemState, userId: number): string {
    return state.applicantSkills
        .filter((skill) => skill.applicantUserId === userId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((skill) => skill.skillName)
        .join(' · ');
}

/** Success toast with a six-second Undo that also drops the audit row. */
function offerUndo(message: string, revert: () => void): void {
    toast.success(message, {
        duration: 6000,
        action: {
            label: 'Undo',
            onClick: () => {
                revert();
                popAuditEntry();
            },
        },
    });
}

type PendingAction =
    | { kind: 'archive' | 'restore'; row: ApplicantRow }
    | { kind: 'bulk-archive'; rows: ApplicantRow[] };

/**
 * Archive or restore the account behind a profile — the profile itself has
 * no archive timestamp, the account does. Undo restores the account's
 * original typed value and drops the audit entry this call wrote.
 */
function mutateArchive(account: UserRecord, verb: 'archive' | 'restore'): void {
    const stamp = new Date().toISOString();

    commitSystemChange({
        action: verb,
        subjectType: 'applicant',
        subjectId: account.id,
        subjectLabel: account.name,
        changes: [
            {
                field: 'Archived',
                from: verb === 'archive' ? false : true,
                to: verb === 'archive' ? true : false,
            },
        ],
        apply: (current) => ({
            ...current,
            accounts: current.accounts.map((entry) =>
                entry.id === account.id
                    ? { ...entry, deletedAt: verb === 'archive' ? stamp : null }
                    : entry,
            ),
        }),
    });

    offerUndo(
        verb === 'archive'
            ? `“${account.name}” archived.`
            : `“${account.name}” restored.`,
        () => {
            updateSystemState((current) => ({
                ...current,
                accounts: current.accounts.map((entry) =>
                    entry.id === account.id
                        ? { ...entry, deletedAt: account.deletedAt }
                        : entry,
                ),
            }));
        },
    );
}

type ApplicantDraft = {
    headline: string;
    phoneNumber: string;
    currentLocation: string;
    professionalSummary: string;
    availability: Availability | 'none';
    preferredPathway: Pathway | 'none';
};

type ApplicantErrors = Partial<Record<keyof ApplicantDraft, string>>;

function toDraft(profile: ApplicantProfileRecord): ApplicantDraft {
    return {
        headline: profile.headline ?? '',
        phoneNumber: profile.phoneNumber ?? '',
        currentLocation: profile.currentLocation ?? '',
        professionalSummary: profile.professionalSummary ?? '',
        availability: profile.availability ?? 'none',
        preferredPathway: profile.preferredPathway ?? 'none',
    };
}

function validateDraft(draft: ApplicantDraft): ApplicantErrors {
    const errors: ApplicantErrors = {};

    if (draft.headline.trim() === '') {
        errors.headline = 'Enter a headline.';
    }

    if (draft.headline.trim().length > 160) {
        errors.headline = 'Keep the headline under 160 characters.';
    }

    if (
        draft.phoneNumber.trim() !== '' &&
        draft.phoneNumber.replace(/\D/g, '').length < 7
    ) {
        errors.phoneNumber =
            'Enter at least 7 digits, or leave the phone empty.';
    }

    if (draft.professionalSummary.length > 2_000) {
        errors.professionalSummary = 'Keep the summary under 2,000 characters.';
    }

    return errors;
}

/** Pairs the editable fields with their labels for the audit diff. */
const EDIT_FIELDS: { key: keyof ApplicantDraft; label: string }[] = [
    { key: 'headline', label: 'Headline' },
    { key: 'phoneNumber', label: 'Phone' },
    { key: 'currentLocation', label: 'Location' },
    { key: 'professionalSummary', label: 'Summary' },
    { key: 'availability', label: 'Availability' },
    { key: 'preferredPathway', label: 'Preferred pathway' },
];

/** Readable before/after values for the audit diff. */
function auditValue(
    key: keyof ApplicantDraft,
    value: ApplicantDraft[keyof ApplicantDraft],
): string | null {
    if (value === 'none') {
        return null;
    }

    if (key === 'availability' && value !== 'all') {
        return AVAILABILITY_LABELS[value as Availability];
    }

    if (key === 'preferredPathway' && value !== 'all') {
        return pathwayLabel(value as Pathway);
    }

    const text = String(value).trim();

    return text === '' ? null : text;
}

/**
 * Create/edit sheet for one applicant, with dirty tracking and inline
 * errors. Mounted only while open and keyed by user id, so the form hook
 * always starts from the record's current values.
 */
function ApplicantEditSheet({
    profile,
    subjectLabel,
    onClose,
}: {
    profile: ApplicantProfileRecord;
    subjectLabel: string;
    onClose: () => void;
}) {
    const form = useFormChanges<ApplicantDraft>(toDraft(profile));
    const [errors, setErrors] = useState<ApplicantErrors>({});

    const clearError = (key: keyof ApplicantErrors) => {
        setErrors((current) =>
            current[key] === undefined
                ? current
                : { ...current, [key]: undefined },
        );
    };

    function save() {
        const found = validateDraft(form.values);

        setErrors(found);

        if (Object.keys(found).length > 0) {
            return;
        }

        const original = toDraft(profile);

        const changes = EDIT_FIELDS.filter(
            (field) => form.values[field.key] !== original[field.key],
        ).map((field) => ({
            field: field.label,
            from: auditValue(field.key, original[field.key]),
            to: auditValue(field.key, form.values[field.key]),
        }));

        if (changes.length === 0) {
            onClose();
            return;
        }

        const headline = form.values.headline.trim() || null;
        const phoneNumber = form.values.phoneNumber.trim() || null;
        const currentLocation = form.values.currentLocation.trim() || null;
        const professionalSummary =
            form.values.professionalSummary.trim() || null;
        const availability =
            form.values.availability === 'none'
                ? null
                : form.values.availability;
        const preferredPathway =
            form.values.preferredPathway === 'none'
                ? null
                : form.values.preferredPathway;

        commitSystemChange({
            action: 'update',
            subjectType: 'applicant',
            subjectId: profile.userId,
            subjectLabel,
            changes,
            apply: (current) => ({
                ...current,
                applicantProfiles: current.applicantProfiles.map((entry) =>
                    entry.userId === profile.userId
                        ? {
                              ...entry,
                              headline,
                              phoneNumber,
                              currentLocation,
                              professionalSummary,
                              availability,
                              preferredPathway,
                          }
                        : entry,
                ),
            }),
        });

        offerUndo(`Changes to “${subjectLabel}” saved.`, () => {
            updateSystemState((current) => ({
                ...current,
                applicantProfiles: current.applicantProfiles.map((entry) =>
                    entry.userId === profile.userId
                        ? {
                              ...entry,
                              headline: profile.headline,
                              phoneNumber: profile.phoneNumber,
                              currentLocation: profile.currentLocation,
                              professionalSummary: profile.professionalSummary,
                              availability: profile.availability,
                              preferredPathway: profile.preferredPathway,
                          }
                        : entry,
                ),
            }));
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
            title="Edit applicant"
            description="What Agencies see on the candidate directory, and how to reach the applicant."
            data-testid="sheet-applicant-edit"
            footer={
                <SheetSaveActions
                    onCancel={onClose}
                    onSave={save}
                    saveLabel="Save changes"
                    saveDisabled={!form.isDirty}
                    data-testid="sheet-save-applicant"
                />
            }
        >
            <TextField
                id="edit-applicant-headline"
                label="Headline"
                required
                value={form.values.headline}
                onChange={(value) => {
                    form.setValue('headline', value);
                    clearError('headline');
                }}
                error={errors.headline}
                data-testid="input-edit-applicant-headline"
            />
            <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                    id="edit-applicant-phone"
                    label="Phone"
                    type="tel"
                    value={form.values.phoneNumber}
                    onChange={(value) => {
                        form.setValue('phoneNumber', value);
                        clearError('phoneNumber');
                    }}
                    error={errors.phoneNumber}
                />
                <TextField
                    id="edit-applicant-location"
                    label="Current location"
                    value={form.values.currentLocation}
                    onChange={(value) => {
                        form.setValue('currentLocation', value);
                        clearError('currentLocation');
                    }}
                />
            </div>
            <TextAreaField
                id="edit-applicant-summary"
                label="Professional summary"
                value={form.values.professionalSummary}
                onChange={(value) => {
                    form.setValue('professionalSummary', value);
                    clearError('professionalSummary');
                }}
                error={errors.professionalSummary}
                maxLength={2_000}
                hint="Plain text."
            />
            <div className="flex flex-col gap-2">
                <Label htmlFor="edit-applicant-availability">
                    Availability
                </Label>
                <Select
                    value={form.values.availability}
                    onValueChange={(next) =>
                        form.setValue(
                            'availability',
                            next as ApplicantDraft['availability'],
                        )
                    }
                >
                    <SelectTrigger
                        id="edit-applicant-availability"
                        data-testid="select-edit-applicant-availability"
                    >
                        <SelectValue placeholder="Any availability" />
                    </SelectTrigger>
                    <SelectContent>
                        {AVAILABILITY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="edit-applicant-pathway">
                    Preferred pathway
                </Label>
                <Select
                    value={form.values.preferredPathway}
                    onValueChange={(next) =>
                        form.setValue(
                            'preferredPathway',
                            next as ApplicantDraft['preferredPathway'],
                        )
                    }
                >
                    <SelectTrigger
                        id="edit-applicant-pathway"
                        data-testid="select-edit-applicant-pathway"
                    >
                        <SelectValue placeholder="No preference" />
                    </SelectTrigger>
                    <SelectContent>
                        {PATHWAY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-[var(--slate)]">
                    Used to file the applicant under Land-based or Sea-based job
                    posts.
                </p>
            </div>
        </EntitySheet>
    );
}

export default function SystemApplicants() {
    const state = useSystemState();
    const loading = useSystemLoading();
    const selection = useRowSelection();

    const [q, setQ] = useState('');
    const [pathway, setPathway] = useState<PathwayFilter>('all');
    const [availability, setAvailability] = useState<AvailabilityFilter>('all');
    const [status, setStatus] = useState<StatusFilter>('all');
    const [sort, setSort] = useState<SortKey>('name');
    const [page, setPage] = useState(1);
    const [pending, setPending] = useState<PendingAction | null>(null);
    const [editId, setEditId] = useState<number | null>(null);

    useEffect(() => {
        setPage(1);
    }, [q, pathway, availability, status, sort]);

    const rows = useMemo<ApplicantRow[]>(() => {
        const needle = q.trim().toLowerCase();

        const filtered = state.applicantProfiles.filter((profile) => {
            const account = accountOf(state, profile.userId);
            const displayStatus = applicantStatus(profile, account);

            if (status === 'all') {
                if (displayStatus === 'archived') {
                    return false;
                }
            } else if (displayStatus !== status) {
                return false;
            }

            if (pathway !== 'all' && profile.preferredPathway !== pathway) {
                return false;
            }

            if (
                availability !== 'all' &&
                profile.availability !== availability
            ) {
                return false;
            }

            if (needle === '') {
                return true;
            }

            return [
                account?.name ?? '',
                account?.email ?? '',
                profile.headline ?? '',
                profile.currentLocation ?? '',
            ].some((value) => value.toLowerCase().includes(needle));
        });

        return [...filtered]
            .map((profile) => ({
                profile,
                account: accountOf(state, profile.userId),
            }))
            .sort((a, b) => {
                if (sort === 'newest') {
                    return (b.account?.createdAt ?? '').localeCompare(
                        a.account?.createdAt ?? '',
                    );
                }

                if (sort === 'active') {
                    return (b.account?.lastActiveAt ?? '').localeCompare(
                        a.account?.lastActiveAt ?? '',
                    );
                }

                if (sort === 'applications') {
                    return (
                        applicationCount(state, b.profile.userId) -
                        applicationCount(state, a.profile.userId)
                    );
                }

                return (a.account?.name ?? '').localeCompare(
                    b.account?.name ?? '',
                );
            });
    }, [state, q, pathway, availability, status, sort]);

    const stats = useMemo(() => {
        const live = state.applicantProfiles.filter(
            (profile) =>
                applicantStatus(profile, accountOf(state, profile.userId)) !==
                'archived',
        );

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        return {
            total: live.length,
            activeThisWeek: live.filter((profile) => {
                const last = accountOf(state, profile.userId)?.lastActiveAt;

                return (
                    typeof last === 'string' && last >= weekAgo.toISOString()
                );
            }).length,
            availableNow: live.filter(
                (profile) => profile.availability === 'immediately',
            ).length,
            landbased: live.filter(
                (profile) => profile.preferredPathway === 'landbased',
            ).length,
            seabased: live.filter(
                (profile) => profile.preferredPathway === 'seabased',
            ).length,
            archived: state.applicantProfiles.length - live.length,
        };
    }, [state]);

    const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    const pageRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const pageIds = pageRows.map((row) => String(row.profile.userId));

    const isFiltered =
        q.trim() !== '' ||
        pathway !== 'all' ||
        availability !== 'all' ||
        status !== 'all';

    const resetFilters = () => {
        setQ('');
        setPathway('all');
        setAvailability('all');
        setStatus('all');
        setPage(1);
    };

    const selectAllOnPage = () => selection.setMany(pageIds, true);

    const editRow =
        editId === null
            ? null
            : (rows.find((row) => row.profile.userId === editId) ?? null);

    function confirmPending() {
        if (!pending) {
            return;
        }

        if (pending.kind === 'bulk-archive') {
            // Only records that are not archived yet change; Undo hands each
            // one back its own original value rather than a blanket stamp.
            const targets = pendingTargets(pending.rows);

            if (targets.length === 0) {
                setPending(null);
                return;
            }

            const ids = targets.map((account) => account.id);
            const stamp = new Date().toISOString();
            const label = plural(targets.length, 'applicant');

            commitSystemChange({
                action: 'archive',
                subjectType: 'applicant',
                subjectId: ids.join(','),
                subjectLabel: label,
                changes: [{ field: 'Archived', from: false, to: true }],
                apply: (current) => ({
                    ...current,
                    accounts: current.accounts.map((entry) =>
                        ids.includes(entry.id)
                            ? { ...entry, deletedAt: stamp }
                            : entry,
                    ),
                }),
            });

            offerUndo(`${label} archived.`, () => {
                updateSystemState((current) => ({
                    ...current,
                    accounts: current.accounts.map((entry) =>
                        ids.includes(entry.id)
                            ? { ...entry, deletedAt: null }
                            : entry,
                    ),
                }));
            });

            selection.clear();
            setPending(null);
            return;
        }

        const { row, kind } = pending;

        if (row.account === null) {
            setPending(null);
            return;
        }

        mutateArchive(row.account, kind);
        setPending(null);
    }

    function dialogCopy(action: PendingAction) {
        if (action.kind === 'bulk-archive') {
            const targets = pendingTargets(action.rows);
            const userIds = new Set(targets.map((account) => account.id));
            const apps = state.applications.filter((application) =>
                userIds.has(application.applicantUserId),
            ).length;
            const docs = state.applicantDocuments.filter(
                (document) =>
                    userIds.has(document.applicantUserId) &&
                    document.deletedAt === null,
            ).length;

            return {
                title: `Archive ${targets.length} applicants?`,
                description:
                    'They leave the candidate directory straight away.',
                consequences: [
                    plural(apps, 'application') +
                        ' stay attached to their job posts.',
                    `${docs} documents stay on file and come back on restore.`,
                    'Each applicant can be brought back on its own from the Archived filter.',
                ],
                confirmLabel: 'Archive applicants',
                destructive: true,
                testId: 'confirm-applicant-bulk-archive',
            };
        }

        const { row, kind } = action;
        const name = row.account?.name ?? `Applicant #${row.profile.userId}`;
        const apps = applicationCount(state, row.profile.userId);
        const docs = documentCount(state, row.profile.userId);

        if (kind === 'archive') {
            return {
                title: 'Archive this applicant?',
                description: `“${name}” disappears from the candidate directory straight away.`,
                consequences: [
                    plural(apps, 'application') +
                        ' stay attached to their job posts and keep the stage they already have.',
                    `${docs} documents stay on file while they are archived.`,
                    'Restore them at any time from the Archived filter.',
                ],
                confirmLabel: 'Archive',
                destructive: true,
                testId: 'confirm-applicant-archive',
            };
        }

        return {
            title: 'Restore this applicant?',
            description: `“${name}” returns to the candidate directory and every picker.`,
            consequences: [
                plural(apps, 'application') + ' need no change of their own.',
                `Their ${docs} documents become visible again.`,
            ],
            confirmLabel: 'Restore',
            destructive: false,
            testId: 'confirm-applicant-restore',
        };
    }

    function rowMenu(row: ApplicantRow) {
        const archived = row.account !== null && row.account.deletedAt !== null;
        const name = row.account?.name ?? `Applicant #${row.profile.userId}`;

        const actions = [
            {
                label: 'View details',
                icon: Eye,
                testId: 'menu-view-applicant',
                onSelect: () =>
                    router.get(
                        applicantShow({ applicant: row.profile.userId }).url,
                    ),
            },
        ];

        if (archived) {
            actions.push({
                label: 'Restore applicant',
                icon: ArchiveRestore,
                testId: 'menu-restore-applicant',
                onSelect: () => setPending({ kind: 'restore', row }),
            });
        } else {
            actions.push({
                label: 'Edit applicant',
                icon: Pencil,
                testId: 'menu-edit-applicant',
                onSelect: () => setEditId(row.profile.userId),
            });

            actions.push({
                label: 'Archive applicant',
                icon: Archive,
                testId: 'menu-archive-applicant',
                onSelect: () => setPending({ kind: 'archive', row }),
            });
        }

        return (
            <SystemRowMenu
                actions={actions}
                label={`More actions for ${name}`}
            />
        );
    }

    const columns: Column<ApplicantRow>[] = [
        {
            key: 'select',
            header: 'Select',
            width: '84px',
            headerClassName: 'px-3',
            cell: (row) => (
                <Checkbox
                    checked={selection.isSelected(String(row.profile.userId))}
                    onCheckedChange={() =>
                        selection.toggle(String(row.profile.userId))
                    }
                    aria-label={`Select ${row.account?.name ?? 'applicant'}`}
                    data-testid={`checkbox-applicant-${row.profile.userId}`}
                />
            ),
        },
        {
            key: 'applicant',
            header: 'Applicant',
            cell: (row) => (
                <div className="min-w-0">
                    <Link
                        href={applicantShow({ applicant: row.profile.userId })}
                        data-testid={`link-applicant-${row.profile.userId}`}
                        className="block truncate font-medium text-[var(--navy)] transition-colors hover:text-[var(--teal-ink)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
                    >
                        {row.account?.name ??
                            `Applicant #${row.profile.userId}`}
                    </Link>
                    <span className="block truncate text-xs text-[var(--slate)]">
                        {row.profile.currentLocation ?? 'Location not set'}
                    </span>
                </div>
            ),
        },
        {
            key: 'email',
            header: 'Email',
            width: '230px',
            cell: (row) => (
                <span className="block truncate text-xs text-[var(--slate)]">
                    {row.account?.email ?? '—'}
                </span>
            ),
        },
        {
            key: 'pathway',
            header: 'Pathway',
            width: '130px',
            cell: (row) =>
                row.profile.preferredPathway === null ? (
                    <span className="text-xs text-[var(--slate)]">
                        No preference
                    </span>
                ) : (
                    <PathwayBadge pathway={row.profile.preferredPathway} />
                ),
        },
        {
            key: 'profile',
            header: 'Skills / headline',
            cell: (row) => {
                const skills = skillsLine(state, row.profile.userId);
                const headline = row.profile.headline;

                return (
                    <div className="min-w-0">
                        <p className="truncate text-sm text-[var(--navy)]">
                            {skills !== '' ? skills : (headline ?? '—')}
                        </p>
                        {skills !== '' && (
                            <p className="truncate text-xs text-[var(--slate)]">
                                {headline ?? 'No headline yet'}
                            </p>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'availability',
            header: 'Availability',
            width: '140px',
            cell: (row) => (
                <span className="text-xs font-medium text-[var(--slate)]">
                    {row.profile.availability === null
                        ? 'Not set'
                        : AVAILABILITY_LABELS[row.profile.availability]}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            width: '130px',
            cell: (row) => {
                const displayStatus = applicantStatus(row.profile, row.account);

                return (
                    <StatusPill
                        tone={STATUS_TONE[displayStatus]}
                        dot
                        data-testid={`status-applicant-${row.profile.userId}`}
                    >
                        {STATUS_LABELS[displayStatus]}
                    </StatusPill>
                );
            },
        },
    ];

    const copy = pending ? dialogCopy(pending) : null;

    return (
        <>
            <Head title="Applicants" />

            <SystemPage>
                <SystemPageHeader
                    title="Applicants"
                    subtitle="Every candidate on the platform, with their pathway, availability and applications."
                    data-testid="header-applicants"
                />

                <KpiGrid>
                    <KpiCard
                        label="Applicants"
                        value={stats.total}
                        loading={loading}
                        caption={`${stats.activeThisWeek} active this week`}
                        icon={Users}
                        tone="blue"
                        data-testid="kpi-applicants"
                    />
                    <KpiCard
                        label="Available immediately"
                        value={stats.availableNow}
                        loading={loading}
                        caption="Availability set to immediately"
                        icon={CalendarCheck}
                        tone="teal"
                        data-testid="kpi-applicants-available"
                    />
                    <KpiCard
                        label="Pathway split"
                        value={`${stats.landbased} / ${stats.seabased}`}
                        loading={loading}
                        caption="Land-based / Sea-based"
                        icon={RouteIcon}
                        tone="violet"
                        data-testid="kpi-applicants-pathways"
                    />
                    <KpiCard
                        label="Archived"
                        value={stats.archived}
                        loading={loading}
                        caption="Hidden until restored"
                        icon={Archive}
                        tone="navy"
                        data-testid="kpi-applicants-archived"
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
                        {pathway !== 'all' && (
                            <FilterChip
                                label="Pathway"
                                value={pathwayLabel(pathway)}
                                onRemove={() => setPathway('all')}
                                testId="chip-pathway"
                            />
                        )}
                        {availability !== 'all' && (
                            <FilterChip
                                label="Availability"
                                value={AVAILABILITY_LABELS[availability]}
                                onRemove={() => setAvailability('all')}
                                testId="chip-availability"
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

                <DataTable<ApplicantRow>
                    columns={columns}
                    data={pageRows}
                    loading={loading}
                    getRowId={(row) => String(row.profile.userId)}
                    getRowTestId={(row) =>
                        `row-applicant-${row.profile.userId}`
                    }
                    getRowAccent={(row) =>
                        ACCENT[applicantStatus(row.profile, row.account)]
                    }
                    renderRowActions={rowMenu}
                    toolbar={
                        <DataTableToolbar data-testid="applicants-table-toolbar">
                            <BulkBar
                                count={selection.count}
                                label="applicants"
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
                                    onClick={() =>
                                        setPending({
                                            kind: 'bulk-archive',
                                            rows: rows.filter((row) =>
                                                selection.isSelected(
                                                    String(row.profile.userId),
                                                ),
                                            ),
                                        })
                                    }
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
                                htmlFor="filter-applicant-search"
                                className="basis-full sm:min-w-64 sm:flex-1 sm:basis-auto"
                            >
                                <DataTableSearch
                                    id="filter-applicant-search"
                                    value={q}
                                    onChange={setQ}
                                    placeholder="Search applicants by name, email or headline..."
                                    className="w-full"
                                    data-testid="input-search-applicants"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Pathway"
                                htmlFor="filter-applicant-pathway"
                            >
                                <DataTableSelect<PathwayFilter>
                                    id="filter-applicant-pathway"
                                    value={pathway}
                                    onValueChange={setPathway}
                                    options={PATHWAY_OPTIONS}
                                    ariaLabel="Filter by pathway"
                                    data-testid="select-applicant-pathway"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Availability"
                                htmlFor="filter-applicant-availability"
                            >
                                <DataTableSelect<AvailabilityFilter>
                                    id="filter-applicant-availability"
                                    value={availability}
                                    onValueChange={setAvailability}
                                    options={AVAILABILITY_OPTIONS}
                                    ariaLabel="Filter by availability"
                                    data-testid="select-applicant-availability"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Status"
                                htmlFor="filter-applicant-status"
                            >
                                <DataTableSelect<StatusFilter>
                                    id="filter-applicant-status"
                                    value={status}
                                    onValueChange={setStatus}
                                    options={STATUS_OPTIONS}
                                    ariaLabel="Filter by status"
                                    data-testid="select-applicant-status"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Sort by"
                                htmlFor="filter-applicant-sort"
                            >
                                <DataTableSelect<SortKey>
                                    id="filter-applicant-sort"
                                    value={sort}
                                    onValueChange={setSort}
                                    options={SORT_OPTIONS}
                                    ariaLabel="Sort applicants"
                                    data-testid="select-applicant-sort"
                                />
                            </DataTableField>
                            <DataTableRefreshButton
                                onClick={resetFilters}
                                spinning={loading}
                                data-testid="button-refresh-applicants"
                            />
                        </DataTableToolbar>
                    }
                    pagination={{
                        page,
                        totalPages,
                        onPageChange: setPage,
                        alwaysShow: true,
                        label: 'Applicants pagination',
                        testIdPrefix: 'applicants-pagination',
                    }}
                    emptyState={
                        <DashboardEmptyState
                            icon={isFiltered ? SearchX : Users}
                            title={
                                isFiltered
                                    ? 'No applicants match your filters'
                                    : 'No applicants yet'
                            }
                            message={
                                isFiltered
                                    ? 'Try a different name, pathway, availability or status.'
                                    : 'Candidates appear here as soon as they register.'
                            }
                            onReset={isFiltered ? resetFilters : undefined}
                        />
                    }
                    data-testid="table-applicants"
                />
            </SystemPage>

            {editRow !== null && (
                <ApplicantEditSheet
                    key={`edit-applicant-${editRow.profile.userId}`}
                    profile={editRow.profile}
                    subjectLabel={
                        editRow.account?.name ??
                        `Applicant #${editRow.profile.userId}`
                    }
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

SystemApplicants.layout = {
    breadcrumbs: [
        {
            title: 'Applicants',
            href: system.applicants(),
        },
    ],
};
