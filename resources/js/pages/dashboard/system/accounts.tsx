import { Head } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    Building2,
    Eye,
    Pause,
    Pencil,
    Play,
    SearchX,
    ShieldAlert,
    ShieldCheck,
    Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { StatusPillTone } from '@/components/dashboard/badges';
import { StatusPill } from '@/components/dashboard/badges';
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
import { SeatMeter } from '@/components/system/seat-meter';
import { SystemPageHeader } from '@/components/system/system-page-header';
import type { SystemRowAction } from '@/components/system/system-row-menu';
import { SystemRowMenu } from '@/components/system/system-row-menu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useFormChanges } from '@/hooks/use-form-changes';
import { useRowSelection } from '@/hooks/use-row-selection';
import { useSystemLoading } from '@/hooks/use-system-loading';
import {
    agencyAdmin,
    agencySeatsUsed,
    isDuplicateEmail,
    visibleAgencies,
} from '@/data/system/selectors';
import type { SystemState } from '@/data/system/store';
import {
    commitSystemChange,
    popAuditEntry,
    updateSystemState,
    useSystemState,
} from '@/data/system/store';
import type {
    AgencyRecord,
    AuditChange,
    UserRecord,
    UserRole,
} from '@/data/system/types';
import * as system from '@/routes/dashboard/system';

/**
 * Accounts — every person with a sign-in, and the Agency they belong to.
 *
 * The one screen a superadmin lands on for user accounts: search, role and
 * status filters, a sort, bulk archive, and a row menu offering only the
 * reversible verbs. Create and edit happen in a right-hand sheet with dirty
 * tracking; the business rules from docs §2 and §7.1 are surfaced inline
 * rather than failing silently:
 *
 * - a user has exactly one role;
 * - `admin` and `agency` accounts must pick an Agency;
 * - an Agency has exactly one `admin`, so a second admin is refused with
 *   the way out, and its only admin can never be suspended or archived;
 * - `agency` staff count toward `agency_user_limit`; the admin does not.
 */

const PER_PAGE = 10;

type AccountDisplayStatus = 'active' | 'suspended' | 'archived';
type StatusFilter = 'all' | AccountDisplayStatus;
type RoleFilter = 'all' | UserRole;
type SortKey = 'name' | 'newest' | 'active';

type AccountForm = {
    name: string;
    email: string;
    role: UserRole;
    agencyId: number | null;
};

type FormErrors = {
    name: string | null;
    email: string | null;
    role: string | null;
    agency: string | null;
};

const ROLE_LABELS: Record<UserRole, string> = {
    superadmin: 'Superadmin',
    admin: 'Agency admin',
    agency: 'Agency staff',
    applicant: 'Applicant',
};

const ROLE_HINTS: Record<UserRole, string> = {
    superadmin: 'The platform owner. A superadmin belongs to no Agency.',
    admin: 'The single administrator of one Agency.',
    agency: 'A staff member of one Agency. The seat counts toward the Agency limit.',
    applicant: 'A job seeker. An applicant belongs to no Agency.',
};

const ACCOUNT_STATUS_LABELS: Record<AccountDisplayStatus, string> = {
    active: 'Active',
    suspended: 'Suspended',
    archived: 'Archived',
};

const STATUS_TONE: Record<AccountDisplayStatus, StatusPillTone> = {
    active: 'success',
    suspended: 'warning',
    archived: 'neutral',
};

const ACCENT: Record<AccountDisplayStatus, 'teal' | 'amber' | 'neutral'> = {
    active: 'teal',
    suspended: 'amber',
    archived: 'neutral',
};

const FORM_ROLE_OPTIONS = [
    { value: 'superadmin', label: 'Superadmin' },
    { value: 'admin', label: 'Agency admin' },
    { value: 'agency', label: 'Agency staff' },
    { value: 'applicant', label: 'Applicant' },
];

const ROLE_FILTER_OPTIONS = [
    { value: 'all', label: 'All roles' },
    ...FORM_ROLE_OPTIONS,
];

/* `all` deliberately excludes archived — archive removes a record from lists. */
const STATUS_OPTIONS = [
    { value: 'all', label: 'Active and suspended' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'archived', label: 'Archived' },
];

const SORT_OPTIONS = [
    { value: 'name', label: 'Name A–Z' },
    { value: 'newest', label: 'Newest first' },
    { value: 'active', label: 'Recently active' },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const lastActiveFormat = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
});

function plural(count: number, noun: string): string {
    return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

/** Display status for an account, mirroring `agencyDisplayStatus`. */
function accountDisplayStatus(account: UserRecord): AccountDisplayStatus {
    if (account.deletedAt !== null) {
        return 'archived';
    }

    if (account.suspendedAt !== null) {
        return 'suspended';
    }

    return 'active';
}

function agencyOf(
    state: SystemState,
    account: UserRecord,
): AgencyRecord | undefined {
    if (account.agencyId === null) {
        return undefined;
    }

    return state.agencies.find((agency) => agency.id === account.agencyId);
}

function agencyName(state: SystemState, agencyId: number | null): string {
    if (agencyId === null) {
        return '—';
    }

    return (
        state.agencies.find((agency) => agency.id === agencyId)?.agencyName ??
        '—'
    );
}

/**
 * True when this account is the one `admin` of a live Agency. The console
 * never offers Suspend or Archive for such an account: an Agency always
 * has exactly one admin, so archiving it would leave the Agency headless.
 */
function isSoleAdmin(state: SystemState, account: UserRecord): boolean {
    if (account.role !== 'admin' || account.agencyId === null) {
        return false;
    }

    const agency = state.agencies.find(
        (entry) => entry.id === account.agencyId,
    );

    if (!agency || agency.deletedAt !== null) {
        return false;
    }

    return agencyAdmin(state, agency.id)?.id === account.id;
}

/**
 * Whether the account currently holds a staff seat, matching
 * `agencySeatsUsed` exactly: only `agency`-role accounts that are neither
 * suspended nor archived count toward the Agency's limit.
 */
function countsTowardSeat(
    account: UserRecord | null,
    agencyId: number,
): boolean {
    return (
        account !== null &&
        account.role === 'agency' &&
        account.agencyId === agencyId &&
        account.suspendedAt === null &&
        account.deletedAt === null
    );
}

/** Live (non-archived) job posts authored by one account. */
function countJobPostsBy(state: SystemState, userId: number): number {
    return state.jobPosts.filter(
        (post) => post.postedByUserId === userId && post.status !== 'archived',
    ).length;
}

/**
 * Inline errors for the account form. Every rule from docs §2 and §7.1 is
 * explained with the way out rather than silently blocking the save.
 */
function validateAccountForm(
    state: SystemState,
    values: AccountForm,
    account: UserRecord | null,
): FormErrors | null {
    const errors: FormErrors = {
        name: null,
        email: null,
        role: null,
        agency: null,
    };

    const name = values.name.trim();
    const email = values.email.trim();

    if (name === '') {
        errors.name = 'Enter a name.';
    }

    if (email === '') {
        errors.email = 'Enter an email address.';
    } else if (!EMAIL_PATTERN.test(email)) {
        errors.email = 'Enter a valid email address, like name@example.com.';
    } else if (isDuplicateEmail(state, email, account?.id)) {
        errors.email = 'An account with this email already exists.';
    }

    const needsAgency = values.role === 'admin' || values.role === 'agency';
    const targetAgency =
        values.agencyId === null
            ? undefined
            : state.agencies.find((agency) => agency.id === values.agencyId);

    if (needsAgency && values.agencyId === null) {
        errors.agency =
            values.role === 'admin'
                ? 'Pick the Agency this account will administer.'
                : 'Pick the Agency this account belongs to.';
    } else if (needsAgency && targetAgency === undefined) {
        errors.agency = 'That Agency is no longer available. Pick another one.';
    }

    // One admin per Agency (§2.2): refuse a second admin with the way out.
    if (values.role === 'admin' && targetAgency !== undefined) {
        const existing = agencyAdmin(state, targetAgency.id);

        if (existing !== undefined && existing.id !== account?.id) {
            errors.agency = `${targetAgency.agencyName} already has an admin — replace it from that Agency's detail page.`;
        }
    }

    // Never strip the last admin of a live Agency.
    if (
        account !== null &&
        account.role === 'admin' &&
        account.agencyId !== null
    ) {
        const agency = state.agencies.find(
            (entry) => entry.id === account.agencyId,
        );

        if (
            agency !== undefined &&
            agency.deletedAt === null &&
            agencyAdmin(state, agency.id)?.id === account.id
        ) {
            const staysAdmin =
                values.role === 'admin' && values.agencyId === agency.id;

            if (!staysAdmin) {
                const message = `${agency.agencyName} would be left without an admin. An Agency always has exactly one — replace it from that Agency's detail page.`;

                if (values.role !== 'admin') {
                    errors.role = errors.role ?? message;
                } else {
                    errors.agency = errors.agency ?? message;
                }
            }
        }
    }

    // Staff seats are capped; only a save that consumes a new seat at a
    // full Agency is refused (editing a suspended account frees none).
    const willCountTowardSeat =
        values.role === 'agency' &&
        (account === null ||
            (account.suspendedAt === null && account.deletedAt === null));

    if (
        errors.agency === null &&
        willCountTowardSeat &&
        targetAgency !== undefined &&
        !countsTowardSeat(account, targetAgency.id)
    ) {
        const used = agencySeatsUsed(state, targetAgency.id);

        if (used >= targetAgency.agencyUserLimit) {
            errors.agency = `${targetAgency.agencyName} is at its staff-seat limit (${used} of ${targetAgency.agencyUserLimit}). Raise the limit on that Agency's detail page before adding another agency staff account.`;
        }
    }

    return errors.name === null &&
        errors.email === null &&
        errors.role === null &&
        errors.agency === null
        ? null
        : errors;
}

/**
 * Applies a patch to one account, writes its audit row, and offers Undo.
 *
 * Undo does not commit a second audit entry — it restores the original field
 * values and drops the entry this call just wrote, so a change that was
 * reversed within the toast's window never appears to have happened.
 */
function mutateAccount(
    account: UserRecord,
    options: {
        action: string;
        changes: AuditChange[];
        patch: Partial<UserRecord>;
        undo: Partial<UserRecord>;
        message: string;
    },
): void {
    commitSystemChange({
        action: options.action,
        subjectType: 'user',
        subjectId: account.id,
        subjectLabel: account.name,
        changes: options.changes,
        apply: (current) => ({
            ...current,
            accounts: current.accounts.map((entry) =>
                entry.id === account.id
                    ? { ...entry, ...options.patch }
                    : entry,
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
                    accounts: current.accounts.map((entry) =>
                        entry.id === account.id
                            ? { ...entry, ...options.undo }
                            : entry,
                    ),
                }));
                popAuditEntry();
            },
        },
    });
}

/** One label/value line inside the read-only detail sheet. */
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

/** Read-only detail sheet for one account. */
function AccountDetailSheet({
    account,
    state,
    onClose,
}: {
    account: UserRecord;
    state: SystemState;
    onClose: () => void;
}) {
    const agency = agencyOf(state, account);
    const status = accountDisplayStatus(account);
    const soleAdmin = isSoleAdmin(state, account);

    const soleAdminNote =
        soleAdmin && agency !== undefined
            ? `“${agency.agencyName}” has exactly one admin, so this account cannot be suspended or archived while the Agency is live. Replace its admin from that Agency's detail page instead.`
            : null;

    return (
        <EntitySheet
            open
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
            title={account.name}
            description="A read-only view of this account. Choose Edit account to change it."
            data-testid="sheet-account-detail"
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
                <DetailRow label="Email">{account.email}</DetailRow>
                <DetailRow label="Role">{ROLE_LABELS[account.role]}</DetailRow>
                <DetailRow label="Agency">
                    {agency === undefined ? 'No Agency' : agency.agencyName}
                </DetailRow>
                <DetailRow label="Status">
                    {ACCOUNT_STATUS_LABELS[status]}
                </DetailRow>
                <DetailRow label="Last active">
                    {account.lastActiveAt === null
                        ? 'Never'
                        : lastActiveFormat.format(
                              new Date(account.lastActiveAt),
                          )}
                </DetailRow>
                <DetailRow label="Created">
                    {lastActiveFormat.format(new Date(account.createdAt))}
                </DetailRow>
            </dl>

            {soleAdminNote && (
                <p
                    className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--navy)]"
                    data-testid="note-sole-admin"
                >
                    {soleAdminNote}
                </p>
            )}
        </EntitySheet>
    );
}

/** Create/edit sheet for one account, with dirty tracking and inline errors. */
function AccountFormSheet({
    account,
    state,
    onClose,
}: {
    account: UserRecord | null;
    state: SystemState;
    onClose: () => void;
}) {
    const { values, setValue, isDirty } = useFormChanges<AccountForm>({
        name: account?.name ?? '',
        email: account?.email ?? '',
        role: account?.role ?? 'agency',
        agencyId: account?.agencyId ?? null,
    });
    const [errors, setErrors] = useState<FormErrors>({
        name: null,
        email: null,
        role: null,
        agency: null,
    });

    const agencies = useMemo(
        () => visibleAgencies(state.agencies),
        [state.agencies],
    );

    const needsAgency = values.role === 'admin' || values.role === 'agency';

    const targetAgency =
        values.agencyId === null
            ? undefined
            : state.agencies.find((agency) => agency.id === values.agencyId);

    const adminOfTarget =
        targetAgency === undefined
            ? undefined
            : agencyAdmin(state, targetAgency.id);

    const adminTaken =
        values.role === 'admin' &&
        targetAgency !== undefined &&
        adminOfTarget !== undefined &&
        adminOfTarget.id !== account?.id;

    const adminTakenMessage =
        adminTaken && targetAgency !== undefined && adminOfTarget !== undefined
            ? `${targetAgency.agencyName} already has ${adminOfTarget.name} as its admin — replace it from that Agency's detail page.`
            : null;

    const agencyOptions = [
        { value: 'none', label: 'Choose an Agency' },
        ...agencies.map((agency) => ({
            value: String(agency.id),
            label: agency.agencyName,
        })),
    ];

    const clearErrors = (...keys: (keyof FormErrors)[]) => {
        setErrors((current) => {
            const next = { ...current };

            for (const key of keys) {
                next[key] = null;
            }

            return next;
        });
    };

    const updateRole = (role: UserRole) => {
        clearErrors('role', 'agency');
        setValue('role', role);

        // §7.1: only staff roles are linked to an Agency.
        if (role === 'superadmin' || role === 'applicant') {
            setValue('agencyId', null);
        }
    };

    const updateAgency = (value: string) => {
        clearErrors('agency');
        setValue('agencyId', value === 'none' ? null : Number(value));
    };

    function save() {
        const nextErrors = validateAccountForm(state, values, account);

        if (nextErrors !== null) {
            setErrors(nextErrors);
            return;
        }

        const name = values.name.trim();
        const email = values.email.trim();
        const role = values.role;
        const agencyId =
            role === 'admin' || role === 'agency' ? values.agencyId : null;

        if (account === null) {
            const nextId = state.nextId;
            const stamp = new Date().toISOString();
            const actorId =
                state.accounts.find((entry) => entry.role === 'superadmin')
                    ?.id ?? null;

            commitSystemChange({
                action: 'create',
                subjectType: 'user',
                subjectId: nextId,
                subjectLabel: name,
                changes: [{ field: 'Account', from: null, to: email }],
                apply: (current) => ({
                    ...current,
                    nextId: current.nextId + 1,
                    accounts: [
                        ...current.accounts,
                        {
                            id: nextId,
                            name,
                            email,
                            emailVerifiedAt: null,
                            role,
                            agencyId,
                            createdByUserId: actorId,
                            suspendedAt: null,
                            lastActiveAt: null,
                            deletedAt: null,
                            createdAt: stamp,
                        },
                    ],
                }),
            });

            toast.success(`“${name}” added.`);
            onClose();
            return;
        }

        const changes: AuditChange[] = [];

        if (name !== account.name) {
            changes.push({ field: 'Name', from: account.name, to: name });
        }

        if (email !== account.email) {
            changes.push({ field: 'Email', from: account.email, to: email });
        }

        if (role !== account.role) {
            changes.push({
                field: 'Role',
                from: ROLE_LABELS[account.role],
                to: ROLE_LABELS[role],
            });
        }

        if (agencyId !== account.agencyId) {
            changes.push({
                field: 'Agency',
                from: agencyName(state, account.agencyId),
                to: agencyName(state, agencyId),
            });
        }

        if (changes.length === 0) {
            onClose();
            return;
        }

        mutateAccount(account, {
            action: 'update',
            changes,
            patch: { name, email, role, agencyId },
            undo: {
                name: account.name,
                email: account.email,
                role: account.role,
                agencyId: account.agencyId,
            },
            message: `“${name}” updated.`,
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
            title={account === null ? 'Add account' : 'Edit account'}
            description={
                account === null
                    ? 'Create a sign-in for one person. Every account has exactly one role.'
                    : `Change ${account.name}'s details. Every account has exactly one role.`
            }
            size="wide"
            data-testid="sheet-account-form"
            footer={
                <SheetSaveActions
                    onCancel={onClose}
                    onSave={save}
                    saveLabel={
                        account === null ? 'Add account' : 'Save changes'
                    }
                    saveDisabled={account !== null && !isDirty}
                    data-testid="sheet-save-account"
                />
            }
        >
            <DataTableField label="Full name" htmlFor="account-name">
                <Input
                    id="account-name"
                    value={values.name}
                    onChange={(event) => {
                        clearErrors('name');
                        setValue('name', event.target.value);
                    }}
                    placeholder="e.g. Joyce Rampon"
                    autoComplete="off"
                    data-testid="input-name"
                />
                <InputError
                    message={errors.name ?? undefined}
                    data-testid="error-name"
                />
            </DataTableField>

            <DataTableField label="Email" htmlFor="account-email">
                <Input
                    id="account-email"
                    type="email"
                    value={values.email}
                    onChange={(event) => {
                        clearErrors('email');
                        setValue('email', event.target.value);
                    }}
                    placeholder="name@example.com"
                    autoComplete="off"
                    data-testid="input-email"
                />
                <InputError
                    message={errors.email ?? undefined}
                    data-testid="error-email"
                />
            </DataTableField>

            <div className="flex flex-col gap-1.5">
                <DataTableField label="Role" htmlFor="account-role">
                    <DataTableSelect<UserRole>
                        id="account-role"
                        value={values.role}
                        onValueChange={updateRole}
                        options={FORM_ROLE_OPTIONS}
                        ariaLabel="Role"
                        className="w-full"
                        data-testid="select-role"
                    />
                </DataTableField>
                <p className="text-xs text-[var(--slate)]">
                    {ROLE_HINTS[values.role]}
                </p>
                <InputError
                    message={errors.role ?? undefined}
                    data-testid="error-role"
                />
            </div>

            {needsAgency ? (
                <div className="flex flex-col gap-1.5">
                    <DataTableField label="Agency" htmlFor="account-agency">
                        <DataTableSelect<string>
                            id="account-agency"
                            value={
                                values.agencyId === null
                                    ? 'none'
                                    : String(values.agencyId)
                            }
                            onValueChange={updateAgency}
                            options={agencyOptions}
                            ariaLabel="Agency"
                            className="w-full"
                            data-testid="select-agency"
                        />
                    </DataTableField>
                    <p className="text-xs text-[var(--slate)]">
                        {values.role === 'admin'
                            ? 'An Agency has exactly one admin. The admin seat is not counted toward the staff limit.'
                            : 'Agency staff count toward the Agency staff-seat limit. A suspended account is not counted.'}
                    </p>
                    {adminTakenMessage && (
                        <p
                            className="text-xs text-[var(--navy)]"
                            data-testid="hint-agency-admin"
                        >
                            {adminTakenMessage}
                        </p>
                    )}
                    <InputError
                        message={errors.agency ?? undefined}
                        data-testid="error-agency"
                    />
                </div>
            ) : (
                <LockedField
                    label="Agency"
                    value="No Agency"
                    reason={
                        values.role === 'superadmin'
                            ? 'A superadmin belongs to no Agency.'
                            : 'An applicant belongs to no Agency — only staff accounts are linked to one.'
                    }
                    data-testid="locked-agency"
                />
            )}
        </EntitySheet>
    );
}

type PendingAction =
    | {
          kind: 'suspend' | 'reactivate' | 'archive' | 'restore';
          account: UserRecord;
      }
    | { kind: 'bulk-archive'; accounts: UserRecord[] };

type SheetState = { mode: 'create' } | { mode: 'edit' | 'view'; id: number };

export default function SystemAccounts() {
    const state = useSystemState();
    const loading = useSystemLoading();
    const selection = useRowSelection();

    const [q, setQ] = useState('');
    const [role, setRole] = useState<RoleFilter>('all');
    const [status, setStatus] = useState<StatusFilter>('all');
    const [sort, setSort] = useState<SortKey>('name');
    const [page, setPage] = useState(1);
    const [pending, setPending] = useState<PendingAction | null>(null);
    const [sheet, setSheet] = useState<SheetState | null>(null);

    useEffect(() => {
        setPage(1);
    }, [q, role, status, sort]);

    const rows = useMemo(() => {
        const needle = q.trim().toLowerCase();

        const filtered = state.accounts.filter((account) => {
            const displayStatus = accountDisplayStatus(account);

            if (status === 'all') {
                if (displayStatus === 'archived') {
                    return false;
                }
            } else if (displayStatus !== status) {
                return false;
            }

            if (role !== 'all' && account.role !== role) {
                return false;
            }

            if (needle === '') {
                return true;
            }

            return [account.name, account.email].some((value) =>
                value.toLowerCase().includes(needle),
            );
        });

        return [...filtered].sort((a, b) => {
            if (sort === 'newest') {
                return b.createdAt.localeCompare(a.createdAt);
            }

            if (sort === 'active') {
                return (b.lastActiveAt ?? '').localeCompare(
                    a.lastActiveAt ?? '',
                );
            }

            return a.name.localeCompare(b.name);
        });
    }, [state, q, role, status, sort]);

    const stats = useMemo(() => {
        const live = state.accounts.filter(
            (account) => account.deletedAt === null,
        );
        const staff = live.filter(
            (account) =>
                (account.role === 'admin' || account.role === 'agency') &&
                account.agencyId !== null,
        );

        return {
            total: live.length,
            active: live.filter((account) => account.suspendedAt === null)
                .length,
            suspended: live.filter((account) => account.suspendedAt !== null)
                .length,
            agenciesRepresented: new Set(
                staff.map((account) => account.agencyId),
            ).size,
        };
    }, [state]);

    const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    const pageRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const pageIds = pageRows
        .filter(
            (account) =>
                account.deletedAt === null && !isSoleAdmin(state, account),
        )
        .map((account) => String(account.id));

    const isFiltered = q.trim() !== '' || role !== 'all' || status !== 'all';

    const resetFilters = () => {
        setQ('');
        setRole('all');
        setStatus('all');
        setPage(1);
    };

    const selectAllOnPage = () => selection.setMany(pageIds, true);

    const sheetAccount =
        sheet !== null && sheet.mode !== 'create'
            ? (state.accounts.find((account) => account.id === sheet.id) ??
              null)
            : null;

    function confirmPending() {
        if (!pending) {
            return;
        }

        if (pending.kind === 'bulk-archive') {
            const ids = pending.accounts.map((account) => account.id);
            const label = plural(ids.length, 'account');
            const stamp = new Date().toISOString();

            commitSystemChange({
                action: 'archive',
                subjectType: 'user',
                subjectId: ids.join(','),
                subjectLabel: label,
                changes: [{ field: 'Archived', from: false, to: true }],
                apply: (current) => ({
                    ...current,
                    accounts: current.accounts.map((entry) =>
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
                            accounts: current.accounts.map((entry) =>
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

        const { account, kind } = pending;
        const stamp = new Date().toISOString();

        if (kind === 'suspend') {
            mutateAccount(account, {
                action: 'suspend',
                changes: [{ field: 'Suspended', from: false, to: true }],
                patch: { suspendedAt: stamp },
                undo: { suspendedAt: account.suspendedAt },
                message: `“${account.name}” suspended.`,
            });
        } else if (kind === 'reactivate') {
            mutateAccount(account, {
                action: 'reactivate',
                changes: [{ field: 'Suspended', from: true, to: false }],
                patch: { suspendedAt: null },
                undo: { suspendedAt: account.suspendedAt },
                message: `“${account.name}” reactivated.`,
            });
        } else if (kind === 'archive') {
            mutateAccount(account, {
                action: 'archive',
                changes: [{ field: 'Archived', from: false, to: true }],
                patch: { deletedAt: stamp },
                undo: { deletedAt: account.deletedAt },
                message: `“${account.name}” archived.`,
            });
        } else {
            mutateAccount(account, {
                action: 'restore',
                changes: [{ field: 'Archived', from: true, to: false }],
                patch: { deletedAt: null },
                undo: { deletedAt: account.deletedAt },
                message: `“${account.name}” restored.`,
            });
        }

        setPending(null);
    }

    function dialogCopy(action: PendingAction) {
        if (action.kind === 'bulk-archive') {
            const posts = action.accounts.reduce(
                (sum, account) => sum + countJobPostsBy(state, account.id),
                0,
            );
            const freed = action.accounts.filter(
                (account) =>
                    account.role === 'agency' &&
                    account.agencyId !== null &&
                    account.suspendedAt === null,
            ).length;

            return {
                title: `Archive ${plural(action.accounts.length, 'account')}?`,
                description:
                    'They stop signing in and disappear from every list straight away.',
                consequences: [
                    posts > 0
                        ? `${plural(posts, 'job post')} keep the status they already have.`
                        : 'None of them posted a job post.',
                    freed > 0
                        ? `${plural(freed, 'staff seat')} freed while the accounts stay archived.`
                        : 'No staff seats are affected.',
                    'Each account can be restored on its own from the Archived filter.',
                ],
                confirmLabel: 'Archive accounts',
                destructive: true,
                testId: 'confirm-account-bulk-archive',
            };
        }

        const { account, kind } = action;
        const name = `“${account.name}”`;
        const posts = countJobPostsBy(state, account.id);
        const agency = agencyOf(state, account);
        const postsLine =
            posts > 0
                ? `${plural(posts, 'job post')} keep the status they already have.`
                : 'This account posted no job posts.';

        const seatLines = (): string[] => {
            if (agency === undefined) {
                return [];
            }

            if (account.role === 'admin') {
                return [
                    `The admin seat does not count toward ${agency.agencyName}'s staff limit.`,
                ];
            }

            if (account.role !== 'agency') {
                return [];
            }

            const used = agencySeatsUsed(state, agency.id);

            if (kind === 'suspend' || kind === 'archive') {
                return [
                    `Their staff seat at ${agency.agencyName} is freed while ${kind === 'suspend' ? 'suspended' : 'archived'} — ${Math.max(0, used - 1)} of ${agency.agencyUserLimit} in use.`,
                ];
            }

            if (account.suspendedAt !== null) {
                return [
                    `The account stays suspended, so its staff seat at ${agency.agencyName} is not counted.`,
                ];
            }

            return [
                `Their staff seat at ${agency.agencyName} counts again — ${used + 1} of ${agency.agencyUserLimit} in use.`,
            ];
        };

        if (kind === 'suspend') {
            return {
                title: 'Suspend this account?',
                description: `${name} stays in the list, but cannot sign in.`,
                consequences: [
                    ...seatLines(),
                    postsLine,
                    'You can reactivate it at any time.',
                ],
                confirmLabel: 'Suspend',
                destructive: true,
                testId: 'confirm-account-suspend',
            };
        }

        if (kind === 'reactivate') {
            return {
                title: 'Reactivate this account?',
                description: `${name} regains the ability to sign in.`,
                consequences: [...seatLines(), postsLine],
                confirmLabel: 'Reactivate',
                destructive: false,
                testId: 'confirm-account-reactivate',
            };
        }

        if (kind === 'archive') {
            return {
                title: 'Archive this account?',
                description: `${name} stops signing in and disappears from every list straight away.`,
                consequences: [
                    postsLine,
                    ...seatLines(),
                    'Restore it at any time from the Archived filter.',
                ],
                confirmLabel: 'Archive',
                destructive: true,
                testId: 'confirm-account-archive',
            };
        }

        return {
            title: 'Restore this account?',
            description: `${name} returns to every list straight away.`,
            consequences: [...seatLines(), postsLine],
            confirmLabel: 'Restore',
            destructive: false,
            testId: 'confirm-account-restore',
        };
    }

    function rowMenu(account: UserRecord) {
        const archived = account.deletedAt !== null;
        const soleAdmin = isSoleAdmin(state, account);

        const actions: SystemRowAction[] = [
            {
                label: 'View details',
                icon: Eye,
                testId: 'menu-view-account',
                onSelect: () => setSheet({ mode: 'view', id: account.id }),
            },
            {
                label: 'Edit account',
                icon: Pencil,
                testId: 'menu-edit-account',
                onSelect: () => setSheet({ mode: 'edit', id: account.id }),
            },
        ];

        if (archived) {
            actions.push({
                label: 'Restore account',
                icon: ArchiveRestore,
                testId: 'menu-restore-account',
                onSelect: () => setPending({ kind: 'restore', account }),
            });
        } else {
            if (account.suspendedAt !== null) {
                actions.push({
                    label: 'Reactivate account',
                    icon: Play,
                    testId: 'menu-reactivate-account',
                    onSelect: () => setPending({ kind: 'reactivate', account }),
                });
            } else if (!soleAdmin) {
                actions.push({
                    label: 'Suspend account',
                    icon: Pause,
                    testId: 'menu-suspend-account',
                    onSelect: () => setPending({ kind: 'suspend', account }),
                });
            }

            // An Agency's only admin is never suspended or archived (§2.2).
            if (!soleAdmin) {
                actions.push({
                    label: 'Archive account',
                    icon: Archive,
                    testId: 'menu-archive-account',
                    destructive: true,
                    hint: 'Archive stops it signing in and appearing in lists',
                    onSelect: () => setPending({ kind: 'archive', account }),
                });
            }
        }

        return <SystemRowMenu actions={actions} />;
    }

    const columns: Column<UserRecord>[] = [
        {
            key: 'select',
            header: 'Select',
            width: '84px',
            headerClassName: 'px-3',
            cell: (account) => (
                <Checkbox
                    checked={selection.isSelected(String(account.id))}
                    onCheckedChange={() => selection.toggle(String(account.id))}
                    disabled={
                        account.deletedAt !== null ||
                        isSoleAdmin(state, account)
                    }
                    aria-label={`Select ${account.name}`}
                    data-testid={`checkbox-account-${account.id}`}
                />
            ),
        },
        {
            key: 'person',
            header: 'Person',
            cell: (account) => (
                <div className="min-w-0">
                    <span className="block truncate font-medium text-[var(--navy)]">
                        {account.name}
                    </span>
                    <span className="block truncate text-xs text-[var(--slate)]">
                        {account.email}
                    </span>
                </div>
            ),
        },
        {
            key: 'role',
            header: 'Role',
            width: '140px',
            cell: (account) => (
                <span className="text-sm font-medium text-[var(--navy)]">
                    {ROLE_LABELS[account.role]}
                </span>
            ),
        },
        {
            key: 'agency',
            header: 'Agency',
            width: '180px',
            cell: (account) => {
                const agency = agencyOf(state, account);

                return agency === undefined ? (
                    <span className="text-sm text-[var(--slate)]">—</span>
                ) : (
                    <span className="block truncate text-sm text-[var(--navy)]">
                        {agency.agencyName}
                    </span>
                );
            },
        },
        {
            key: 'seat',
            header: 'Staff seat',
            width: '170px',
            cell: (account) => {
                const agency = agencyOf(state, account);

                if (account.role === 'agency' && agency !== undefined) {
                    return (
                        <SeatMeter
                            used={agencySeatsUsed(state, agency.id)}
                            limit={agency.agencyUserLimit}
                            data-testid={`seat-meter-${account.id}`}
                        />
                    );
                }

                if (account.role === 'admin' && agency !== undefined) {
                    return (
                        <span className="text-xs text-[var(--slate)]">
                            Admin seat not counted
                        </span>
                    );
                }

                return <span className="text-sm text-[var(--slate)]">—</span>;
            },
        },
        {
            key: 'status',
            header: 'Status',
            width: '120px',
            cell: (account) => {
                const displayStatus = accountDisplayStatus(account);

                return (
                    <StatusPill
                        tone={STATUS_TONE[displayStatus]}
                        dot
                        data-testid={`status-account-${account.id}`}
                    >
                        {ACCOUNT_STATUS_LABELS[displayStatus]}
                    </StatusPill>
                );
            },
        },
        {
            key: 'last-active',
            header: 'Last active',
            width: '150px',
            cell: (account) =>
                account.lastActiveAt === null ? (
                    <span className="text-sm text-[var(--slate)]">Never</span>
                ) : (
                    <span className="text-sm text-[var(--navy)]">
                        {lastActiveFormat.format(
                            new Date(account.lastActiveAt),
                        )}
                    </span>
                ),
        },
    ];

    const copy = pending ? dialogCopy(pending) : null;

    return (
        <>
            <Head title="Accounts" />

            <SystemPage>
                <SystemPageHeader
                    title="Accounts"
                    subtitle="Every person who can sign in to the platform, and the Agency each staff account belongs to."
                    action={{
                        label: 'Add account',
                        onClick: () => setSheet({ mode: 'create' }),
                        testId: 'button-account-add',
                    }}
                    data-testid="header-accounts"
                />

                <KpiGrid>
                    <KpiCard
                        label="Total accounts"
                        value={stats.total}
                        loading={loading}
                        caption="Active and suspended"
                        icon={Users}
                        tone="blue"
                        data-testid="kpi-accounts"
                    />
                    <KpiCard
                        label="Active"
                        value={stats.active}
                        loading={loading}
                        caption="Can sign in"
                        icon={ShieldCheck}
                        tone="emerald"
                        data-testid="kpi-accounts-active"
                    />
                    <KpiCard
                        label="Suspended"
                        value={stats.suspended}
                        loading={loading}
                        caption="Cannot sign in"
                        icon={ShieldAlert}
                        tone="amber"
                        data-testid="kpi-accounts-suspended"
                    />
                    <KpiCard
                        label="Agencies represented"
                        value={stats.agenciesRepresented}
                        loading={loading}
                        caption="With at least one live staff account"
                        icon={Building2}
                        tone="teal"
                        data-testid="kpi-accounts-agencies"
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
                        {role !== 'all' && (
                            <FilterChip
                                label="Role"
                                value={ROLE_LABELS[role]}
                                onRemove={() => setRole('all')}
                                testId="chip-role"
                            />
                        )}
                        {status !== 'all' && (
                            <FilterChip
                                label="Status"
                                value={ACCOUNT_STATUS_LABELS[status]}
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

                <DataTable<UserRecord>
                    columns={columns}
                    data={pageRows}
                    loading={loading}
                    getRowId={(account) => String(account.id)}
                    getRowTestId={(account) => `row-account-${account.id}`}
                    getRowAccent={(account) =>
                        ACCENT[accountDisplayStatus(account)]
                    }
                    renderRowActions={rowMenu}
                    toolbar={
                        <DataTableToolbar data-testid="accounts-table-toolbar">
                            <BulkBar
                                count={selection.count}
                                label="accounts"
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
                                            accounts: rows.filter(
                                                (account) =>
                                                    selection.isSelected(
                                                        String(account.id),
                                                    ) &&
                                                    account.deletedAt === null,
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
                                htmlFor="filter-account-search"
                                className="basis-full sm:min-w-64 sm:flex-1 sm:basis-auto"
                            >
                                <DataTableSearch
                                    id="filter-account-search"
                                    value={q}
                                    onChange={setQ}
                                    placeholder="Search by name or email..."
                                    className="w-full"
                                    data-testid="input-search-accounts"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Role"
                                htmlFor="filter-account-role"
                            >
                                <DataTableSelect<RoleFilter>
                                    id="filter-account-role"
                                    value={role}
                                    onValueChange={setRole}
                                    options={ROLE_FILTER_OPTIONS}
                                    ariaLabel="Filter by role"
                                    data-testid="select-account-role"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Status"
                                htmlFor="filter-account-status"
                            >
                                <DataTableSelect<StatusFilter>
                                    id="filter-account-status"
                                    value={status}
                                    onValueChange={setStatus}
                                    options={STATUS_OPTIONS}
                                    ariaLabel="Filter by status"
                                    data-testid="select-account-status"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Sort by"
                                htmlFor="filter-account-sort"
                            >
                                <DataTableSelect<SortKey>
                                    id="filter-account-sort"
                                    value={sort}
                                    onValueChange={setSort}
                                    options={SORT_OPTIONS}
                                    ariaLabel="Sort accounts"
                                    data-testid="select-account-sort"
                                />
                            </DataTableField>
                            <DataTableRefreshButton
                                onClick={resetFilters}
                                spinning={loading}
                                data-testid="button-refresh-accounts"
                            />
                        </DataTableToolbar>
                    }
                    pagination={{
                        page,
                        totalPages,
                        onPageChange: setPage,
                        alwaysShow: true,
                        label: 'Accounts pagination',
                        testIdPrefix: 'accounts-pagination',
                    }}
                    emptyState={
                        <DashboardEmptyState
                            icon={isFiltered ? SearchX : Users}
                            title={
                                isFiltered
                                    ? 'No accounts match your filters'
                                    : 'No accounts yet'
                            }
                            message={
                                isFiltered
                                    ? 'Try a different name, role or status.'
                                    : 'Add the first account so your team can sign in.'
                            }
                            onReset={isFiltered ? resetFilters : undefined}
                        />
                    }
                    data-testid="table-accounts"
                />
            </SystemPage>

            {sheet?.mode === 'create' && (
                <AccountFormSheet
                    key="create-account"
                    account={null}
                    state={state}
                    onClose={() => setSheet(null)}
                />
            )}

            {sheet?.mode === 'edit' && sheetAccount !== null && (
                <AccountFormSheet
                    key={`edit-account-${sheetAccount.id}`}
                    account={sheetAccount}
                    state={state}
                    onClose={() => setSheet(null)}
                />
            )}

            {sheet?.mode === 'view' && sheetAccount !== null && (
                <AccountDetailSheet
                    key={`view-account-${sheetAccount.id}`}
                    account={sheetAccount}
                    state={state}
                    onClose={() => setSheet(null)}
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

SystemAccounts.layout = {
    breadcrumbs: [
        {
            title: 'Accounts',
            href: system.accounts(),
        },
    ],
};
