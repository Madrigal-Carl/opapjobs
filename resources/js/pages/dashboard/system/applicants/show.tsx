import { Head, Link, router, setLayoutProps } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    Award,
    Briefcase,
    BriefcaseBusiness,
    CalendarClock,
    Contact,
    FileText,
    GraduationCap,
    Pencil,
    Target,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import type { StatusPillTone } from '@/components/dashboard/badges';
import { PathwayBadge, StatusPill } from '@/components/dashboard/badges';
import { DashboardEmptyState } from '@/components/dashboard/empty-state';
import { KpiCard, KpiGrid } from '@/components/system/system-kpi-card';
import { SystemPage } from '@/components/system/system-page';
import { ConfirmDialog } from '@/components/system/confirm-dialog';
import {
    EntitySheet,
    SheetSaveActions,
} from '@/components/system/entity-sheet';
import { TextAreaField, TextField } from '@/components/system/form-text-field';
import { LockedField } from '@/components/system/locked-field';
import { SuperAdminChip } from '@/components/system/super-admin-chip';
import { SystemPageHeader } from '@/components/system/system-page-header';
import { SystemTabs } from '@/components/system/system-tabs';
import {
    SystemRowMenu,
    type SystemRowAction,
} from '@/components/system/system-row-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useFormChanges } from '@/hooks/use-form-changes';
import { todayIso } from '@/data/system/selectors';
import {
    commitSystemChange,
    popAuditEntry,
    updateSystemState,
    useSystemState,
} from '@/data/system/store';
import {
    APPLICATION_STAGE_LABELS,
    AVAILABILITY_LABELS,
    DOCUMENT_TYPE_LABELS,
    SKILL_LEVEL_LABELS,
    type ApplicationStage,
    type ApplicantProfileRecord,
    type Availability,
    type SkillLevel,
} from '@/data/system/types';
import * as system from '@/routes/dashboard/system';
import { show as jobPostShow } from '@/routes/dashboard/system/job-posts';
import { cn } from '@/lib/utils';
import type { Pathway } from '@/types/agency';

/**
 * One Applicant, in full (§9.1–§9.3).
 *
 * The record view a superadmin opens from the list: who the candidate is,
 * what they have worked through, what they hold, and where their
 * applications stand. The sections exist because these questions have
 * different answers — the resume sections a superadmin only reads, while
 * the profile fields can be amended in place with an audit trail.
 *
 * A refresh loses the in-memory store, so an id that no longer resolves
 * gets a real "not found" rather than an empty page.
 */

const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'history', label: 'Experience / Education' },
    { id: 'skills', label: 'Skills and certifications' },
    { id: 'documents', label: 'Documents' },
    { id: 'applications', label: 'Applications' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** The confirm dialog renders from whichever verb is in flight. */
type PendingAction = 'archive' | 'restore';

type ApplicantShowProps = {
    applicantId: string;
};

const PATHWAY_OPTIONS = [
    { value: 'none', label: 'No preference' },
    { value: 'landbased', label: 'Land-based' },
    { value: 'seabased', label: 'Sea-based' },
];

const AVAILABILITY_OPTIONS = [
    { value: 'none', label: 'Any availability' },
    { value: 'immediately', label: AVAILABILITY_LABELS.immediately },
    { value: 'within_2_weeks', label: AVAILABILITY_LABELS.within_2_weeks },
    { value: 'within_1_month', label: AVAILABILITY_LABELS.within_1_month },
    {
        value: 'more_than_1_month',
        label: AVAILABILITY_LABELS.more_than_1_month,
    },
];

const STAGE_TONE: Record<ApplicationStage, StatusPillTone> = {
    applied: 'info',
    reviewed: 'teal',
    interview: 'warning',
    hired: 'success',
    pending: 'neutral',
};

const SKILL_TONE: Record<SkillLevel, StatusPillTone> = {
    beginner: 'neutral',
    intermediate: 'info',
    advanced: 'teal',
    expert: 'navy',
};

const dateFormat = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const numberFormat = new Intl.NumberFormat('en-US');

/** Formats an ISO date or timestamp as "Dec 31, 2026" without a TZ shift. */
function formatDate(value: string): string {
    return dateFormat.format(
        new Date(value.length === 10 ? `${value}T00:00:00Z` : value),
    );
}

function formatBytes(bytes: number): string {
    return bytes >= 1_048_576
        ? `${(bytes / 1_048_576).toFixed(1)} MB`
        : `${Math.round(bytes / 1024)} KB`;
}

function plural(count: number, noun: string): string {
    return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

function pathwayLabel(pathway: Pathway): string {
    return pathway === 'landbased' ? 'Land-based' : 'Sea-based';
}

/**
 * Total credited experience in years. A role with no end date counts up to
 * today, and overlapping roles are not de-duplicated — this is a reading
 * aid, not payroll.
 */
function experienceYears(
    entries: { startedOn: string; endedOn: string | null }[],
): number {
    const now = Date.parse(`${todayIso()}T00:00:00Z`);

    const totalMonths = entries.reduce((sum, entry) => {
        const start = Date.parse(`${entry.startedOn}T00:00:00Z`);
        const end =
            entry.endedOn === null
                ? now
                : Date.parse(`${entry.endedOn}T00:00:00Z`);

        return sum + Math.max(0, (end - start) / 2_629_800_000);
    }, 0);

    return Math.round((totalMonths / 12) * 10) / 10;
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

function DetailRow({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[var(--line)] py-3 last:border-b-0">
            <dt className="w-40 shrink-0 text-[11px] font-semibold tracking-[0.06em] text-[var(--slate)] uppercase">
                {label}
            </dt>
            <dd className="min-w-0 flex-1 text-sm break-words text-[var(--navy)]">
                {children}
            </dd>
        </div>
    );
}

/** Section switcher — shared console tab strip. */
function SectionTabs({
    value,
    onChange,
}: {
    value: TabId;
    onChange: (next: TabId) => void;
}) {
    return (
        <SystemTabs
            tabs={TABS}
            value={value}
            onChange={(next) => onChange(next as TabId)}
            ariaLabel="Applicant sections"
            testIdPrefix="applicant"
            data-testid="applicant-tabs"
        />
    );
}

/**
 * Edit sheet for one applicant, with dirty tracking, inline errors and a
 * locked email. Mounted only while open and keyed by user id, so the form
 * hook always starts from the record's current values.
 */
function ApplicantEditSheet({
    profile,
    email,
    subjectLabel,
    onClose,
}: {
    profile: ApplicantProfileRecord;
    email: string;
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
            <LockedField
                label="Email"
                value={
                    <span className="font-mono text-xs break-all">{email}</span>
                }
                reason="The sign-in email is verified at signup, so it cannot be edited here — the applicant changes it from their own account, and Support can re-send the verification link from Accounts."
                data-testid="locked-applicant-email"
            />
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

export default function SystemApplicantShow({
    applicantId,
}: ApplicantShowProps) {
    const state = useSystemState();
    const [tab, setTab] = useState<TabId>('overview');
    const [editOpen, setEditOpen] = useState(false);
    const [pending, setPending] = useState<PendingAction | null>(null);

    const record = state.applicantProfiles.find(
        (profile) => String(profile.userId) === String(applicantId),
    );

    const account = record
        ? (state.accounts.find((entry) => entry.id === record.userId) ?? null)
        : null;

    const experiences = useMemo(
        () =>
            record
                ? state.applicantExperiences
                      .filter(
                          (entry) => entry.applicantUserId === record.userId,
                      )
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                : [],
        [state, record],
    );

    const education = useMemo(
        () =>
            record
                ? state.applicantEducation
                      .filter(
                          (entry) => entry.applicantUserId === record.userId,
                      )
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                : [],
        [state, record],
    );

    const skills = useMemo(
        () =>
            record
                ? state.applicantSkills
                      .filter(
                          (entry) => entry.applicantUserId === record.userId,
                      )
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                : [],
        [state, record],
    );

    const certifications = useMemo(
        () =>
            record
                ? state.applicantCertifications
                      .filter(
                          (entry) => entry.applicantUserId === record.userId,
                      )
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                : [],
        [state, record],
    );

    const documents = useMemo(
        () =>
            record
                ? state.applicantDocuments.filter(
                      (entry) => entry.applicantUserId === record.userId,
                  )
                : [],
        [state, record],
    );

    const activeDocuments = useMemo(
        () => documents.filter((document) => document.deletedAt === null),
        [documents],
    );

    const applications = useMemo(
        () =>
            record
                ? state.applications
                      .filter(
                          (application) =>
                              application.applicantUserId === record.userId,
                      )
                      .sort((a, b) =>
                          b.submittedAt.localeCompare(a.submittedAt),
                      )
                : [],
        [state, record],
    );

    const completeness = useMemo(() => {
        if (!record) {
            return { filled: 0, total: 10, percent: 0 };
        }

        const checks = [
            record.headline !== null,
            record.phoneNumber !== null,
            record.currentLocation !== null,
            record.professionalSummary !== null,
            record.availability !== null,
            record.preferredPathway !== null,
            experiences.length > 0,
            education.length > 0,
            skills.length > 0,
            activeDocuments.length > 0,
        ];

        const filled = checks.filter(Boolean).length;

        return {
            filled,
            total: checks.length,
            percent: Math.round((filled / checks.length) * 100),
        };
    }, [record, experiences, education, skills, activeDocuments]);

    /**
     * The name only exists client-side, so the trail is set here rather
     * than on the static `layout`, which cannot know it. Runs before the
     * not-found branch so a stale link still reports where it came from.
     */
    setLayoutProps({
        breadcrumbs: [
            { title: 'Applicants', href: system.applicants() },
            {
                title: account?.name ?? 'Applicant not found',
                href: '#',
            },
        ],
    });

    if (!record || !account) {
        return (
            <>
                <Head title="Applicant" />
                <SystemPage>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="font-serif text-[32px] leading-tight font-bold tracking-[-0.02em] text-[var(--navy-deep)]">
                            Applicant not found
                        </h1>
                        <SuperAdminChip />
                    </div>
                    <DashboardEmptyState
                        icon={Users}
                        title="That applicant is no longer in the console"
                        message="Demo data resets whenever the page reloads, so a link opened later will not resolve."
                        onReset={() => router.get(system.applicants().url)}
                    />
                </SystemPage>
            </>
        );
    }

    const archived = account.deletedAt !== null;
    const latestApplication = applications[0];

    function mutateArchive(verb: 'archive' | 'restore') {
        // Re-checked here: narrowing from the branch above does not reach
        // into nested function declarations (the same guard agencies use).
        if (!record || !account) {
            return;
        }

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
                        ? {
                              ...entry,
                              deletedAt: verb === 'archive' ? stamp : null,
                          }
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

    function confirmPending() {
        if (!pending) {
            return;
        }

        mutateArchive(pending);
        setPending(null);
    }

    function pendingCopy() {
        const apps = applications.length;
        const docs = activeDocuments.length;

        if (pending === 'archive') {
            return {
                title: 'Archive this applicant?',
                description: `“${account?.name ?? 'This applicant'}” disappears from the candidate directory straight away.`,
                consequences: [
                    plural(apps, 'application') +
                        ' stay attached to their job posts and keep the stage they already have.',
                    `${docs} documents stay on file while they are archived.`,
                    `${experiences.length} experience ${experiences.length === 1 ? 'entry' : 'entries'} and ${certifications.length} certifications stay attached to the profile.`,
                    'Restore them at any time.',
                ],
                confirmLabel: 'Archive',
                destructive: true,
                testId: 'confirm-applicant-archive',
            };
        }

        return {
            title: 'Restore this applicant?',
            description: `“${account?.name ?? 'This applicant'}” returns to the candidate directory and every picker.`,
            consequences: [
                plural(apps, 'application') + ' need no change of their own.',
                `Their ${docs} documents become visible again.`,
            ],
            confirmLabel: 'Restore',
            destructive: false,
            testId: 'confirm-applicant-restore',
        };
    }

    const menuActions: SystemRowAction[] = archived
        ? [
              {
                  label: 'Restore applicant',
                  icon: ArchiveRestore,
                  testId: 'menu-restore-applicant',
                  onSelect: () => setPending('restore'),
              },
          ]
        : [
              {
                  label: 'Archive applicant',
                  icon: Archive,
                  testId: 'menu-archive-applicant',
                  onSelect: () => setPending('archive'),
              },
          ];

    const copy = pendingCopy();

    return (
        <>
            <Head title={account.name} />

            <SystemPage>
                <SystemPageHeader
                    title={account.name}
                    subtitle={`${record.headline ?? 'No headline yet'} · Joined ${formatDate(account.createdAt)}`}
                    actions={
                        <div className="flex flex-wrap items-center gap-3">
                            <StatusPill
                                tone={archived ? 'neutral' : 'success'}
                                dot
                                data-testid="status-applicant"
                            >
                                {archived ? 'Archived' : 'Active'}
                            </StatusPill>
                            <Button
                                type="button"
                                variant="secondary"
                                className="h-10 rounded-lg px-5 text-sm font-semibold"
                                onClick={() => setEditOpen(true)}
                                data-testid="button-applicant-edit"
                            >
                                <Pencil className="size-4" aria-hidden="true" />
                                Edit applicant
                            </Button>
                            <SystemRowMenu
                                actions={menuActions}
                                label={`More actions for ${account.name}`}
                            />
                        </div>
                    }
                    data-testid="header-applicant"
                />

                <KpiGrid>
                    <KpiCard
                        label="Profile completeness"
                        value={`${completeness.percent}%`}
                        caption={`${completeness.filled} of ${completeness.total} sections filled`}
                        icon={Target}
                        tone="teal"
                        data-testid="kpi-applicant-completeness"
                    />
                    <KpiCard
                        label="Applications"
                        value={applications.length}
                        caption={
                            latestApplication === undefined
                                ? 'None yet'
                                : `Latest stage: ${APPLICATION_STAGE_LABELS[latestApplication.stage]}`
                        }
                        icon={BriefcaseBusiness}
                        tone="blue"
                        data-testid="kpi-applicant-applications"
                    />
                    <KpiCard
                        label="Experience"
                        value={experienceYears(experiences)}
                        caption={
                            experiences.length === 0
                                ? 'No experience entries yet'
                                : `${plural(experiences.length, 'role')} on file`
                        }
                        icon={CalendarClock}
                        tone="amber"
                        data-testid="kpi-applicant-experience"
                    />
                    <KpiCard
                        label="Documents"
                        value={activeDocuments.length}
                        caption={`${documents.length - activeDocuments.length} archived`}
                        icon={FileText}
                        tone="violet"
                        data-testid="kpi-applicant-documents"
                    />
                </KpiGrid>

                <SectionTabs value={tab} onChange={setTab} />

                {tab === 'overview' && (
                    <div
                        role="tabpanel"
                        aria-label="Overview"
                        className="grid gap-5 lg:grid-cols-2"
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--navy)]">
                                    <Contact
                                        className="size-4 text-[var(--slate)]"
                                        aria-hidden="true"
                                    />
                                    Profile
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl>
                                    <DetailRow label="Headline">
                                        {record.headline ?? '—'}
                                    </DetailRow>
                                    <DetailRow label="Pathway">
                                        {record.preferredPathway === null ? (
                                            'No preference'
                                        ) : (
                                            <PathwayBadge
                                                pathway={
                                                    record.preferredPathway
                                                }
                                            />
                                        )}
                                    </DetailRow>
                                    <DetailRow label="Availability">
                                        {record.availability === null
                                            ? 'Not set'
                                            : AVAILABILITY_LABELS[
                                                  record.availability
                                              ]}
                                    </DetailRow>
                                    <DetailRow label="Expected salary">
                                        {latestApplication === undefined ||
                                        latestApplication.expectedMonthlySalary ===
                                            null
                                            ? '—'
                                            : `${numberFormat.format(latestApplication.expectedMonthlySalary)} per month`}
                                        {latestApplication !== undefined &&
                                            latestApplication.expectedMonthlySalary !==
                                                null && (
                                                <span className="ml-2 text-xs text-[var(--slate)]">
                                                    from the latest application
                                                </span>
                                            )}
                                    </DetailRow>
                                    <DetailRow label="Location">
                                        {record.currentLocation ?? '—'}
                                    </DetailRow>
                                    <DetailRow label="Last active">
                                        {account.lastActiveAt === null
                                            ? 'Not yet'
                                            : formatDate(account.lastActiveAt)}
                                    </DetailRow>
                                </dl>
                                {record.professionalSummary && (
                                    <p className="mt-4 border-t border-[var(--line)] pt-4 text-sm leading-relaxed whitespace-pre-line text-[var(--slate)]">
                                        {record.professionalSummary}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--navy)]">
                                    <Users
                                        className="size-4 text-[var(--slate)]"
                                        aria-hidden="true"
                                    />
                                    Contact and account
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <LockedField
                                    label="Email"
                                    value={
                                        <span className="font-mono text-xs break-all">
                                            {account.email}
                                        </span>
                                    }
                                    reason="The sign-in email is verified at signup, so it cannot be edited here — the applicant changes it from their own account, and Support can re-send the verification link from Accounts."
                                    data-testid="locked-applicant-email"
                                />
                                <dl className="mt-4">
                                    <DetailRow label="Phone">
                                        {record.phoneNumber ?? '—'}
                                    </DetailRow>
                                    <DetailRow label="Applicant ID">
                                        <span className="font-mono text-xs tabular-nums">
                                            {record.userId}
                                        </span>
                                    </DetailRow>
                                    <DetailRow label="Directory">
                                        {record.isVisibleToAgencies
                                            ? 'Visible to Agencies'
                                            : 'Hidden from Agencies'}
                                    </DetailRow>
                                    <DetailRow label="Default cover letter">
                                        {record.defaultCoverLetter === null
                                            ? 'None saved'
                                            : 'Saved'}
                                    </DetailRow>
                                    <DetailRow label="Account status">
                                        <StatusPill
                                            tone={
                                                archived ? 'neutral' : 'success'
                                            }
                                            dot
                                        >
                                            {archived ? 'Archived' : 'Active'}
                                        </StatusPill>
                                    </DetailRow>
                                </dl>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {tab === 'history' && (
                    <div
                        role="tabpanel"
                        aria-label="Experience and education"
                        className="flex flex-col gap-5"
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--navy)]">
                                    <Briefcase
                                        className="size-4 text-[var(--slate)]"
                                        aria-hidden="true"
                                    />
                                    Experience
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {experiences.length === 0 ? (
                                    <DashboardEmptyState
                                        icon={Briefcase}
                                        title="No experience entries"
                                        message="Roles the applicant adds to their own profile appear here."
                                    />
                                ) : (
                                    <ul className="divide-y divide-[var(--line)]">
                                        {experiences.map((entry) => (
                                            <li
                                                key={entry.id}
                                                className="py-3"
                                                data-testid={`applicant-experience-${entry.id}`}
                                            >
                                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                    <p className="text-sm font-medium text-[var(--navy)]">
                                                        {entry.jobRole}
                                                    </p>
                                                    <span className="text-xs text-[var(--slate)] tabular-nums">
                                                        {formatDate(
                                                            entry.startedOn,
                                                        )}{' '}
                                                        –{' '}
                                                        {entry.endedOn === null
                                                            ? 'Present'
                                                            : formatDate(
                                                                  entry.endedOn,
                                                              )}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[var(--slate)]">
                                                    {entry.companyName} ·{' '}
                                                    {entry.workLocation}
                                                </p>
                                                <p className="mt-1 text-sm text-[var(--slate)]">
                                                    {entry.responsibilities}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--navy)]">
                                    <GraduationCap
                                        className="size-4 text-[var(--slate)]"
                                        aria-hidden="true"
                                    />
                                    Education
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {education.length === 0 ? (
                                    <DashboardEmptyState
                                        icon={GraduationCap}
                                        title="No education entries"
                                        message="Schools the applicant adds to their own profile appear here."
                                    />
                                ) : (
                                    <ul className="divide-y divide-[var(--line)]">
                                        {education.map((entry) => (
                                            <li
                                                key={entry.id}
                                                className="flex flex-wrap items-baseline justify-between gap-2 py-3"
                                                data-testid={`applicant-education-${entry.id}`}
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-[var(--navy)]">
                                                        {entry.degree}
                                                    </p>
                                                    <p className="text-xs text-[var(--slate)]">
                                                        {entry.fieldOfStudy} ·{' '}
                                                        {entry.schoolName}
                                                    </p>
                                                </div>
                                                <span className="text-xs text-[var(--slate)] tabular-nums">
                                                    {formatDate(
                                                        entry.startedOn,
                                                    )}{' '}
                                                    –{' '}
                                                    {entry.endedOn === null
                                                        ? 'Present'
                                                        : formatDate(
                                                              entry.endedOn,
                                                          )}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {tab === 'skills' && (
                    <div
                        role="tabpanel"
                        aria-label="Skills and certifications"
                        className="grid gap-5 lg:grid-cols-2"
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--navy)]">
                                    <Award
                                        className="size-4 text-[var(--slate)]"
                                        aria-hidden="true"
                                    />
                                    Skills
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {skills.length === 0 ? (
                                    <DashboardEmptyState
                                        icon={Award}
                                        title="No skills yet"
                                        message="Skills the applicant adds to their own profile appear here."
                                    />
                                ) : (
                                    <ul className="divide-y divide-[var(--line)]">
                                        {skills.map((entry) => (
                                            <li
                                                key={entry.id}
                                                className="flex flex-wrap items-center justify-between gap-3 py-3"
                                                data-testid={`applicant-skill-${entry.id}`}
                                            >
                                                <span className="min-w-0 truncate text-sm font-medium text-[var(--navy)]">
                                                    {entry.skillName}
                                                </span>
                                                <StatusPill
                                                    tone={
                                                        SKILL_TONE[
                                                            entry.skillLevel
                                                        ]
                                                    }
                                                    size="sm"
                                                >
                                                    {
                                                        SKILL_LEVEL_LABELS[
                                                            entry.skillLevel
                                                        ]
                                                    }
                                                </StatusPill>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--navy)]">
                                    <Award
                                        className="size-4 text-[var(--slate)]"
                                        aria-hidden="true"
                                    />
                                    Certifications
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {certifications.length === 0 ? (
                                    <DashboardEmptyState
                                        icon={Award}
                                        title="No certifications yet"
                                        message="Credentials the applicant adds to their own profile appear here."
                                    />
                                ) : (
                                    <ul className="divide-y divide-[var(--line)]">
                                        {certifications.map((entry) => (
                                            <li
                                                key={entry.id}
                                                className="py-3"
                                                data-testid={`applicant-certification-${entry.id}`}
                                            >
                                                <p className="text-sm font-medium text-[var(--navy)]">
                                                    {entry.certificationName}
                                                </p>
                                                <p className="text-xs text-[var(--slate)]">
                                                    {entry.issuingOrganization}
                                                    {' · issued '}
                                                    {entry.issuedOn === null
                                                        ? 'date not set'
                                                        : formatDate(
                                                              entry.issuedOn,
                                                          )}
                                                    {entry.expiresOn !== null &&
                                                        ` · expires ${formatDate(entry.expiresOn)}`}
                                                </p>
                                                {entry.credentialUrl !==
                                                    null && (
                                                    <a
                                                        href={
                                                            entry.credentialUrl
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-1 inline-block text-xs text-[var(--teal-ink)] underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
                                                    >
                                                        View credential
                                                    </a>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {tab === 'documents' && (
                    <div role="tabpanel" aria-label="Documents">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base font-semibold text-[var(--navy)]">
                                    Documents
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {documents.length === 0 ? (
                                    <DashboardEmptyState
                                        icon={FileText}
                                        title="No documents on file"
                                        message="Files the applicant uploads with their profile appear here."
                                    />
                                ) : (
                                    <ul className="divide-y divide-[var(--line)]">
                                        {documents.map((document) => {
                                            const docArchived =
                                                document.deletedAt !== null;

                                            return (
                                                <li
                                                    key={document.id}
                                                    className={cn(
                                                        'flex flex-wrap items-center justify-between gap-3 py-3',
                                                        docArchived &&
                                                            'opacity-70',
                                                    )}
                                                    data-testid={`applicant-document-${document.id}`}
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-[var(--navy)]">
                                                            {
                                                                document.originalFileName
                                                            }
                                                        </p>
                                                        <p className="text-xs text-[var(--slate)] tabular-nums">
                                                            {formatBytes(
                                                                document.fileSizeBytes,
                                                            )}
                                                            {' · uploaded '}
                                                            {formatDate(
                                                                document.uploadedAt,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <StatusPill tone="info">
                                                            {
                                                                DOCUMENT_TYPE_LABELS[
                                                                    document
                                                                        .documentType
                                                                ]
                                                            }
                                                        </StatusPill>
                                                        {document.isPrimary && (
                                                            <StatusPill tone="teal">
                                                                Primary
                                                            </StatusPill>
                                                        )}
                                                        {docArchived && (
                                                            <StatusPill tone="neutral">
                                                                Archived
                                                            </StatusPill>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {tab === 'applications' && (
                    <div role="tabpanel" aria-label="Applications">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base font-semibold text-[var(--navy)]">
                                    <span>Applications</span>
                                    <Button
                                        type="button"
                                        variant="link"
                                        size="sm"
                                        asChild
                                        data-testid="link-all-applications"
                                    >
                                        <Link href={system.applications()}>
                                            View all applications
                                        </Link>
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {applications.length === 0 ? (
                                    <DashboardEmptyState
                                        icon={BriefcaseBusiness}
                                        title="No applications yet"
                                        message="Job posts this applicant applied to will be listed here."
                                    />
                                ) : (
                                    <ul className="divide-y divide-[var(--line)]">
                                        {applications.map((application) => {
                                            const post = state.jobPosts.find(
                                                (entry) =>
                                                    entry.id ===
                                                    application.jobPostId,
                                            );

                                            return (
                                                <li
                                                    key={application.id}
                                                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                                                    data-testid={`applicant-application-${application.id}`}
                                                >
                                                    <div className="min-w-0">
                                                        <Link
                                                            href={jobPostShow({
                                                                jobPost:
                                                                    application.jobPostId,
                                                            })}
                                                            className="block truncate text-sm font-medium text-[var(--navy)] transition-colors hover:text-[var(--teal-ink)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
                                                        >
                                                            {post?.jobTitle ??
                                                                `Job post #${application.jobPostId}`}
                                                        </Link>
                                                        <p className="text-xs text-[var(--slate)]">
                                                            Submitted{' '}
                                                            {formatDate(
                                                                application.submittedAt,
                                                            )}
                                                            {application.expectedMonthlySalary !==
                                                                null &&
                                                                ` · ${numberFormat.format(application.expectedMonthlySalary)} per month`}
                                                        </p>
                                                    </div>
                                                    <StatusPill
                                                        tone={
                                                            STAGE_TONE[
                                                                application
                                                                    .stage
                                                            ]
                                                        }
                                                        dot
                                                    >
                                                        {
                                                            APPLICATION_STAGE_LABELS[
                                                                application
                                                                    .stage
                                                            ]
                                                        }
                                                    </StatusPill>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </SystemPage>

            {editOpen && (
                <ApplicantEditSheet
                    key={`edit-applicant-${record.userId}`}
                    profile={record}
                    email={account.email}
                    subjectLabel={account.name}
                    onClose={() => setEditOpen(false)}
                />
            )}

            {pending && (
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

SystemApplicantShow.layout = {
    breadcrumbs: [
        { title: 'Applicants', href: system.applicants() },
        { title: 'Applicant details', href: '#' },
    ],
};
