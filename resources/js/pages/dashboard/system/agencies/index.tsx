import { Head, Link, router } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    Building2,
    Eye,
    Pause,
    Play,
    SearchX,
    ShieldAlert,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { StatusPillTone } from '@/components/dashboard/badges';
import { PathwayBadge, StatusPill } from '@/components/dashboard/badges';
import { FilterChip } from '@/components/dashboard/filter-chip';
import { DashboardEmptyState } from '@/components/dashboard/empty-state';
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
import { KpiCard, KpiGrid } from '@/components/system/system-kpi-card';
import { SeatMeter } from '@/components/system/seat-meter';
import { SystemPage } from '@/components/system/system-page';
import { SystemPageHeader } from '@/components/system/system-page-header';
import { SystemRowMenu } from '@/components/system/system-row-menu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useRowSelection } from '@/hooks/use-row-selection';
import { useSystemLoading } from '@/hooks/use-system-loading';
import type { AgencyDisplayStatus } from '@/data/system/selectors';
import {
    AGENCY_STATUS_LABELS,
    agencyDisplayStatus,
    agencyJobPosts,
    agencySeatsUsed,
} from '@/data/system/selectors';
import {
    commitSystemChange,
    popAuditEntry,
    updateSystemState,
    useSystemState,
} from '@/data/system/store';
import type { AuditChange, AgencyRecord } from '@/data/system/types';
import * as system from '@/routes/dashboard/system';
import {
    create as agencyCreate,
    show as agencyShow,
} from '@/routes/dashboard/system/agencies';
import type { Pathway } from '@/types/agency';

/**
 * Agencies, all agencies in one list (§4.4).
 *
 * The one screen a superadmin lands on for this entity: search, two filters,
 * a sort, bulk archive, and a row menu that offers the reversible verbs only.
 * Detail and creation live on their own routes (`/agencies/{id}` and
 * `/agencies/new`) so they can be linked to and reloaded; everything here is
 * derived from the in-memory store, so a browser refresh resets it.
 */

const PER_PAGE = 8;

type StatusFilter = 'all' | AgencyDisplayStatus;
type PathwayFilter = 'all' | Pathway;
type SortKey = 'name' | 'newest' | 'staff' | 'posts';

const STATUS_TONE: Record<AgencyDisplayStatus, StatusPillTone> = {
    active: 'success',
    suspended: 'warning',
    archived: 'neutral',
};

const ACCENT: Record<AgencyDisplayStatus, 'teal' | 'amber' | 'neutral'> = {
    active: 'teal',
    suspended: 'amber',
    archived: 'neutral',
};

const PATHWAY_OPTIONS = [
    { value: 'all', label: 'All pathways' },
    { value: 'landbased', label: 'Land-based' },
    { value: 'seabased', label: 'Sea-based' },
];

/** `all` deliberately excludes archived — archive removes a record from lists. */
const STATUS_OPTIONS = [
    { value: 'all', label: 'Active and suspended' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'archived', label: 'Archived' },
];

const SORT_OPTIONS = [
    { value: 'name', label: 'Name A–Z' },
    { value: 'newest', label: 'Newest first' },
    { value: 'staff', label: 'Most staff seats' },
    { value: 'posts', label: 'Most job posts' },
];

function pathwayLabel(pathway: Pathway): string {
    return pathway === 'landbased' ? 'Land-based' : 'Sea-based';
}

type PendingAction =
    | {
          kind: 'suspend' | 'reactivate' | 'archive' | 'restore';
          agency: AgencyRecord;
      }
    | { kind: 'bulk-archive'; agencies: AgencyRecord[] };

/**
 * Applies a patch to one Agency, writes its audit row, and offers Undo.
 *
 * Undo does not commit a second audit entry — it restores the original field
 * values and drops the entry this call just wrote, so a change that was
 * reversed within the toast's window never appears to have happened.
 */
function mutateAgency(
    agency: AgencyRecord,
    options: {
        action: string;
        changes: AuditChange[];
        patch: Partial<AgencyRecord>;
        undo: Partial<AgencyRecord>;
        message: string;
    },
): void {
    commitSystemChange({
        action: options.action,
        subjectType: 'agency',
        subjectId: agency.id,
        subjectLabel: agency.agencyName,
        changes: options.changes,
        apply: (current) => ({
            ...current,
            agencies: current.agencies.map((entry) =>
                entry.id === agency.id ? { ...entry, ...options.patch } : entry,
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
                    agencies: current.agencies.map((entry) =>
                        entry.id === agency.id
                            ? { ...entry, ...options.undo }
                            : entry,
                    ),
                }));
                popAuditEntry();
            },
        },
    });
}

export default function SystemAgencies() {
    const state = useSystemState();
    const loading = useSystemLoading();
    const selection = useRowSelection();

    const [q, setQ] = useState('');
    const [pathway, setPathway] = useState<PathwayFilter>('all');
    const [status, setStatus] = useState<StatusFilter>('all');
    const [sort, setSort] = useState<SortKey>('name');
    const [page, setPage] = useState(1);
    const [pending, setPending] = useState<PendingAction | null>(null);

    useEffect(() => {
        setPage(1);
    }, [q, pathway, status, sort]);

    const rows = useMemo(() => {
        const needle = q.trim().toLowerCase();

        const filtered = state.agencies.filter((agency) => {
            const displayStatus = agencyDisplayStatus(agency);

            if (status === 'all') {
                if (displayStatus === 'archived') {
                    return false;
                }
            } else if (displayStatus !== status) {
                return false;
            }

            if (pathway !== 'all' && agency.pathway !== pathway) {
                return false;
            }

            if (needle === '') {
                return true;
            }

            return [
                agency.agencyName,
                agency.slug,
                agency.dmwLicenseNumber ?? '',
                agency.headquartersCity,
            ].some((value) => value.toLowerCase().includes(needle));
        });

        return [...filtered].sort((a, b) => {
            if (sort === 'newest') {
                return b.createdAt.localeCompare(a.createdAt);
            }

            if (sort === 'staff') {
                return (
                    agencySeatsUsed(state, b.id) - agencySeatsUsed(state, a.id)
                );
            }

            if (sort === 'posts') {
                return (
                    agencyJobPosts(state, b.id).length -
                    agencyJobPosts(state, a.id).length
                );
            }

            return a.agencyName.localeCompare(b.agencyName);
        });
    }, [state, q, pathway, status, sort]);

    const stats = useMemo(() => {
        const live = state.agencies.filter(
            (agency) => agencyDisplayStatus(agency) !== 'archived',
        );

        return {
            total: live.length,
            verified: live.filter((agency) => agency.verifiedAt !== null)
                .length,
            suspended: live.filter((agency) => agency.suspendedAt !== null)
                .length,
            seatsUsed: state.accounts.filter(
                (account) =>
                    account.role === 'agency' &&
                    account.agencyId !== null &&
                    account.suspendedAt === null &&
                    account.deletedAt === null,
            ).length,
            seatsLimit: live.reduce(
                (sum, agency) => sum + agency.agencyUserLimit,
                0,
            ),
        };
    }, [state]);

    const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    const pageRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const pageIds = pageRows.map((agency) => String(agency.id));

    const isFiltered = q.trim() !== '' || pathway !== 'all' || status !== 'all';

    const resetFilters = () => {
        setQ('');
        setPathway('all');
        setStatus('all');
        setPage(1);
    };

    const selectAllOnPage = () => selection.setMany(pageIds, true);

    function confirmPending() {
        if (!pending) {
            return;
        }

        if (pending.kind === 'bulk-archive') {
            const ids = pending.agencies.map((agency) => agency.id);
            const stamp = new Date().toISOString();
            const label = `${pending.agencies.length} agencies`;

            commitSystemChange({
                action: 'archive',
                subjectType: 'agency',
                subjectId: ids.join(','),
                subjectLabel: label,
                changes: [{ field: 'Archived', from: false, to: true }],
                apply: (current) => ({
                    ...current,
                    agencies: current.agencies.map((entry) =>
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
                            agencies: current.agencies.map((entry) =>
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

        const { agency, kind } = pending;
        const stamp = new Date().toISOString();

        if (kind === 'suspend') {
            mutateAgency(agency, {
                action: 'suspend',
                changes: [{ field: 'Suspended', from: false, to: true }],
                patch: { suspendedAt: stamp },
                undo: { suspendedAt: agency.suspendedAt },
                message: `“${agency.agencyName}” suspended.`,
            });
        } else if (kind === 'reactivate') {
            mutateAgency(agency, {
                action: 'reactivate',
                changes: [{ field: 'Suspended', from: true, to: false }],
                patch: { suspendedAt: null },
                undo: { suspendedAt: agency.suspendedAt },
                message: `“${agency.agencyName}” reactivated.`,
            });
        } else if (kind === 'archive') {
            mutateAgency(agency, {
                action: 'archive',
                changes: [{ field: 'Archived', from: false, to: true }],
                patch: { deletedAt: stamp },
                undo: { deletedAt: agency.deletedAt },
                message: `“${agency.agencyName}” archived.`,
            });
        } else {
            mutateAgency(agency, {
                action: 'restore',
                changes: [{ field: 'Archived', from: true, to: false }],
                patch: { deletedAt: null },
                undo: { deletedAt: agency.deletedAt },
                message: `“${agency.agencyName}” restored.`,
            });
        }

        setPending(null);
    }

    function dialogCopy(action: PendingAction) {
        if (action.kind === 'bulk-archive') {
            const posts = action.agencies.reduce(
                (sum, agency) => sum + agencyJobPosts(state, agency.id).length,
                0,
            );

            return {
                title: `Archive ${action.agencies.length} agencies?`,
                description: 'They leave every list straight away.',
                consequences: [
                    `${posts} job posts stay attached and keep the status they already have.`,
                    'Each Agency can be brought back on its own from the Archived filter.',
                    'Staff seats are held until an Agency is restored.',
                ],
                confirmLabel: 'Archive agencies',
                destructive: true,
                testId: 'confirm-agency-bulk-archive',
            };
        }

        const { agency, kind } = action;
        const posts = agencyJobPosts(state, agency.id).length;
        const seats = agencySeatsUsed(state, agency.id);

        if (kind === 'suspend') {
            return {
                title: 'Suspend this agency?',
                description: `“${agency.agencyName}” stays in the list, but its staff cannot sign in.`,
                consequences: [
                    `${seats} of ${agency.agencyUserLimit} staff seats are held while suspended.`,
                    `${posts} job posts stay live under their existing status.`,
                    'You can reactivate it at any time.',
                ],
                confirmLabel: 'Suspend',
                destructive: true,
                testId: 'confirm-agency-suspend',
            };
        }

        if (kind === 'reactivate') {
            return {
                title: 'Reactivate this agency?',
                description: `“${agency.agencyName}” and its staff regain access.`,
                consequences: [
                    `${seats} of ${agency.agencyUserLimit} staff seats will be in use.`,
                    `${posts} job posts are already live under their existing status.`,
                ],
                confirmLabel: 'Reactivate',
                destructive: false,
                testId: 'confirm-agency-reactivate',
            };
        }

        if (kind === 'archive') {
            return {
                title: 'Archive this agency?',
                description: `“${agency.agencyName}” disappears from every list straight away.`,
                consequences: [
                    `${posts} job posts stay attached and keep the status they already have.`,
                    `${seats} staff accounts keep their seats while it is archived.`,
                    'Restore it at any time from the Archived filter.',
                ],
                confirmLabel: 'Archive',
                destructive: true,
                testId: 'confirm-agency-archive',
            };
        }

        return {
            title: 'Restore this agency?',
            description: `“${agency.agencyName}” returns to every list and picker.`,
            consequences: [
                `It will show ${seats} of ${agency.agencyUserLimit} staff seats in use.`,
                `${posts} job posts need no change of their own.`,
            ],
            confirmLabel: 'Restore',
            destructive: false,
            testId: 'confirm-agency-restore',
        };
    }

    function rowMenu(agency: AgencyRecord) {
        const archived = agency.deletedAt !== null;

        const actions = [
            {
                label: 'View details',
                icon: Eye,
                testId: 'menu-view-agency',
                onSelect: () =>
                    router.get(agencyShow({ agency: agency.id }).url),
            },
        ];

        if (archived) {
            actions.push({
                label: 'Restore agency',
                icon: ArchiveRestore,
                testId: 'menu-restore-agency',
                onSelect: () => setPending({ kind: 'restore', agency }),
            });
        } else {
            if (agency.suspendedAt === null) {
                actions.push({
                    label: 'Suspend agency',
                    icon: Pause,
                    testId: 'menu-suspend-agency',
                    onSelect: () => setPending({ kind: 'suspend', agency }),
                });
            } else {
                actions.push({
                    label: 'Reactivate agency',
                    icon: Play,
                    testId: 'menu-reactivate-agency',
                    onSelect: () => setPending({ kind: 'reactivate', agency }),
                });
            }

            actions.push({
                label: 'Archive agency',
                icon: Archive,
                testId: 'menu-archive-agency',
                onSelect: () => setPending({ kind: 'archive', agency }),
            });
        }

        return <SystemRowMenu actions={actions} />;
    }

    const columns: Column<AgencyRecord>[] = [
        {
            key: 'select',
            header: 'Select',
            width: '84px',
            headerClassName: 'px-3',
            cell: (agency) => (
                <Checkbox
                    checked={selection.isSelected(String(agency.id))}
                    onCheckedChange={() => selection.toggle(String(agency.id))}
                    aria-label={`Select ${agency.agencyName}`}
                    data-testid={`checkbox-agency-${agency.id}`}
                />
            ),
        },
        {
            key: 'agency',
            header: 'Agency',
            cell: (agency) => (
                <div className="min-w-0">
                    <Link
                        href={agencyShow({ agency: agency.id })}
                        data-testid={`link-agency-${agency.id}`}
                        className="block truncate font-medium text-[var(--navy)] transition-colors hover:text-[var(--teal-ink)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
                    >
                        {agency.agencyName}
                    </Link>
                    <span className="block truncate text-xs text-[var(--slate)]">
                        {agency.headquartersCity} · /{agency.slug}
                    </span>
                </div>
            ),
        },
        {
            key: 'pathway',
            header: 'Pathway',
            width: '130px',
            cell: (agency) => <PathwayBadge pathway={agency.pathway} />,
        },
        {
            key: 'licence',
            header: 'DMW licence',
            width: '150px',
            cell: (agency) => (
                <span className="text-xs font-medium text-[var(--slate)] tabular-nums">
                    {agency.dmwLicenseNumber}
                </span>
            ),
        },
        {
            key: 'staff',
            header: 'Staff seats',
            width: '170px',
            cell: (agency) => (
                <SeatMeter
                    used={agencySeatsUsed(state, agency.id)}
                    limit={agency.agencyUserLimit}
                    data-testid={`seat-meter-${agency.id}`}
                />
            ),
        },
        {
            key: 'posts',
            header: 'Job posts',
            width: '110px',
            align: 'right',
            cell: (agency) => (
                <span className="text-sm font-medium text-[var(--navy)] tabular-nums">
                    {agencyJobPosts(state, agency.id).length}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            width: '130px',
            cell: (agency) => {
                const displayStatus = agencyDisplayStatus(agency);

                return (
                    <StatusPill
                        tone={STATUS_TONE[displayStatus]}
                        dot
                        data-testid={`status-agency-${agency.id}`}
                    >
                        {AGENCY_STATUS_LABELS[displayStatus]}
                    </StatusPill>
                );
            },
        },
    ];

    const copy = pending ? dialogCopy(pending) : null;

    return (
        <>
            <Head title="Agencies" />

            <SystemPage>
                <SystemPageHeader
                    title="Agencies"
                    subtitle="Every licensed Agency on the platform, with its staff seats and job posts."
                    action={{
                        label: 'Add agency',
                        href: agencyCreate(),
                        testId: 'button-agency-add',
                    }}
                    data-testid="header-agencies"
                />

                <KpiGrid>
                    <KpiCard
                        label="Agencies"
                        value={stats.total}
                        loading={loading}
                        caption="Active and suspended"
                        icon={Building2}
                        tone="blue"
                        data-testid="kpi-agencies"
                    />
                    <KpiCard
                        label="Verified"
                        value={stats.verified}
                        loading={loading}
                        caption="Licence confirmed"
                        icon={ShieldCheck}
                        tone="emerald"
                        data-testid="kpi-agencies-verified"
                    />
                    <KpiCard
                        label="Suspended"
                        value={stats.suspended}
                        loading={loading}
                        caption="Staff cannot sign in"
                        icon={ShieldAlert}
                        tone="amber"
                        data-testid="kpi-agencies-suspended"
                    />
                    <KpiCard
                        label="Staff seats"
                        value={`${stats.seatsUsed} / ${stats.seatsLimit}`}
                        loading={loading}
                        caption="Seats in use across all Agencies"
                        icon={Users}
                        tone="teal"
                        data-testid="kpi-agencies-seats"
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
                        {status !== 'all' && (
                            <FilterChip
                                label="Status"
                                value={AGENCY_STATUS_LABELS[status]}
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

                <DataTable<AgencyRecord>
                    columns={columns}
                    data={pageRows}
                    loading={loading}
                    getRowId={(agency) => String(agency.id)}
                    getRowTestId={(agency) => `row-agency-${agency.id}`}
                    getRowAccent={(agency) =>
                        ACCENT[agencyDisplayStatus(agency)]
                    }
                    renderRowActions={rowMenu}
                    toolbar={
                        <DataTableToolbar data-testid="agencies-table-toolbar">
                            <BulkBar
                                count={selection.count}
                                label="agencies"
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
                                            agencies: rows.filter((agency) =>
                                                selection.isSelected(
                                                    String(agency.id),
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
                                htmlFor="filter-agency-search"
                                className="basis-full sm:min-w-64 sm:flex-1 sm:basis-auto"
                            >
                                <DataTableSearch
                                    id="filter-agency-search"
                                    value={q}
                                    onChange={setQ}
                                    placeholder="Search Agencies by name, licence or city..."
                                    className="w-full"
                                    data-testid="input-search-agencies"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Pathway"
                                htmlFor="filter-agency-pathway"
                            >
                                <DataTableSelect<PathwayFilter>
                                    id="filter-agency-pathway"
                                    value={pathway}
                                    onValueChange={setPathway}
                                    options={PATHWAY_OPTIONS}
                                    ariaLabel="Filter by pathway"
                                    data-testid="select-agency-pathway"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Status"
                                htmlFor="filter-agency-status"
                            >
                                <DataTableSelect<StatusFilter>
                                    id="filter-agency-status"
                                    value={status}
                                    onValueChange={setStatus}
                                    options={STATUS_OPTIONS}
                                    ariaLabel="Filter by status"
                                    data-testid="select-agency-status"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Sort by"
                                htmlFor="filter-agency-sort"
                            >
                                <DataTableSelect<SortKey>
                                    id="filter-agency-sort"
                                    value={sort}
                                    onValueChange={setSort}
                                    options={SORT_OPTIONS}
                                    ariaLabel="Sort Agencies"
                                    data-testid="select-agency-sort"
                                />
                            </DataTableField>
                            <DataTableRefreshButton
                                onClick={resetFilters}
                                spinning={loading}
                                data-testid="button-refresh-agencies"
                            />
                        </DataTableToolbar>
                    }
                    pagination={{
                        page,
                        totalPages,
                        onPageChange: setPage,
                        alwaysShow: true,
                        label: 'Agencies pagination',
                        testIdPrefix: 'agencies-pagination',
                    }}
                    emptyState={
                        <DashboardEmptyState
                            icon={isFiltered ? SearchX : Building2}
                            title={
                                isFiltered
                                    ? 'No Agencies match your filters'
                                    : 'No Agencies yet'
                            }
                            message={
                                isFiltered
                                    ? 'Try a different name, pathway or status.'
                                    : 'Add the first Agency to start posting jobs.'
                            }
                            onReset={isFiltered ? resetFilters : undefined}
                        />
                    }
                    data-testid="table-agencies"
                />
            </SystemPage>

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

SystemAgencies.layout = {
    breadcrumbs: [
        {
            title: 'Agencies',
            href: system.agencies(),
        },
    ],
};
