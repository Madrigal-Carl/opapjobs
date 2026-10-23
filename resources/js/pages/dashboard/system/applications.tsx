import { Head, Link } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    ArrowRight,
    BadgeCheck,
    CalendarClock,
    ClipboardList,
    Eye,
    Pencil,
    SearchX,
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
import { ChangeBar } from '@/components/system/change-bar';
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
import { useSystemLoading } from '@/hooks/use-system-loading';
import type { SystemState } from '@/data/system/store';
import {
    commitSystemChange,
    popAuditEntry,
    updateSystemState,
    useSystemState,
} from '@/data/system/store';
import type {
    ApplicationRecord,
    ApplicationStage,
    AuditChange,
    Availability,
} from '@/data/system/types';
import {
    APPLICATION_STAGES,
    APPLICATION_STAGE_LABELS,
    AVAILABILITY_LABELS,
} from '@/data/system/types';
import * as system from '@/routes/dashboard/system';
import { show as agencyShow } from '@/routes/dashboard/system/agencies';
import { show as applicantShow } from '@/routes/dashboard/system/applicants';
import { show as jobPostShow } from '@/routes/dashboard/system/job-posts';

/**
 * Applications (§4.6).
 *
 * Every application an applicant has submitted, across every Agency, in one
 * list a superadmin can search and triage. Each row cross-links to the
 * applicant, the job post and the Agency; the row menu opens a read-only
 * detail sheet with the stage-history timeline, an edit sheet for the few
 * fields that live on the record itself, and the reversible archive/restore
 * verbs. A stage move appends to the append-only history (§10.3) inside the
 * same audit write, so the log can never miss one.
 */

const PER_PAGE = 8;

type ApplicationDisplayStatus = 'active' | 'archived';
type StageFilter = 'all' | ApplicationStage;
type StatusFilter = 'all' | ApplicationDisplayStatus;
/** `all`, or the plain id of a related record as a string. */
type RelatedFilter = string;
type SortKey = 'newest' | 'oldest' | 'name';

const STAGE_TONE: Record<ApplicationStage, StatusPillTone> = {
    applied: 'info',
    reviewed: 'navy',
    interview: 'indigo',
    hired: 'success',
    pending: 'warning',
};

const STATUS_TONE: Record<ApplicationDisplayStatus, StatusPillTone> = {
    active: 'success',
    archived: 'neutral',
};

const ACCENT: Record<ApplicationDisplayStatus, 'teal' | 'neutral'> = {
    active: 'teal',
    archived: 'neutral',
};

const STATUS_LABELS: Record<ApplicationDisplayStatus, string> = {
    active: 'Active',
    archived: 'Archived',
};

const STAGE_OPTIONS = [
    { value: 'all', label: 'All stages' },
    ...APPLICATION_STAGES.map((stage) => ({
        value: stage,
        label: APPLICATION_STAGE_LABELS[stage],
    })),
];

/* `all` deliberately excludes archived — archive removes a record from lists. */
const STATUS_OPTIONS = [
    { value: 'all', label: 'Active only' },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'name', label: 'Applicant A–Z' },
];

const AVAILABILITY_VALUES: Availability[] = [
    'immediately',
    'within_2_weeks',
    'within_1_month',
    'more_than_1_month',
];

const AVAILABILITY_OPTIONS = [
    { value: 'none', label: 'Availability not given' },
    ...AVAILABILITY_VALUES.map((value) => ({
        value,
        label: AVAILABILITY_LABELS[value],
    })),
];

const STAGE_FORM_OPTIONS = APPLICATION_STAGES.map((stage) => ({
    value: stage,
    label: APPLICATION_STAGE_LABELS[stage],
}));

const appliedFormat = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const stampFormat = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

function plural(count: number, noun: string): string {
    return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

/** Archived is stored on the record; everything else reads as active. */
function applicationDisplayStatus(
    application: ApplicationRecord,
): ApplicationDisplayStatus {
    return application.applicantArchivedAt !== null ? 'archived' : 'active';
}

function applicantOf(state: SystemState, application: ApplicationRecord) {
    return state.accounts.find(
        (account) => account.id === application.applicantUserId,
    );
}

function jobPostOf(state: SystemState, application: ApplicationRecord) {
    return state.jobPosts.find((post) => post.id === application.jobPostId);
}

function agencyOfApplication(
    state: SystemState,
    application: ApplicationRecord,
) {
    const post = jobPostOf(state, application);

    if (post === undefined) {
        return undefined;
    }

    return state.agencies.find((agency) => agency.id === post.agencyId);
}

/** The append-only timeline for one application, oldest first (§10.3). */
function stageHistoryOf(state: SystemState, applicationId: number) {
    return state.stageHistory
        .filter((entry) => entry.applicationId === applicationId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Human label used in toasts, confirms and the audit row. */
function applicationLabel(
    state: SystemState,
    application: ApplicationRecord,
): string {
    const applicant = applicantOf(state, application);
    const post = jobPostOf(state, application);

    return `${applicant?.name ?? `Applicant #${application.applicantUserId}`} — ${post?.jobTitle ?? `Job post #${application.jobPostId}`}`;
}

/**
 * Applies `apply`, writes the audit row, and offers an Undo that runs
 * `undo` — restoring the record's ORIGINAL typed values — before dropping
 * the audit entry this call just wrote, so a change reversed within the
 * toast's window never appears to have happened.
 */
function mutateApplication(
    application: ApplicationRecord,
    label: string,
    options: {
        action: string;
        changes: AuditChange[];
        apply: (current: SystemState) => SystemState;
        undo: (current: SystemState) => SystemState;
        message: string;
    },
): void {
    commitSystemChange({
        action: options.action,
        subjectType: 'application',
        subjectId: application.id,
        subjectLabel: label,
        changes: options.changes,
        apply: options.apply,
    });

    toast.success(options.message, {
        duration: 6000,
        action: {
            label: 'Undo',
            onClick: () => {
                updateSystemState(options.undo);
                popAuditEntry();
            },
        },
    });
}

/** Store transform that patches one application by id. */
function patchApplication(
    id: number,
    patch: Partial<ApplicationRecord>,
): (current: SystemState) => SystemState {
    return (current) => ({
        ...current,
        applications: current.applications.map((entry) =>
            entry.id === id ? { ...entry, ...patch } : entry,
        ),
    });
}

/** One label/value line inside a sheet. */
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

/** Space Mono eyebrow for a section inside a sheet. */
function SheetEyebrow({ children }: { children: ReactNode }) {
    return (
        <h3 className="font-mono text-[11px] font-bold tracking-[0.12em] text-[var(--slate)] uppercase">
            {children}
        </h3>
    );
}

/** Read-only detail sheet: who applied, to what, and every stage it passed. */
function ApplicationDetailSheet({
    application,
    state,
    onClose,
}: {
    application: ApplicationRecord;
    state: SystemState;
    onClose: () => void;
}) {
    const applicant = applicantOf(state, application);
    const post = jobPostOf(state, application);
    const agency = agencyOfApplication(state, application);
    const history = stageHistoryOf(state, application.id);
    const status = applicationDisplayStatus(application);

    const actorName = (userId: number | null): string => {
        if (userId === null) {
            return 'Applicant';
        }

        return (
            state.accounts.find((account) => account.id === userId)?.name ??
            'Unknown actor'
        );
    };

    return (
        <EntitySheet
            open
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
            title={applicationLabel(state, application)}
            description="A read-only view of this application. Choose Edit application to change it."
            size="wide"
            data-testid="sheet-application-detail"
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
                <DetailRow label="Applicant">
                    {applicant === undefined
                        ? `Applicant #${application.applicantUserId}`
                        : applicant.name}
                </DetailRow>
                <DetailRow label="Job post">
                    {post === undefined
                        ? `Job post #${application.jobPostId}`
                        : post.jobTitle}
                </DetailRow>
                <DetailRow label="Agency">
                    {agency === undefined ? '—' : agency.agencyName}
                </DetailRow>
                <DetailRow label="Applied on">
                    {stampFormat.format(new Date(application.submittedAt))}
                </DetailRow>
                <DetailRow label="Availability">
                    {application.availability === null
                        ? '—'
                        : AVAILABILITY_LABELS[application.availability]}
                </DetailRow>
                <DetailRow label="Expected monthly salary">
                    {application.expectedMonthlySalary === null
                        ? '—'
                        : `${application.expectedMonthlySalary} ${post?.salaryCurrency ?? ''}`.trim()}
                </DetailRow>
                <DetailRow label="Status">
                    <StatusPill tone={STATUS_TONE[status]} dot>
                        {STATUS_LABELS[status]}
                    </StatusPill>
                </DetailRow>
            </dl>

            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--line)] pt-4">
                <Link
                    href={applicantShow({
                        applicant: application.applicantUserId,
                    })}
                    className="rounded-sm text-sm font-semibold text-[var(--teal-ink)] underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none motion-reduce:transition-none"
                    data-testid="link-sheet-applicant"
                >
                    Open applicant{' '}
                    <ArrowRight
                        className="inline size-3.5"
                        aria-hidden="true"
                    />
                </Link>
                <Link
                    href={jobPostShow({ jobPost: application.jobPostId })}
                    className="rounded-sm text-sm font-semibold text-[var(--teal-ink)] underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none motion-reduce:transition-none"
                    data-testid="link-sheet-job-post"
                >
                    Open job post{' '}
                    <ArrowRight
                        className="inline size-3.5"
                        aria-hidden="true"
                    />
                </Link>
                {agency !== undefined && (
                    <Link
                        href={agencyShow({ agency: agency.id })}
                        className="rounded-sm text-sm font-semibold text-[var(--teal-ink)] underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none motion-reduce:transition-none"
                        data-testid="link-sheet-agency"
                    >
                        Open agency{' '}
                        <ArrowRight
                            className="inline size-3.5"
                            aria-hidden="true"
                        />
                    </Link>
                )}
            </div>

            <section className="flex flex-col gap-3 border-t border-[var(--line)] pt-4">
                <SheetEyebrow>Stage history ({history.length})</SheetEyebrow>

                {history.length === 0 ? (
                    <p className="text-sm text-[var(--slate)]">
                        No stage change has been recorded for this application
                        yet — it sits at{' '}
                        {APPLICATION_STAGE_LABELS[
                            application.stage
                        ].toLowerCase()}
                        .
                    </p>
                ) : (
                    <ol className="flex flex-col">
                        {history.map((entry) => (
                            <li
                                key={entry.id}
                                className="relative flex flex-col gap-1 border-l border-[var(--line)] py-3 pl-4 first:pt-0 last:pb-0"
                            >
                                <span
                                    aria-hidden="true"
                                    className="absolute top-1.5 -left-[5px] size-2.5 rounded-full border border-white bg-[var(--teal)]"
                                />
                                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                                    <span className="text-sm font-semibold text-[var(--navy)]">
                                        {
                                            APPLICATION_STAGE_LABELS[
                                                entry.toStage
                                            ]
                                        }
                                    </span>
                                    <span className="text-xs text-[var(--slate)]">
                                        {stampFormat.format(
                                            new Date(entry.createdAt),
                                        )}
                                    </span>
                                </span>
                                <span className="text-xs text-[var(--slate)]">
                                    {entry.fromStage === null
                                        ? 'Submitted by the applicant'
                                        : `${APPLICATION_STAGE_LABELS[entry.fromStage]} → ${APPLICATION_STAGE_LABELS[entry.toStage]}`}
                                    {' · '}
                                    {actorName(entry.changedByUserId)}
                                </span>
                                {entry.note !== null && (
                                    <span className="text-xs text-[var(--navy)]">
                                        “{entry.note}”
                                    </span>
                                )}
                            </li>
                        ))}
                    </ol>
                )}
            </section>

            {application.coverLetter !== null && (
                <section className="flex flex-col gap-2 border-t border-[var(--line)] pt-4">
                    <SheetEyebrow>Cover letter</SheetEyebrow>
                    <p className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm whitespace-pre-wrap text-[var(--navy)]">
                        {application.coverLetter}
                    </p>
                </section>
            )}
        </EntitySheet>
    );
}

type ApplicationEditForm = {
    stage: ApplicationStage;
    availability: Availability | 'none';
    salary: string;
};

/** Blank is `null`; anything else must be a non-negative number. */
function validateSalary(raw: string): string | null {
    const trimmed = raw.trim();

    if (trimmed === '') {
        return null;
    }

    const parsed = Number(trimmed);

    if (!Number.isFinite(parsed) || parsed < 0) {
        return 'Enter an expected monthly salary of 0 or more, or leave the field blank.';
    }

    return null;
}

/** Edit sheet: only fields that genuinely live on the record (§10). */
function ApplicationEditSheet({
    application,
    state,
    onClose,
}: {
    application: ApplicationRecord;
    state: SystemState;
    onClose: () => void;
}) {
    const { values, changedFields, isDirty, setValue, discard } =
        useFormChanges<ApplicationEditForm>({
            stage: application.stage,
            availability: application.availability ?? 'none',
            salary:
                application.expectedMonthlySalary === null
                    ? ''
                    : String(application.expectedMonthlySalary),
        });

    const salaryError = useMemo(
        () => validateSalary(values.salary),
        [values.salary],
    );

    const label = applicationLabel(state, application);

    function save() {
        if (salaryError !== null) {
            return;
        }

        const trimmed = values.salary.trim();
        const salary = trimmed === '' ? null : Number(trimmed);
        const availability =
            values.availability === 'none' ? null : values.availability;

        const changes: AuditChange[] = [];

        if (values.stage !== application.stage) {
            changes.push({
                field: 'Stage',
                from: APPLICATION_STAGE_LABELS[application.stage],
                to: APPLICATION_STAGE_LABELS[values.stage],
            });
        }

        if (availability !== application.availability) {
            changes.push({
                field: 'Availability',
                from:
                    application.availability === null
                        ? null
                        : AVAILABILITY_LABELS[application.availability],
                to:
                    availability === null
                        ? null
                        : AVAILABILITY_LABELS[availability],
            });
        }

        if (salary !== application.expectedMonthlySalary) {
            changes.push({
                field: 'Expected monthly salary',
                from: application.expectedMonthlySalary,
                to: salary,
            });
        }

        if (changes.length === 0) {
            onClose();
            return;
        }

        const stageChanged = values.stage !== application.stage;
        const stamp = new Date().toISOString();
        const historyId = state.nextId;
        const actorId =
            state.accounts.find((entry) => entry.role === 'superadmin')?.id ??
            null;

        mutateApplication(application, label, {
            // A stage move reads as "Moved" in the audit log; anything else
            // is a plain "Updated" edit of the record's own fields.
            action: stageChanged ? 'move' : 'update',
            changes,
            apply: (current) => {
                const applications = current.applications.map((entry) =>
                    entry.id === application.id
                        ? {
                              ...entry,
                              stage: values.stage,
                              availability,
                              expectedMonthlySalary: salary,
                          }
                        : entry,
                );

                if (!stageChanged) {
                    return { ...current, applications };
                }

                return {
                    ...current,
                    applications,
                    // §10.3: history is append-only; a stage move adds one row.
                    stageHistory: [
                        ...current.stageHistory,
                        {
                            id: historyId,
                            applicationId: application.id,
                            fromStage: application.stage,
                            toStage: values.stage,
                            changedByUserId: actorId,
                            note: null,
                            createdAt: stamp,
                        },
                    ],
                };
            },
            undo: (current) => ({
                ...current,
                applications: current.applications.map((entry) =>
                    entry.id === application.id
                        ? {
                              ...entry,
                              stage: application.stage,
                              availability: application.availability,
                              expectedMonthlySalary:
                                  application.expectedMonthlySalary,
                          }
                        : entry,
                ),
                stageHistory: stageChanged
                    ? current.stageHistory.filter(
                          (entry) => entry.id !== historyId,
                      )
                    : current.stageHistory,
            }),
            message: stageChanged
                ? `“${label}” moved to ${APPLICATION_STAGE_LABELS[
                      values.stage
                  ].toLowerCase()}.`
                : `“${label}” updated.`,
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
            title="Edit application"
            description={`Change the stage, availability or expected salary for ${label}.`}
            size="wide"
            data-testid="sheet-application-edit"
            footer={
                <SheetSaveActions
                    onCancel={onClose}
                    onSave={save}
                    saveDisabled={!isDirty || salaryError !== null}
                    data-testid="sheet-save-application"
                />
            }
        >
            <div className="flex flex-col gap-1.5">
                <DataTableField label="Stage" htmlFor="application-stage">
                    <DataTableSelect<ApplicationStage>
                        id="application-stage"
                        value={values.stage}
                        onValueChange={(stage) => setValue('stage', stage)}
                        options={STAGE_FORM_OPTIONS}
                        ariaLabel="Stage"
                        className="w-full"
                        data-testid="select-stage"
                    />
                </DataTableField>
                <p className="text-xs text-[var(--slate)]">
                    Moving the stage appends one entry to this application's
                    stage history — past entries are never rewritten.
                </p>
            </div>

            <DataTableField
                label="Availability"
                htmlFor="application-availability"
            >
                <DataTableSelect<Availability | 'none'>
                    id="application-availability"
                    value={values.availability}
                    onValueChange={(availability) =>
                        setValue('availability', availability)
                    }
                    options={AVAILABILITY_OPTIONS}
                    ariaLabel="Availability"
                    className="w-full"
                    data-testid="select-availability"
                />
            </DataTableField>

            <DataTableField
                label="Expected monthly salary"
                htmlFor="application-salary"
            >
                <Input
                    id="application-salary"
                    type="number"
                    min={0}
                    step="any"
                    value={values.salary}
                    onChange={(event) => setValue('salary', event.target.value)}
                    placeholder="e.g. 3000"
                    autoComplete="off"
                    data-testid="input-salary"
                />
                <InputError
                    message={salaryError ?? undefined}
                    data-testid="error-salary"
                />
            </DataTableField>

            <LockedField
                label="Applied on"
                value={stampFormat.format(new Date(application.submittedAt))}
                reason="The applied date is the applicant's own submission time, so it cannot be edited here."
                data-testid="locked-applied-on"
            />

            <ChangeBar
                count={changedFields.length}
                onDiscard={discard}
                onSave={save}
                saveDisabled={salaryError !== null}
                data-testid="change-bar-application"
            />
        </EntitySheet>
    );
}

type PendingAction =
    | { kind: 'archive' | 'restore'; application: ApplicationRecord }
    | { kind: 'bulk-archive'; applications: ApplicationRecord[] };

type SheetState = { mode: 'view' | 'edit'; id: number };

export default function SystemApplications() {
    const state = useSystemState();
    const loading = useSystemLoading();
    const selection = useRowSelection();

    const [q, setQ] = useState('');
    const [stage, setStage] = useState<StageFilter>('all');
    const [agency, setAgency] = useState<RelatedFilter>('all');
    const [jobPost, setJobPost] = useState<RelatedFilter>('all');
    const [status, setStatus] = useState<StatusFilter>('all');
    const [sort, setSort] = useState<SortKey>('newest');
    const [page, setPage] = useState(1);
    const [pending, setPending] = useState<PendingAction | null>(null);
    const [sheet, setSheet] = useState<SheetState | null>(null);

    useEffect(() => {
        setPage(1);
    }, [q, stage, agency, jobPost, status, sort]);

    // Filter options are derived from the data, so the toolbar never offers
    // an Agency or job post that matches nothing.
    const agencyOptions = useMemo(() => {
        const ids = new Set(
            state.applications
                .map((application) => jobPostOf(state, application)?.agencyId)
                .filter((id): id is number => id !== undefined),
        );

        return [
            { value: 'all', label: 'All agencies' },
            ...state.agencies
                .filter((entry) => ids.has(entry.id))
                .map((entry) => ({
                    value: String(entry.id),
                    label: entry.agencyName,
                })),
        ];
    }, [state]);

    const jobPostOptions = useMemo(() => {
        const ids = new Set(state.applications.map((a) => a.jobPostId));

        return [
            { value: 'all', label: 'All job posts' },
            ...state.jobPosts
                .filter((post) => ids.has(post.id))
                .map((post) => ({
                    value: String(post.id),
                    label: post.jobTitle,
                })),
        ];
    }, [state]);

    const rows = useMemo(() => {
        const needle = q.trim().toLowerCase();

        const filtered = state.applications.filter((application) => {
            const displayStatus = applicationDisplayStatus(application);

            if (status === 'all') {
                if (displayStatus === 'archived') {
                    return false;
                }
            } else if (displayStatus !== status) {
                return false;
            }

            if (stage !== 'all' && application.stage !== stage) {
                return false;
            }

            const post = jobPostOf(state, application);

            if (agency !== 'all') {
                if (post === undefined || String(post.agencyId) !== agency) {
                    return false;
                }
            }

            if (
                jobPost !== 'all' &&
                String(application.jobPostId) !== jobPost
            ) {
                return false;
            }

            if (needle === '') {
                return true;
            }

            const applicant = applicantOf(state, application);

            return [
                applicant?.name ?? '',
                applicant?.email ?? '',
                post?.jobTitle ?? '',
            ].some((value) => value.toLowerCase().includes(needle));
        });

        return [...filtered].sort((a, b) => {
            if (sort === 'oldest') {
                return a.submittedAt.localeCompare(b.submittedAt);
            }

            if (sort === 'name') {
                return (
                    (applicantOf(state, a)?.name ?? '').localeCompare(
                        applicantOf(state, b)?.name ?? '',
                    ) || a.submittedAt.localeCompare(b.submittedAt)
                );
            }

            return b.submittedAt.localeCompare(a.submittedAt);
        });
    }, [state, q, stage, agency, jobPost, status, sort]);

    const stats = useMemo(() => {
        const live = state.applications.filter(
            (application) => application.applicantArchivedAt === null,
        );

        return {
            total: live.length,
            interview: live.filter((a) => a.stage === 'interview').length,
            hired: live.filter((a) => a.stage === 'hired').length,
            archived: state.applications.length - live.length,
        };
    }, [state]);

    const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    const pageRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const pageIds = pageRows
        .filter((application) => application.applicantArchivedAt === null)
        .map((application) => String(application.id));

    const isFiltered =
        q.trim() !== '' ||
        stage !== 'all' ||
        agency !== 'all' ||
        jobPost !== 'all' ||
        status !== 'all';

    const resetFilters = () => {
        setQ('');
        setStage('all');
        setAgency('all');
        setJobPost('all');
        setStatus('all');
        setPage(1);
    };

    const selectAllOnPage = () => selection.setMany(pageIds, true);

    const sheetApplication =
        sheet === null
            ? null
            : (state.applications.find(
                  (application) => application.id === sheet.id,
              ) ?? null);

    function confirmPending() {
        if (!pending) {
            return;
        }

        if (pending.kind === 'bulk-archive') {
            const ids = pending.applications.map(
                (application) => application.id,
            );
            const label = plural(ids.length, 'application');
            const stamp = new Date().toISOString();

            commitSystemChange({
                action: 'archive',
                subjectType: 'application',
                subjectId: ids.join(','),
                subjectLabel: label,
                changes: [{ field: 'Archived', from: false, to: true }],
                apply: (current) => ({
                    ...current,
                    applications: current.applications.map((entry) =>
                        ids.includes(entry.id) &&
                        entry.applicantArchivedAt === null
                            ? { ...entry, applicantArchivedAt: stamp }
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
                            applications: current.applications.map((entry) =>
                                ids.includes(entry.id)
                                    ? { ...entry, applicantArchivedAt: null }
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

        const { application, kind } = pending;
        const label = applicationLabel(state, application);
        const stamp = new Date().toISOString();

        if (kind === 'archive') {
            mutateApplication(application, label, {
                action: 'archive',
                changes: [{ field: 'Archived', from: false, to: true }],
                apply: patchApplication(application.id, {
                    applicantArchivedAt: stamp,
                }),
                undo: patchApplication(application.id, {
                    applicantArchivedAt: application.applicantArchivedAt,
                }),
                message: `“${label}” archived.`,
            });
        } else {
            mutateApplication(application, label, {
                action: 'restore',
                changes: [{ field: 'Archived', from: true, to: false }],
                apply: patchApplication(application.id, {
                    applicantArchivedAt: null,
                }),
                undo: patchApplication(application.id, {
                    applicantArchivedAt: application.applicantArchivedAt,
                }),
                message: `“${label}” restored.`,
            });
        }

        setPending(null);
    }

    function dialogCopy(action: PendingAction) {
        if (action.kind === 'bulk-archive') {
            const history = action.applications.reduce(
                (sum, application) =>
                    sum + stageHistoryOf(state, application.id).length,
                0,
            );

            return {
                title: `Archive ${plural(action.applications.length, 'application')}?`,
                description: 'They leave every list straight away.',
                consequences: [
                    `${plural(history, 'stage-history entry')} stay attached to their applications.`,
                    'Applicant profiles and every other application are untouched.',
                    'Each application can be brought back on its own from the Archived filter.',
                ],
                confirmLabel: 'Archive applications',
                destructive: true,
                testId: 'confirm-application-bulk-archive',
            };
        }

        const { application, kind } = action;
        const label = `“${applicationLabel(state, application)}”`;
        const history = stageHistoryOf(state, application.id).length;
        const others = state.applications.filter(
            (entry) =>
                entry.applicantUserId === application.applicantUserId &&
                entry.id !== application.id,
        ).length;

        if (kind === 'archive') {
            return {
                title: 'Archive this application?',
                description: `${label} disappears from every list straight away.`,
                consequences: [
                    `${plural(history, 'stage-history entry')} stay attached and show again on restore.`,
                    others > 0
                        ? `The applicant keeps their profile and ${plural(others, 'other application')}.`
                        : 'This is the applicant’s only application — their profile is untouched.',
                    'Restore it at any time from the Archived filter.',
                ],
                confirmLabel: 'Archive',
                destructive: true,
                testId: 'confirm-application-archive',
            };
        }

        return {
            title: 'Restore this application?',
            description: `${label} returns to every list straight away.`,
            consequences: [
                `It shows at the ${APPLICATION_STAGE_LABELS[application.stage].toLowerCase()} stage again.`,
                `${plural(history, 'stage-history entry')} kept and visible in View details.`,
            ],
            confirmLabel: 'Restore',
            destructive: false,
            testId: 'confirm-application-restore',
        };
    }

    function rowMenu(application: ApplicationRecord) {
        const archived = application.applicantArchivedAt !== null;

        const actions: SystemRowAction[] = [
            {
                label: 'View details',
                icon: Eye,
                testId: 'menu-view-application',
                onSelect: () => setSheet({ mode: 'view', id: application.id }),
            },
            {
                label: 'Edit application',
                icon: Pencil,
                testId: 'menu-edit-application',
                onSelect: () => setSheet({ mode: 'edit', id: application.id }),
            },
        ];

        if (archived) {
            actions.push({
                label: 'Restore application',
                icon: ArchiveRestore,
                testId: 'menu-restore-application',
                onSelect: () => setPending({ kind: 'restore', application }),
            });
        } else {
            actions.push({
                label: 'Archive application',
                icon: Archive,
                destructive: true,
                hint: 'Archive hides it from every list; the stage history is kept',
                testId: 'menu-archive-application',
                onSelect: () => setPending({ kind: 'archive', application }),
            });
        }

        return <SystemRowMenu actions={actions} />;
    }

    const columns: Column<ApplicationRecord>[] = [
        {
            key: 'select',
            header: 'Select',
            width: '84px',
            headerClassName: 'px-3',
            cell: (application) => (
                <Checkbox
                    checked={selection.isSelected(String(application.id))}
                    onCheckedChange={() =>
                        selection.toggle(String(application.id))
                    }
                    disabled={application.applicantArchivedAt !== null}
                    aria-label={`Select application ${application.id}`}
                    data-testid={`checkbox-application-${application.id}`}
                />
            ),
        },
        {
            key: 'applicant',
            header: 'Applicant',
            cell: (application) => {
                const applicant = applicantOf(state, application);

                if (applicant === undefined) {
                    return (
                        <span className="text-sm text-[var(--slate)]">
                            Applicant #{application.applicantUserId} not found
                        </span>
                    );
                }

                return (
                    <div className="min-w-0">
                        <Link
                            href={applicantShow({
                                applicant: application.applicantUserId,
                            })}
                            data-testid={`link-applicant-${application.id}`}
                            className="block truncate font-medium text-[var(--navy)] transition-colors hover:text-[var(--teal-ink)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none motion-reduce:transition-none"
                        >
                            {applicant.name}
                        </Link>
                        <span className="block truncate text-xs text-[var(--slate)]">
                            {applicant.email}
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'job-post',
            header: 'Job post',
            width: '200px',
            cell: (application) => {
                const post = jobPostOf(state, application);

                if (post === undefined) {
                    return (
                        <span className="text-sm text-[var(--slate)]">
                            Job post not found
                        </span>
                    );
                }

                return (
                    <div className="min-w-0">
                        <Link
                            href={jobPostShow({ jobPost: post.id })}
                            data-testid={`link-job-post-${application.id}`}
                            className="block truncate text-sm font-medium text-[var(--navy)] underline-offset-2 transition-colors hover:text-[var(--teal-ink)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none motion-reduce:transition-none"
                        >
                            {post.jobTitle}
                        </Link>
                        <span className="block truncate text-xs text-[var(--slate)]">
                            {post.workLocation}
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'agency',
            header: 'Agency',
            width: '180px',
            cell: (application) => {
                const own = agencyOfApplication(state, application);

                if (own === undefined) {
                    return (
                        <span className="text-sm text-[var(--slate)]">—</span>
                    );
                }

                return (
                    <Link
                        href={agencyShow({ agency: own.id })}
                        data-testid={`link-agency-${application.id}`}
                        className="block truncate text-sm font-medium text-[var(--navy)] underline-offset-2 transition-colors hover:text-[var(--teal-ink)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none motion-reduce:transition-none"
                    >
                        {own.agencyName}
                    </Link>
                );
            },
        },
        {
            key: 'stage',
            header: 'Stage',
            width: '130px',
            cell: (application) => (
                <StatusPill
                    tone={STAGE_TONE[application.stage]}
                    dot
                    data-testid={`stage-application-${application.id}`}
                >
                    {APPLICATION_STAGE_LABELS[application.stage]}
                </StatusPill>
            ),
        },
        {
            key: 'availability',
            header: 'Availability / applied',
            width: '170px',
            cell: (application) => (
                <div className="min-w-0">
                    <span className="block truncate text-xs text-[var(--slate)]">
                        {application.availability === null
                            ? 'Availability not given'
                            : AVAILABILITY_LABELS[application.availability]}
                    </span>
                    <span className="block truncate text-sm text-[var(--navy)]">
                        {appliedFormat.format(
                            new Date(application.submittedAt),
                        )}
                    </span>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            width: '120px',
            cell: (application) => {
                const displayStatus = applicationDisplayStatus(application);

                return (
                    <StatusPill
                        tone={STATUS_TONE[displayStatus]}
                        dot
                        data-testid={`status-application-${application.id}`}
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
            <Head title="Applications" />

            <SystemPage>
                <SystemPageHeader
                    title="Applications"
                    subtitle="Every application an applicant has submitted, across every Agency and job post."
                    data-testid="header-applications"
                />

                <KpiGrid>
                    <KpiCard
                        label="Applications"
                        value={stats.total}
                        loading={loading}
                        caption="Active — not archived"
                        icon={ClipboardList}
                        tone="blue"
                        data-testid="kpi-applications"
                    />
                    <KpiCard
                        label="In interview"
                        value={stats.interview}
                        loading={loading}
                        caption="Currently at the interview stage"
                        icon={CalendarClock}
                        tone="teal"
                        data-testid="kpi-applications-interview"
                    />
                    <KpiCard
                        label="Hired"
                        value={stats.hired}
                        loading={loading}
                        caption="Contracts signed"
                        icon={BadgeCheck}
                        tone="emerald"
                        data-testid="kpi-applications-hired"
                    />
                    <KpiCard
                        label="Archived"
                        value={stats.archived}
                        loading={loading}
                        caption="Hidden until restored"
                        icon={Archive}
                        tone="navy"
                        data-testid="kpi-applications-archived"
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
                        {stage !== 'all' && (
                            <FilterChip
                                label="Stage"
                                value={APPLICATION_STAGE_LABELS[stage]}
                                onRemove={() => setStage('all')}
                                testId="chip-stage"
                            />
                        )}
                        {agency !== 'all' && (
                            <FilterChip
                                label="Agency"
                                value={
                                    state.agencies.find(
                                        (entry) => String(entry.id) === agency,
                                    )?.agencyName ?? 'Unknown Agency'
                                }
                                onRemove={() => setAgency('all')}
                                testId="chip-agency"
                            />
                        )}
                        {jobPost !== 'all' && (
                            <FilterChip
                                label="Job post"
                                value={
                                    state.jobPosts.find(
                                        (entry) => String(entry.id) === jobPost,
                                    )?.jobTitle ?? 'Unknown job post'
                                }
                                onRemove={() => setJobPost('all')}
                                testId="chip-job-post"
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

                <DataTable<ApplicationRecord>
                    columns={columns}
                    data={pageRows}
                    loading={loading}
                    getRowId={(application) => String(application.id)}
                    getRowTestId={(application) =>
                        `row-application-${application.id}`
                    }
                    getRowAccent={(application) =>
                        ACCENT[applicationDisplayStatus(application)]
                    }
                    renderRowActions={rowMenu}
                    toolbar={
                        <DataTableToolbar data-testid="applications-table-toolbar">
                            <BulkBar
                                count={selection.count}
                                label="applications"
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
                                            applications: rows.filter(
                                                (application) =>
                                                    selection.isSelected(
                                                        String(application.id),
                                                    ) &&
                                                    application.applicantArchivedAt ===
                                                        null,
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
                                htmlFor="filter-application-search"
                                className="basis-full sm:min-w-64 sm:flex-1 sm:basis-auto"
                            >
                                <DataTableSearch
                                    id="filter-application-search"
                                    value={q}
                                    onChange={setQ}
                                    placeholder="Search applicant or job post..."
                                    className="w-full"
                                    data-testid="input-search-applications"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Stage"
                                htmlFor="filter-application-stage"
                            >
                                <DataTableSelect<StageFilter>
                                    id="filter-application-stage"
                                    value={stage}
                                    onValueChange={setStage}
                                    options={STAGE_OPTIONS}
                                    ariaLabel="Filter by stage"
                                    data-testid="select-application-stage"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Agency"
                                htmlFor="filter-application-agency"
                            >
                                <DataTableSelect<RelatedFilter>
                                    id="filter-application-agency"
                                    value={agency}
                                    onValueChange={setAgency}
                                    options={agencyOptions}
                                    ariaLabel="Filter by Agency"
                                    data-testid="select-application-agency"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Job post"
                                htmlFor="filter-application-job-post"
                            >
                                <DataTableSelect<RelatedFilter>
                                    id="filter-application-job-post"
                                    value={jobPost}
                                    onValueChange={setJobPost}
                                    options={jobPostOptions}
                                    ariaLabel="Filter by job post"
                                    data-testid="select-application-job-post"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Status"
                                htmlFor="filter-application-status"
                            >
                                <DataTableSelect<StatusFilter>
                                    id="filter-application-status"
                                    value={status}
                                    onValueChange={setStatus}
                                    options={STATUS_OPTIONS}
                                    ariaLabel="Filter by status"
                                    data-testid="select-application-status"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Sort by"
                                htmlFor="filter-application-sort"
                            >
                                <DataTableSelect<SortKey>
                                    id="filter-application-sort"
                                    value={sort}
                                    onValueChange={setSort}
                                    options={SORT_OPTIONS}
                                    ariaLabel="Sort applications"
                                    data-testid="select-application-sort"
                                />
                            </DataTableField>
                            <DataTableRefreshButton
                                onClick={resetFilters}
                                spinning={loading}
                                data-testid="button-refresh-applications"
                            />
                        </DataTableToolbar>
                    }
                    pagination={{
                        page,
                        totalPages,
                        onPageChange: setPage,
                        alwaysShow: true,
                        label: 'Applications pagination',
                        testIdPrefix: 'applications-pagination',
                    }}
                    emptyState={
                        <DashboardEmptyState
                            icon={isFiltered ? SearchX : ClipboardList}
                            title={
                                isFiltered
                                    ? 'No applications match your filters'
                                    : 'No applications yet'
                            }
                            message={
                                isFiltered
                                    ? 'Try a different applicant, stage or job post.'
                                    : 'Applications submitted by job seekers will appear here.'
                            }
                            onReset={isFiltered ? resetFilters : undefined}
                        />
                    }
                    data-testid="table-applications"
                />
            </SystemPage>

            {sheet?.mode === 'view' && sheetApplication !== null && (
                <ApplicationDetailSheet
                    key={`view-application-${sheetApplication.id}`}
                    application={sheetApplication}
                    state={state}
                    onClose={() => setSheet(null)}
                />
            )}

            {sheet?.mode === 'edit' && sheetApplication !== null && (
                <ApplicationEditSheet
                    key={`edit-application-${sheetApplication.id}`}
                    application={sheetApplication}
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

SystemApplications.layout = {
    breadcrumbs: [
        {
            title: 'Applications',
            href: system.applications(),
        },
    ],
};
