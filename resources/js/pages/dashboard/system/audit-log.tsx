import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarDays,
    Eye,
    History,
    Layers,
    SearchX,
    UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { StatusPill } from '@/components/dashboard/badges';
import type { StatusPillTone } from '@/components/dashboard/badges';
import {
    DataTable,
    DataTableField,
    DataTableRefreshButton,
    DataTableSearch,
    DataTableSelect,
    DataTableToolbar,
} from '@/components/dashboard/data-table';
import type { Column } from '@/components/dashboard/data-table';
import { DashboardEmptyState } from '@/components/dashboard/empty-state';
import { FilterChip } from '@/components/dashboard/filter-chip';
import { KpiCard, KpiGrid } from '@/components/system/system-kpi-card';
import { SystemPage } from '@/components/system/system-page';
import { EntitySheet } from '@/components/system/entity-sheet';
import { SystemPageHeader } from '@/components/system/system-page-header';
import { SystemRowMenu } from '@/components/system/system-row-menu';
import { Button } from '@/components/ui/button';
import { useSystemLoading } from '@/hooks/use-system-loading';
import { useSystemState } from '@/data/system/store';
import * as system from '@/routes/dashboard/system';
import type {
    AuditChange,
    AuditEntry,
    AuditSubjectType,
} from '@/data/system/types';

/**
 * Audit log (§4.11).
 *
 * The one screen in the Super Admin console that is purely a record: every
 * mutation elsewhere writes an `AuditEntry` inside `commitSystemChange`,
 * and this page only reads `state.audit` — it is never itself an actor.
 * The table stays terse (who, what, which record, the first field-level
 * changes); the full field-by-field diff lives in the right-hand sheet.
 */

const PER_PAGE = 10;

/** Console verb labels for the actions the store writes, past tense. */
const ACTION_META: Record<string, { label: string; tone: StatusPillTone }> = {
    create: { label: 'Added', tone: 'success' },
    update: { label: 'Updated', tone: 'info' },
    edit: { label: 'Edited', tone: 'info' },
    rename: { label: 'Renamed', tone: 'info' },
    move: { label: 'Moved', tone: 'info' },
    reorder: { label: 'Reordered', tone: 'info' },
    archive: { label: 'Archived', tone: 'neutral' },
    restore: { label: 'Restored', tone: 'success' },
    suspend: { label: 'Suspended', tone: 'warning' },
    reactivate: { label: 'Reactivated', tone: 'success' },
    verify: { label: 'Verified', tone: 'teal' },
};

/** Neutral display labels for every `AuditSubjectType` (§6.1). */
const SUBJECT_LABELS: Record<AuditSubjectType, string> = {
    agency: 'Agency',
    user: 'Account',
    job_post: 'Job post',
    application: 'Application',
    applicant: 'Applicant',
    review: 'Agency review',
    category: 'Category',
    subcategory: 'Subcategory',
    option: 'Option list',
    form_field: 'Form field',
    custom_field: 'Custom field',
    content: 'Site content',
    settings: 'Settings',
};

const eventDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const eventTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
});

const eventStamp = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

/**
 * Human label for an action. Known verbs read as the console's own past
 * tense; anything a future screen writes is humanised rather than hidden.
 */
function actionLabel(action: string): string {
    const known = ACTION_META[action];

    if (known) {
        return known.label;
    }

    const words = action.replace(/[_-]+/g, ' ').trim();

    if (words === '') {
        return 'Changed';
    }

    return words.charAt(0).toUpperCase() + words.slice(1);
}

function actionTone(action: string): StatusPillTone {
    return ACTION_META[action]?.tone ?? 'neutral';
}

/** Null and blank values read as an em dash in every diff. */
function formatValue(value: string | number | boolean | null): string {
    if (value === null || value === '') {
        return '—';
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    return String(value);
}

function changeTitle(change: AuditChange): string {
    return `${change.field}: ${formatValue(change.from)} → ${formatValue(change.to)}`;
}

/**
 * The console screen a subject type belongs to, for the optional
 * cross-link in the detail sheet. Two types return `null` so the
 * cross-link is omitted rather than rendered dead: `option` has no
 * dedicated route, and `settings` has no console screen at all —
 * account-level settings live with the signed-in user, so there is
 * nothing on this side to open.
 */
function subjectScreen(
    type: AuditSubjectType,
): { name: string; href: string } | null {
    switch (type) {
        case 'agency':
            return { name: 'Agencies', href: system.agencies().url };
        case 'user':
            return { name: 'Accounts', href: system.accounts().url };
        case 'job_post':
            return { name: 'Job posts', href: system.jobPosts().url };
        case 'application':
            return { name: 'Applications', href: system.applications().url };
        case 'applicant':
            return { name: 'Applicants', href: system.applicants().url };
        case 'review':
            return { name: 'Reviews', href: system.reviews().url };
        case 'category':
        case 'subcategory':
            return { name: 'Categories', href: system.categories().url };
        case 'form_field':
        case 'custom_field':
            return { name: 'Fields', href: system.fields().url };
        case 'content':
            return { name: 'Site content', href: system.content().url };
        case 'settings':
        case 'option':
            return null;
    }
}

/** True when the entry's actor no longer resolves against `state.accounts`. */
function actorName(
    accounts: Map<number, { name: string }>,
    actorUserId: number,
): string {
    return accounts.get(actorUserId)?.name ?? 'Unknown actor';
}

/** One label/value line inside the detail sheet. */
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

/** The read-only detail sheet for one audit entry. */
function AuditDetailSheet({
    entry,
    actor,
    onClose,
}: {
    entry: AuditEntry;
    actor: { name: string; email: string } | undefined;
    onClose: () => void;
}) {
    const screen = subjectScreen(entry.subjectType);

    return (
        <EntitySheet
            open
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
            title={`${actionLabel(entry.action)} ${SUBJECT_LABELS[entry.subjectType].toLowerCase()}`}
            description="A read-only record of this change. Entries are never edited."
            data-testid="sheet-audit-entry"
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
                <DetailRow label="Actor">
                    <span className="block font-semibold text-[var(--navy-deep)]">
                        {actor?.name ?? 'Unknown actor'}
                    </span>
                    <span className="block text-xs text-[var(--slate)]">
                        {actor?.email ?? 'No account on file'}
                    </span>
                </DetailRow>
                <DetailRow label="When">
                    {eventStamp.format(new Date(entry.createdAt))}
                </DetailRow>
                <DetailRow label="IP address">
                    <span className="font-mono text-xs">{entry.ipAddress}</span>
                </DetailRow>
                <DetailRow label="Subject">
                    <span className="block font-semibold text-[var(--navy-deep)]">
                        {entry.subjectLabel}
                    </span>
                    <span className="block text-xs text-[var(--slate)]">
                        {SUBJECT_LABELS[entry.subjectType]} #{entry.subjectId}
                    </span>
                </DetailRow>
            </dl>

            <section className="flex flex-col gap-3 border-t border-[var(--line)] pt-4">
                <h3 className="text-[11px] font-semibold tracking-[0.06em] text-[var(--slate)] uppercase">
                    Changes ({entry.changes.length})
                </h3>

                {entry.changes.length === 0 ? (
                    <p className="text-sm text-[var(--slate)]">
                        This entry recorded no field-level changes.
                    </p>
                ) : (
                    <ul className="flex flex-col">
                        {entry.changes.map((change, index) => (
                            <li
                                key={`${change.field}-${index}`}
                                className="flex flex-col gap-1.5 border-t border-[var(--line)] py-3 first:border-t-0 first:pt-0"
                            >
                                <span className="text-sm font-semibold text-[var(--navy)]">
                                    {change.field}
                                </span>
                                <span className="flex flex-wrap items-center gap-2 text-sm">
                                    <span className="max-w-[14rem] truncate rounded-md bg-[var(--surface-soft)] px-2 py-0.5 text-[var(--slate)]">
                                        {formatValue(change.from)}
                                    </span>
                                    <ArrowRight
                                        className="size-3.5 shrink-0 text-[var(--slate)]"
                                        aria-hidden="true"
                                    />
                                    <span className="max-w-[14rem] truncate rounded-md bg-[var(--teal-light)] px-2 py-0.5 font-medium text-[var(--teal-ink)]">
                                        {formatValue(change.to)}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {screen && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-4">
                    <span className="text-[11px] font-semibold tracking-[0.06em] text-[var(--slate)] uppercase">
                        Console screen
                    </span>
                    <Link
                        href={screen.href}
                        className="rounded-sm text-sm font-semibold text-[var(--teal-ink)] underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
                        data-testid="link-audit-screen"
                    >
                        Open {screen.name}{' '}
                        <ArrowRight
                            className="inline size-3.5"
                            aria-hidden="true"
                        />
                    </Link>
                </div>
            )}
        </EntitySheet>
    );
}

function AuditRowMenu({
    entry,
    onView,
}: {
    entry: AuditEntry;
    onView: () => void;
}) {
    return (
        <SystemRowMenu
            label={`Actions for ${entry.subjectLabel}`}
            testId={`row-menu-audit-${entry.id}`}
            actions={[
                {
                    label: 'View details',
                    icon: Eye,
                    onSelect: onView,
                    testId: 'menu-view-audit',
                },
            ]}
        />
    );
}

export default function SystemAuditLog() {
    const state = useSystemState();
    const loading = useSystemLoading();

    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [subjectFilter, setSubjectFilter] = useState<
        AuditSubjectType | 'all'
    >('all');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<AuditEntry | null>(null);

    const accountsById = useMemo(
        () => new Map(state.accounts.map((account) => [account.id, account])),
        [state.accounts],
    );

    // Newest first — the store prepends new entries, but a stable sort
    // keeps the order correct however the array arrives.
    const sorted = useMemo(
        () =>
            [...state.audit].sort((a, b) =>
                b.createdAt.localeCompare(a.createdAt),
            ),
        [state.audit],
    );

    // Filter options are derived from the data, so the toolbar never
    // offers an action or subject type that matches nothing.
    const actionOptions = useMemo(
        () => [
            { value: 'all', label: 'All actions' },
            ...Array.from(new Set(sorted.map((entry) => entry.action))).map(
                (action) => ({ value: action, label: actionLabel(action) }),
            ),
        ],
        [sorted],
    );

    const subjectOptions = useMemo(
        () => [
            { value: 'all' as const, label: 'All subjects' },
            ...Array.from(
                new Set(sorted.map((entry) => entry.subjectType)),
            ).map((type) => ({ value: type, label: SUBJECT_LABELS[type] })),
        ],
        [sorted],
    );

    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return sorted.filter((entry) => {
            if (actionFilter !== 'all' && entry.action !== actionFilter) {
                return false;
            }

            if (
                subjectFilter !== 'all' &&
                entry.subjectType !== subjectFilter
            ) {
                return false;
            }

            if (needle === '') {
                return true;
            }

            return [
                actorName(accountsById, entry.actorUserId),
                entry.subjectLabel,
                entry.action,
                actionLabel(entry.action),
                SUBJECT_LABELS[entry.subjectType],
                ...entry.changes.map((change) => change.field),
            ].some((value) => value.toLowerCase().includes(needle));
        });
    }, [sorted, accountsById, search, actionFilter, subjectFilter]);

    const kpis = useMemo(
        () => ({
            total: sorted.length,
            today: sorted.filter(
                (entry) =>
                    new Date(entry.createdAt).toDateString() ===
                    new Date().toDateString(),
            ).length,
            actors: new Set(sorted.map((entry) => entry.actorUserId)).size,
            subjects: new Set(sorted.map((entry) => entry.subjectType)).size,
        }),
        [sorted],
    );

    const isFiltered =
        search.trim() !== '' ||
        actionFilter !== 'all' ||
        subjectFilter !== 'all';

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const pageRows = filtered.slice(
        (currentPage - 1) * PER_PAGE,
        currentPage * PER_PAGE,
    );

    useEffect(() => {
        setPage(1);
    }, [search, actionFilter, subjectFilter]);

    function resetFilters() {
        setSearch('');
        setActionFilter('all');
        setSubjectFilter('all');
        setPage(1);
    }

    const columns = useMemo<Column<AuditEntry>[]>(
        () => [
            {
                key: 'when',
                header: 'When',
                width: '13%',
                className: 'whitespace-nowrap align-top',
                cell: (entry) => {
                    const date = new Date(entry.createdAt);

                    return (
                        <span className="block" title={eventStamp.format(date)}>
                            <span className="block text-sm font-semibold text-[var(--navy-deep)]">
                                {eventDate.format(date)}
                            </span>
                            <span className="block text-xs text-[var(--slate)]">
                                {eventTime.format(date)}
                            </span>
                        </span>
                    );
                },
            },
            {
                key: 'actor',
                header: 'Actor',
                width: '16%',
                className: 'align-top',
                cell: (entry) => {
                    const name = actorName(accountsById, entry.actorUserId);

                    return name === 'Unknown actor' ? (
                        <span className="text-[var(--slate)]">{name}</span>
                    ) : (
                        <span className="block max-w-[14rem] truncate font-semibold text-[var(--navy-deep)]">
                            {name}
                        </span>
                    );
                },
            },
            {
                key: 'action',
                header: 'Action',
                width: '12%',
                className: 'align-top',
                cell: (entry) => (
                    <StatusPill tone={actionTone(entry.action)} dot>
                        {actionLabel(entry.action)}
                    </StatusPill>
                ),
            },
            {
                key: 'subject',
                header: 'Subject',
                width: '24%',
                className: 'align-top',
                cell: (entry) => (
                    <span className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-semibold tracking-[0.06em] text-[var(--slate)] uppercase">
                            {SUBJECT_LABELS[entry.subjectType]}
                        </span>
                        <span
                            className="block max-w-[18rem] truncate font-semibold text-[var(--navy-deep)]"
                            title={entry.subjectLabel}
                        >
                            {entry.subjectLabel}
                        </span>
                    </span>
                ),
            },
            {
                key: 'changes',
                header: 'Changes',
                className: 'align-top',
                cell: (entry) => {
                    if (entry.changes.length === 0) {
                        return <span className="text-[var(--slate)]">—</span>;
                    }

                    const shown = entry.changes.slice(0, 2);
                    const hidden = entry.changes.length - shown.length;

                    return (
                        <span
                            className="block max-w-[26rem] truncate text-sm text-[var(--slate)]"
                            title={entry.changes.map(changeTitle).join(' · ')}
                        >
                            {shown.map(changeTitle).join(' · ')}
                            {hidden > 0 && (
                                <span className="ml-1 font-medium text-[var(--navy)]">
                                    +{hidden} more
                                </span>
                            )}
                        </span>
                    );
                },
            },
        ],
        [accountsById],
    );

    return (
        <>
            <Head title="Audit log" />

            <SystemPage>
                <SystemPageHeader
                    title="Audit log"
                    subtitle="Every change made in this console, newest first."
                    data-testid="header-audit-log"
                />

                <KpiGrid>
                    <KpiCard
                        label="Total entries"
                        value={kpis.total}
                        loading={loading}
                        caption="Recorded changes"
                        icon={History}
                        tone="navy"
                        data-testid="kpi-audit-total"
                    />
                    <KpiCard
                        label="Entries today"
                        value={kpis.today}
                        loading={loading}
                        caption="Since midnight"
                        icon={CalendarDays}
                        tone="teal"
                        data-testid="kpi-audit-today"
                    />
                    <KpiCard
                        label="Actors"
                        value={kpis.actors}
                        loading={loading}
                        caption="Distinct console users"
                        icon={UserRound}
                        tone="amber"
                        data-testid="kpi-audit-actors"
                    />
                    <KpiCard
                        label="Record types touched"
                        value={kpis.subjects}
                        loading={loading}
                        caption="Distinct subject types"
                        icon={Layers}
                        tone="blue"
                        data-testid="kpi-audit-subjects"
                    />
                </KpiGrid>

                <DataTable<AuditEntry>
                    columns={columns}
                    data={pageRows}
                    loading={loading}
                    getRowId={(entry) => entry.id}
                    getRowTestId={(entry) => `row-audit-${entry.id}`}
                    onRowClick={(entry) => setSelected(entry)}
                    renderRowActions={(entry) => (
                        /* The menu sits inside a clickable row; swallow its
                           events so opening it never also opens the sheet. */
                        <span
                            className="inline-block"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                        >
                            <AuditRowMenu
                                entry={entry}
                                onView={() => setSelected(entry)}
                            />
                        </span>
                    )}
                    toolbar={
                        <>
                            <DataTableToolbar data-testid="toolbar-audit">
                                <DataTableField
                                    label="Search"
                                    htmlFor="filter-audit-search"
                                    className="basis-full sm:min-w-64 sm:flex-1 sm:basis-auto"
                                >
                                    <DataTableSearch
                                        id="filter-audit-search"
                                        value={search}
                                        onChange={setSearch}
                                        placeholder="Search actor, record, action or field..."
                                        className="w-full"
                                        data-testid="input-search-audit"
                                    />
                                </DataTableField>
                                <DataTableField
                                    label="Action"
                                    htmlFor="filter-audit-action"
                                >
                                    <DataTableSelect
                                        id="filter-audit-action"
                                        value={actionFilter}
                                        onValueChange={setActionFilter}
                                        options={actionOptions}
                                        ariaLabel="Filter by action"
                                        data-testid="select-audit-action"
                                    />
                                </DataTableField>
                                <DataTableField
                                    label="Subject type"
                                    htmlFor="filter-audit-subject"
                                >
                                    <DataTableSelect<AuditSubjectType | 'all'>
                                        id="filter-audit-subject"
                                        value={subjectFilter}
                                        onValueChange={setSubjectFilter}
                                        options={subjectOptions}
                                        ariaLabel="Filter by subject type"
                                        data-testid="select-audit-subject"
                                    />
                                </DataTableField>
                                <DataTableRefreshButton
                                    onClick={resetFilters}
                                    data-testid="button-refresh-audit"
                                />
                            </DataTableToolbar>

                            {isFiltered && (
                                <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-5 py-3">
                                    {search.trim() !== '' && (
                                        <FilterChip
                                            label="Search"
                                            value={search.trim()}
                                            onRemove={() => setSearch('')}
                                            testId="chip-audit-search"
                                        />
                                    )}
                                    {actionFilter !== 'all' && (
                                        <FilterChip
                                            label="Action"
                                            value={actionLabel(actionFilter)}
                                            onRemove={() =>
                                                setActionFilter('all')
                                            }
                                            testId="chip-audit-action"
                                        />
                                    )}
                                    {subjectFilter !== 'all' && (
                                        <FilterChip
                                            label="Subject"
                                            value={
                                                SUBJECT_LABELS[subjectFilter]
                                            }
                                            onRemove={() =>
                                                setSubjectFilter('all')
                                            }
                                            testId="chip-audit-subject"
                                        />
                                    )}
                                </div>
                            )}
                        </>
                    }
                    pagination={{
                        page: currentPage,
                        totalPages,
                        onPageChange: setPage,
                        alwaysShow: true,
                        label: 'Audit log pagination',
                        testIdPrefix: 'audit-pagination',
                    }}
                    emptyState={
                        <DashboardEmptyState
                            icon={isFiltered ? SearchX : History}
                            title={
                                isFiltered
                                    ? 'No entries match your filters'
                                    : 'No audit entries yet'
                            }
                            message={
                                isFiltered
                                    ? 'Try a different actor, action or subject type.'
                                    : 'Every change saved in this console will be recorded here.'
                            }
                            onReset={isFiltered ? resetFilters : undefined}
                        />
                    }
                    data-testid="table-audit"
                />
            </SystemPage>

            {selected && (
                <AuditDetailSheet
                    entry={selected}
                    actor={accountsById.get(selected.actorUserId)}
                    onClose={() => setSelected(null)}
                />
            )}
        </>
    );
}

SystemAuditLog.layout = {
    breadcrumbs: [
        {
            title: 'Audit log',
            href: system.auditLog(),
        },
    ],
};
