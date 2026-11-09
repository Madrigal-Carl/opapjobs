import { Head, Link, router, setLayoutProps } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    Banknote,
    BriefcaseBusiness,
    Building2,
    CalendarClock,
    Contact,
    MessageSquareText,
    Pause,
    Pencil,
    Play,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import type { StatusPillTone } from '@/components/dashboard/badges';
import {
    PathwayBadge,
    StatusPill,
    UrgentBadge,
} from '@/components/dashboard/badges';
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
import { SystemRowMenu } from '@/components/system/system-row-menu';
import { SystemTabs } from '@/components/system/system-tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
    AGENCY_STATUS_LABELS,
    DISPLAY_STATUS_LABELS,
    agencyDisplayStatus,
    jobPostDisplayStatus,
    reopeningNeedsNewDate,
    subcategoryPathway,
    todayIso,
    type AgencyDisplayStatus,
} from '@/data/system/selectors';
import {
    commitSystemChange,
    popAuditEntry,
    updateSystemState,
    useSystemState,
    type SystemState,
} from '@/data/system/store';
import {
    APPLICATION_STAGE_LABELS,
    AVAILABILITY_LABELS,
    type ApplicationStage,
    type ContractType,
    type EducationLevel,
    type GenderRequirement,
    type JobPostRecord,
    type QuestionAnswerType,
    type RecruitmentType,
} from '@/data/system/types';
import type { JobPostDisplayStatus } from '@/types/job-post';
import { formatJobPostSalary } from '@/lib/job-post-salary';
import * as system from '@/routes/dashboard/system';
import { show as agencyShow } from '@/routes/dashboard/system/agencies';

/**
 * One job post, in full (§8.2 of `docs/database.md`).
 *
 * The record view a superadmin opens from the list: what the job post asks
 * for, who posted it, who applied, and the reversible status verbs. The
 * sections exist because these questions have different answers — the
 * screening questions are a different surface from the applications, and
 * both differ from amending the post itself.
 *
 * The stored status is only ever `pending | closed | archived`; the pill
 * shows the *display* status (`active | expired | closed | archived`) that
 * applicants and agencies actually read. A refresh loses the in-memory
 * store, so an id that no longer resolves gets a real "not found" rather
 * than an empty page.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Display status is what the operator reads, so tones are keyed off it. */
const POST_TONE: Record<JobPostDisplayStatus, StatusPillTone> = {
    active: 'success',
    expired: 'warning',
    closed: 'neutral',
    archived: 'neutral',
};

const AGENCY_TONE: Record<AgencyDisplayStatus, StatusPillTone> = {
    active: 'success',
    suspended: 'warning',
    archived: 'neutral',
};

const STAGE_TONE: Record<ApplicationStage, StatusPillTone> = {
    applied: 'info',
    reviewed: 'teal',
    interview: 'warning',
    hired: 'success',
    pending: 'neutral',
};

/** Stored enums render as words; these are the console's labels (§6.1). */
const CONTRACT_LABELS: Record<ContractType, string> = {
    permanent: 'Permanent',
    fixed: 'Fixed-term',
    seasonal: 'Seasonal',
};

const EDUCATION_LABELS: Record<EducationLevel, string> = {
    secondary: 'Secondary',
    vocational: 'Vocational',
    bachelor: 'Bachelor’s degree',
    master: 'Master’s degree',
};

const GENDER_LABELS: Record<GenderRequirement, string> = {
    any: 'Any',
    male: 'Male',
    female: 'Female',
};

const RECRUITMENT_LABELS: Record<RecruitmentType, string> = {
    joborder: 'Job order',
    manpooling: 'Manpower pooling',
};

const ANSWER_TYPE_LABELS: Record<QuestionAnswerType, string> = {
    yesno: 'Yes / no',
    short: 'Short text',
    paragraph: 'Paragraph',
    selection: 'Selection',
    number: 'Number',
};

const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'requirements', label: 'Requirements' },
    { id: 'applications', label: 'Applications' },
    { id: 'agency', label: 'Agency' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** The confirm dialog renders from whichever verb is in flight. */
type PendingAction = 'close' | 'reopen' | 'archive' | 'restore';

type JobPostShowProps = {
    jobPostId: string;
};

type EditDraft = {
    jobTitle: string;
    workLocation: string;
    vacantPositions: string;
    closingDate: string;
    monthlySalaryMin: string;
    monthlySalaryMax: string;
    isUrgent: 'yes' | 'no';
    contactPersonName: string;
    contactEmail: string;
    contactPhone: string;
    jobDescription: string;
    otherRequirements: string;
    applicationInstructions: string;
};

type EditErrors = Partial<Record<keyof EditDraft, string>>;

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/** "English (fluent)" style labels from the stored lowercase values. */
function sentence(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
}

const numberFormat = new Intl.NumberFormat('en-US');

/**
 * Whole days from today to a closing date. Positive means still ahead;
 * a post with no closing date never reaches this helper.
 */
function daysUntil(value: string): number {
    const closing = Date.parse(`${value}T00:00:00Z`);
    const today = Date.parse(`${todayIso()}T00:00:00Z`);

    return Math.round((closing - today) / 86_400_000);
}

/** Countdown line under the closing-date KPI. */
function closingCountdown(post: JobPostRecord): string {
    if (post.closingDate === null) {
        return 'No closing date — never expires';
    }

    const days = daysUntil(post.closingDate);

    if (days > 1) {
        return `Closes in ${days} days`;
    }

    if (days === 1) {
        return 'Closes tomorrow';
    }

    if (days === 0) {
        return 'Closes today';
    }

    return days === -1
        ? 'Date passed 1 day ago'
        : `Date passed ${-days} days ago`;
}

function experienceLabel(post: JobPostRecord): string {
    const { minExperienceYears: min, maxExperienceYears: max } = post;

    if (min === null && max === null) {
        return 'No experience required';
    }

    if (min !== null && max !== null) {
        return min === max ? `${min} years` : `${min}–${max} years`;
    }

    if (min !== null) {
        return `${min}+ years`;
    }

    return max === null ? 'No experience required' : `Up to ${max} years`;
}

/**
 * Salary through the canonical formatter. The shared helper speaks the
 * API row's snake_case strings, so the record's numbers are adapted here
 * rather than the formatter being re-written.
 */
function salaryFor(post: JobPostRecord): {
    amount: string;
    period: 'mo' | null;
} {
    return formatJobPostSalary({
        salary_currency: post.salaryCurrency,
        monthly_salary_min:
            post.monthlySalaryMin === null
                ? null
                : String(post.monthlySalaryMin),
        monthly_salary_max:
            post.monthlySalaryMax === null
                ? null
                : String(post.monthlySalaryMax),
    });
}

/**
 * Category path for a job post, e.g. "Construction / Welder".
 *
 * Built from the two lookup tables rather than stored on the post, so a
 * renamed category shows its current name here instead of a stale copy.
 */
function postCategoryLabel(state: SystemState, post: JobPostRecord): string {
    const subcategory = state.subcategories.find(
        (entry) => entry.id === post.jobSubcategoryId,
    );

    if (!subcategory) {
        return 'Unfiled';
    }

    const category = state.categories.find(
        (entry) => entry.id === subcategory.jobCategoryId,
    );

    return category
        ? `${category.categoryName} / ${subcategory.subcategoryName}`
        : subcategory.subcategoryName;
}

function toDraft(post: JobPostRecord): EditDraft {
    return {
        jobTitle: post.jobTitle,
        workLocation: post.workLocation,
        vacantPositions: String(post.vacantPositions),
        closingDate: post.closingDate ?? '',
        monthlySalaryMin:
            post.monthlySalaryMin === null ? '' : String(post.monthlySalaryMin),
        monthlySalaryMax:
            post.monthlySalaryMax === null ? '' : String(post.monthlySalaryMax),
        isUrgent: post.isUrgent ? 'yes' : 'no',
        contactPersonName: post.contactPersonName ?? '',
        contactEmail: post.contactEmail ?? '',
        contactPhone: post.contactPhone ?? '',
        jobDescription: post.jobDescription,
        otherRequirements: post.otherRequirements ?? '',
        applicationInstructions: post.applicationInstructions ?? '',
    };
}

function validateDraft(draft: EditDraft): EditErrors {
    const errors: EditErrors = {};

    if (draft.jobTitle.trim() === '') {
        errors.jobTitle = 'Enter the job title.';
    }

    if (draft.workLocation.trim() === '') {
        errors.workLocation = 'Enter the work location.';
    }

    const vacancies = Number(draft.vacantPositions);

    if (
        draft.vacantPositions.trim() === '' ||
        !Number.isInteger(vacancies) ||
        vacancies < 1
    ) {
        errors.vacantPositions =
            'Enter a whole number of positions, at least 1.';
    }

    if (
        draft.closingDate.trim() !== '' &&
        !/^\d{4}-\d{2}-\d{2}$/.test(draft.closingDate.trim())
    ) {
        errors.closingDate =
            'Pick a date, or leave it empty for a post that never expires.';
    }

    const minimum =
        draft.monthlySalaryMin.trim() === ''
            ? null
            : Number(draft.monthlySalaryMin.trim());
    const maximum =
        draft.monthlySalaryMax.trim() === ''
            ? null
            : Number(draft.monthlySalaryMax.trim());

    if (minimum !== null && (!Number.isFinite(minimum) || minimum < 0)) {
        errors.monthlySalaryMin = 'Enter a number, or leave it empty.';
    }

    if (maximum !== null && (!Number.isFinite(maximum) || maximum < 0)) {
        errors.monthlySalaryMax = 'Enter a number, or leave it empty.';
    }

    if (
        minimum !== null &&
        maximum !== null &&
        Number.isFinite(minimum) &&
        Number.isFinite(maximum) &&
        maximum < minimum
    ) {
        errors.monthlySalaryMax =
            'The upper bound cannot be below the lower one.';
    }

    if (
        draft.contactEmail.trim() !== '' &&
        !EMAIL_PATTERN.test(draft.contactEmail.trim())
    ) {
        errors.contactEmail = 'Enter a valid email address, or leave it empty.';
    }

    if (draft.jobDescription.trim() === '') {
        errors.jobDescription = 'Enter the job description.';
    }

    // Rich text in this app is plain text with a hard cap (§4.1 exception 1).
    if (draft.jobDescription.length > 20_000) {
        errors.jobDescription = 'Keep the description under 20,000 characters.';
    }

    if (draft.otherRequirements.length > 20_000) {
        errors.otherRequirements = 'Keep this under 20,000 characters.';
    }

    if (draft.applicationInstructions.length > 20_000) {
        errors.applicationInstructions =
            'Keep the instructions under 20,000 characters.';
    }

    return errors;
}

/** Pairs the editable fields with their labels for the audit diff. */
const EDIT_FIELDS: { key: keyof EditDraft; label: string }[] = [
    { key: 'jobTitle', label: 'Job title' },
    { key: 'workLocation', label: 'Work location' },
    { key: 'vacantPositions', label: 'Vacant positions' },
    { key: 'closingDate', label: 'Closing date' },
    { key: 'monthlySalaryMin', label: 'Salary from' },
    { key: 'monthlySalaryMax', label: 'Salary to' },
    { key: 'isUrgent', label: 'Urgent' },
    { key: 'contactPersonName', label: 'Contact person' },
    { key: 'contactEmail', label: 'Contact email' },
    { key: 'contactPhone', label: 'Contact phone' },
    { key: 'jobDescription', label: 'Job description' },
    { key: 'otherRequirements', label: 'Other requirements' },
    { key: 'applicationInstructions', label: 'Application instructions' },
];

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
            ariaLabel="Job post sections"
            testIdPrefix="job-post"
            data-testid="job-post-tabs"
        />
    );
}

export default function SystemJobPostShow({ jobPostId }: JobPostShowProps) {
    const state = useSystemState();
    const [tab, setTab] = useState<TabId>('overview');
    const [editOpen, setEditOpen] = useState(false);
    const [draft, setDraft] = useState<EditDraft | null>(null);
    const [errors, setErrors] = useState<EditErrors>({});
    const [pending, setPending] = useState<PendingAction | null>(null);
    const [newClosingDate, setNewClosingDate] = useState('');
    const [reopenError, setReopenError] = useState<string | null>(null);

    const record = state.jobPosts.find(
        (entry) => String(entry.id) === String(jobPostId),
    );

    const applications = useMemo(
        () =>
            record
                ? state.applications.filter(
                      (application) => application.jobPostId === record.id,
                  )
                : [],
        [state, record],
    );

    const questions = useMemo(
        () =>
            record
                ? state.jobPostQuestions
                      .filter(
                          (question) =>
                              question.jobPostId === record.id &&
                              question.deletedAt === null,
                      )
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                : [],
        [state, record],
    );

    /**
     * The title only exists client-side, so the trail is set here rather
     * than on the static `layout`, which cannot know it. Runs before the
     * not-found branch so a stale link still reports where it came from.
     */
    setLayoutProps({
        breadcrumbs: [
            { title: 'Job posts', href: system.jobPosts() },
            {
                title: record?.jobTitle ?? 'Job post not found',
                href: '#',
            },
        ],
    });

    if (!record) {
        return (
            <>
                <Head title="Job post" />
                <SystemPage>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="font-serif text-[32px] leading-tight font-bold tracking-[-0.02em] text-[var(--navy-deep)]">
                            Job post not found
                        </h1>
                        <SuperAdminChip />
                    </div>
                    <DashboardEmptyState
                        icon={BriefcaseBusiness}
                        title="That job post is no longer in the console"
                        message="Demo data resets whenever the page reloads, so a link opened later will not resolve."
                        onReset={() => router.get(system.jobPosts().url)}
                    />
                </SystemPage>
            </>
        );
    }

    const displayStatus = jobPostDisplayStatus(record);
    const agency = state.agencies.find((entry) => entry.id === record.agencyId);
    // The post's pathway comes from its subcategory's category; the
    // Agency's single pathway is the fallback if the lookup is missing.
    const pathway =
        subcategoryPathway(state, record.jobSubcategoryId) ??
        agency?.pathway ??
        null;
    const poster = state.accounts.find(
        (entry) => entry.id === record.postedByUserId,
    );
    const salary = salaryFor(record);
    const needsNewDateToReopen = reopeningNeedsNewDate(record);

    function openEdit() {
        if (!record) {
            return;
        }

        setDraft(toDraft(record));
        setErrors({});
        setEditOpen(true);
    }

    function update(key: keyof EditDraft, value: string) {
        setDraft((current) =>
            current ? { ...current, [key]: value } : current,
        );
        setErrors((current) =>
            current[key] === undefined
                ? current
                : { ...current, [key]: undefined },
        );
    }

    function requestAction(next: PendingAction) {
        setPending(next);
        setNewClosingDate('');
        setReopenError(null);
    }

    function saveEdit() {
        if (!draft || !record) {
            return;
        }

        const found = validateDraft(draft);

        if (Object.keys(found).length > 0) {
            setErrors(found);
            return;
        }

        const original = toDraft(record);
        const stamp = new Date().toISOString();

        /**
         * The draft holds form strings; Undo has to hand back the record's
         * own values or numeric fields would be restored as text.
         */
        const undo: Partial<JobPostRecord> = {
            jobTitle: record.jobTitle,
            workLocation: record.workLocation,
            vacantPositions: record.vacantPositions,
            closingDate: record.closingDate,
            monthlySalaryMin: record.monthlySalaryMin,
            monthlySalaryMax: record.monthlySalaryMax,
            isUrgent: record.isUrgent,
            contactPersonName: record.contactPersonName,
            contactEmail: record.contactEmail,
            contactPhone: record.contactPhone,
            jobDescription: record.jobDescription,
            otherRequirements: record.otherRequirements,
            applicationInstructions: record.applicationInstructions,
            updatedAt: record.updatedAt,
        };
        const changes = EDIT_FIELDS.filter(
            (field) => draft[field.key] !== original[field.key],
        ).map((field) => ({
            field: field.label,
            from: original[field.key],
            to: draft[field.key],
        }));

        if (changes.length === 0) {
            setEditOpen(false);
            return;
        }

        const patch: Partial<JobPostRecord> = {
            jobTitle: draft.jobTitle.trim(),
            workLocation: draft.workLocation.trim(),
            vacantPositions: Number(draft.vacantPositions.trim()),
            closingDate:
                draft.closingDate.trim() === ''
                    ? null
                    : draft.closingDate.trim(),
            monthlySalaryMin:
                draft.monthlySalaryMin.trim() === ''
                    ? null
                    : Number(draft.monthlySalaryMin.trim()),
            monthlySalaryMax:
                draft.monthlySalaryMax.trim() === ''
                    ? null
                    : Number(draft.monthlySalaryMax.trim()),
            isUrgent: draft.isUrgent === 'yes',
            contactPersonName: draft.contactPersonName.trim() || null,
            contactEmail: draft.contactEmail.trim() || null,
            contactPhone: draft.contactPhone.trim() || null,
            jobDescription: draft.jobDescription.trim(),
            otherRequirements: draft.otherRequirements.trim() || null,
            applicationInstructions:
                draft.applicationInstructions.trim() || null,
            updatedAt: stamp,
        };

        commitSystemChange({
            action: 'update',
            subjectType: 'job_post',
            subjectId: record.id,
            subjectLabel: record.jobTitle,
            changes,
            apply: (current) => ({
                ...current,
                jobPosts: current.jobPosts.map((entry) =>
                    entry.id === record.id ? { ...entry, ...patch } : entry,
                ),
            }),
        });

        toast.success(`Changes to “${record.jobTitle}” saved.`, {
            duration: 6000,
            action: {
                label: 'Undo',
                onClick: () => {
                    updateSystemState((current) => ({
                        ...current,
                        jobPosts: current.jobPosts.map((entry) =>
                            entry.id === record.id
                                ? { ...entry, ...undo }
                                : entry,
                        ),
                    }));
                    popAuditEntry();
                },
            },
        });

        setEditOpen(false);
    }

    function confirmPending() {
        if (!pending || !record) {
            return;
        }

        // §8.2: reopening a post whose closing date has passed needs a new
        // future date, or the post would come straight back as expired.
        if (pending === 'reopen' && reopeningNeedsNewDate(record)) {
            const picked = newClosingDate.trim();

            if (picked === '' || picked < todayIso()) {
                setReopenError(
                    'Pick today or a later date — the old closing date has passed.',
                );
                return;
            }

            mutateStatus('reopen', new Date().toISOString(), picked);
            setPending(null);
            setNewClosingDate('');
            setReopenError(null);
            return;
        }

        mutateStatus(pending, new Date().toISOString(), null);
        setPending(null);
    }

    function mutateStatus(
        verb: 'close' | 'reopen' | 'archive' | 'restore',
        stamp: string,
        newDate: string | null,
    ) {
        if (!record) {
            return;
        }

        let patch: Partial<JobPostRecord>;
        let original: Partial<JobPostRecord>;
        let from: string;
        let to: string;
        let pastTense: string;

        if (verb === 'close') {
            patch = { status: 'closed' };
            original = { status: record.status };
            from = 'Pending';
            to = 'Closed';
            pastTense = 'closed';
        } else if (verb === 'reopen') {
            patch =
                newDate === null
                    ? { status: 'pending' }
                    : { status: 'pending', closingDate: newDate };
            original = {
                status: record.status,
                closingDate: record.closingDate,
            };
            from = 'Closed';
            to = 'Pending';
            pastTense = 'reopened';
        } else if (verb === 'archive') {
            patch = { status: 'archived' };
            original = { status: record.status };
            from = 'Pending';
            to = 'Archived';
            pastTense = 'archived';
        } else {
            patch = { status: 'pending' };
            original = { status: record.status };
            from = 'Archived';
            to = 'Pending';
            pastTense = 'restored';
        }

        const changes: { field: string; from: string | null; to: string }[] = [
            { field: 'Status', from, to },
        ];

        if (newDate !== null) {
            changes.push({
                field: 'Closing date',
                from: record.closingDate,
                to: newDate,
            });
        }

        commitSystemChange({
            action: verb,
            subjectType: 'job_post',
            subjectId: record.id,
            subjectLabel: record.jobTitle,
            changes,
            apply: (current) => ({
                ...current,
                jobPosts: current.jobPosts.map((entry) =>
                    entry.id === record.id ? { ...entry, ...patch } : entry,
                ),
            }),
        });

        toast.success(`“${record.jobTitle}” ${pastTense}.`, {
            duration: 6000,
            action: {
                label: 'Undo',
                onClick: () => {
                    updateSystemState((current) => ({
                        ...current,
                        jobPosts: current.jobPosts.map((entry) =>
                            entry.id === record.id
                                ? { ...entry, ...original }
                                : entry,
                        ),
                    }));
                    popAuditEntry();
                },
            },
        });
    }

    function pendingCopy() {
        if (!record) {
            return {
                title: 'Confirm change',
                description: 'This job post is no longer open in the console.',
                consequences: [],
                confirmLabel: 'Confirm',
                destructive: false,
                testId: 'confirm-job-post',
            };
        }

        const dateLine =
            record.closingDate === null
                ? 'It has no closing date.'
                : `Its closing date is ${formatDate(record.closingDate)}.`;

        if (pending === 'close') {
            return {
                title: 'Close this job post?',
                description: `“${record.jobTitle}” stops accepting applications.`,
                consequences: [
                    `${applications.length} ${applications.length === 1 ? 'application stays' : 'applications stay'} attached and keep ${applications.length === 1 ? 'its stage' : 'their stages'}.`,
                    'Applicants can no longer apply, and it leaves every active search straight away.',
                    needsNewDateToReopen
                        ? 'Reopening will ask for a new closing date, because the current one is in the past.'
                        : 'You can reopen it at any time.',
                ],
                confirmLabel: 'Close',
                destructive: true,
                testId: 'confirm-job-post-close',
            };
        }

        if (pending === 'reopen') {
            return {
                title: 'Reopen this job post?',
                description: `“${record.jobTitle}” starts accepting applications again.`,
                consequences: [
                    `${applications.length} existing ${applications.length === 1 ? 'application keeps' : 'applications keep'} ${applications.length === 1 ? 'its stage' : 'their stages'} and history.`,
                    needsNewDateToReopen
                        ? `The closing date has passed, so pick a new one below — reopening without one would show the post as Expired.`
                        : `${dateLine} It comes back as Active.`,
                ],
                confirmLabel: 'Reopen',
                destructive: false,
                testId: 'confirm-job-post-reopen',
            };
        }

        if (pending === 'archive') {
            return {
                title: 'Archive this job post?',
                description: `“${record.jobTitle}” disappears from every list straight away.`,
                consequences: [
                    `${applications.length} ${applications.length === 1 ? 'application stays' : 'applications stay'} attached with ${applications.length === 1 ? 'its stage' : 'their stages'} and history.`,
                    'It accepts no new applications while it is archived.',
                    'Restoring keeps the existing closing date, so a past date brings it back as Expired until a new date is set.',
                ],
                confirmLabel: 'Archive',
                destructive: true,
                testId: 'confirm-job-post-archive',
            };
        }

        return {
            title: 'Restore this job post?',
            description: `“${record.jobTitle}” returns to every list and picker.`,
            consequences: [
                `It shows its ${record.vacantPositions} vacant ${record.vacantPositions === 1 ? 'position' : 'positions'} again and accepts applications.`,
                `${dateLine} Restore never forces a new closing date, so a past one brings it back as Expired.`,
            ],
            confirmLabel: 'Restore',
            destructive: false,
            testId: 'confirm-job-post-restore',
        };
    }

    const copy = pendingCopy();

    /** Nothing to save until a field actually differs from the record. */
    const draftDirty =
        draft !== null &&
        EDIT_FIELDS.some(
            (field) => draft[field.key] !== toDraft(record)[field.key],
        );

    return (
        <>
            <Head title={record.jobTitle} />

            <SystemPage>
                <div className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm md:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="font-serif text-[32px] leading-tight font-bold tracking-[-0.02em] text-[var(--navy-deep)]">
                                    {record.jobTitle}
                                </h1>
                                {pathway !== null && (
                                    <PathwayBadge pathway={pathway} />
                                )}
                                {record.isUrgent && <UrgentBadge />}
                                <StatusPill
                                    tone={POST_TONE[displayStatus]}
                                    dot
                                    data-testid="status-job-post"
                                >
                                    {DISPLAY_STATUS_LABELS[displayStatus]}
                                </StatusPill>
                            </div>
                            <p className="mt-1 text-sm text-[var(--slate)]">
                                {agency ? (
                                    <Link
                                        href={agencyShow({ agency: agency.id })}
                                        className="text-[var(--teal-ink)] underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
                                    >
                                        {agency.agencyName}
                                    </Link>
                                ) : (
                                    'Agency not found'
                                )}{' '}
                                · {record.workLocation} ·{' '}
                                {CONTRACT_LABELS[record.contractType]}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <SuperAdminChip />
                            <Button
                                type="button"
                                variant="secondary"
                                className="h-10 rounded-lg px-5 text-sm font-semibold"
                                onClick={openEdit}
                                data-testid="button-job-post-edit"
                            >
                                <Pencil className="size-4" aria-hidden="true" />
                                Edit job post
                            </Button>
                            <SystemRowMenu
                                label="Job post actions"
                                testId="job-post-menu"
                                actions={
                                    displayStatus === 'archived'
                                        ? [
                                              {
                                                  label: 'Restore job post',
                                                  icon: ArchiveRestore,
                                                  testId: 'menu-restore-job-post',
                                                  onSelect: () =>
                                                      requestAction('restore'),
                                              },
                                          ]
                                        : [
                                              ...(record.status === 'closed'
                                                  ? [
                                                        {
                                                            label: 'Reopen job post',
                                                            icon: Play,
                                                            testId: 'menu-reopen-job-post',
                                                            onSelect: () =>
                                                                requestAction(
                                                                    'reopen',
                                                                ),
                                                        },
                                                    ]
                                                  : [
                                                        {
                                                            label: 'Close job post',
                                                            icon: Pause,
                                                            testId: 'menu-close-job-post',
                                                            onSelect: () =>
                                                                requestAction(
                                                                    'close',
                                                                ),
                                                        },
                                                    ]),
                                              {
                                                  label: 'Archive job post',
                                                  icon: Archive,
                                                  destructive: true,
                                                  hint: 'Stops it appearing everywhere',
                                                  testId: 'menu-archive-job-post',
                                                  onSelect: () =>
                                                      requestAction('archive'),
                                              },
                                          ]
                                }
                            />
                        </div>
                    </div>
                </div>

                <KpiGrid>
                    <KpiCard
                        label="Vacant positions"
                        value={record.vacantPositions}
                        caption="Seats open on this job post"
                        icon={BriefcaseBusiness}
                        tone="teal"
                        data-testid="kpi-job-post-vacancies"
                    />
                    <KpiCard
                        label="Applicants"
                        value={applications.length}
                        caption={
                            applications.length === 0
                                ? 'No applications yet'
                                : 'Across this job post'
                        }
                        icon={Users}
                        tone="violet"
                        data-testid="kpi-job-post-applicants"
                    />
                    <KpiCard
                        label="Closing date"
                        value={
                            record.closingDate === null
                                ? 'None'
                                : formatDate(record.closingDate)
                        }
                        caption={closingCountdown(record)}
                        icon={CalendarClock}
                        tone="amber"
                        data-testid="kpi-job-post-closing"
                    />
                    <KpiCard
                        label="Salary"
                        value={salary.amount}
                        caption={
                            salary.period === 'mo'
                                ? 'Per month'
                                : 'No salary range set'
                        }
                        icon={Banknote}
                        tone="emerald"
                        data-testid="kpi-job-post-salary"
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
                                    <BriefcaseBusiness
                                        className="size-4 text-[var(--slate)]"
                                        aria-hidden="true"
                                    />
                                    The job post
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl>
                                    <DetailRow label="Category">
                                        {postCategoryLabel(state, record)}
                                    </DetailRow>
                                    <DetailRow label="Work location">
                                        {record.workLocation}
                                    </DetailRow>
                                    <DetailRow label="Contract">
                                        {CONTRACT_LABELS[record.contractType]}
                                    </DetailRow>
                                    <DetailRow label="Recruitment">
                                        {
                                            RECRUITMENT_LABELS[
                                                record.recruitmentType
                                            ]
                                        }
                                    </DetailRow>
                                    <DetailRow label="Vacant positions">
                                        <span className="tabular-nums">
                                            {record.vacantPositions}
                                        </span>
                                    </DetailRow>
                                    <DetailRow label="Salary">
                                        {salary.amount}
                                        {salary.period === 'mo'
                                            ? ' per month'
                                            : ''}
                                    </DetailRow>
                                    <DetailRow label="Experience">
                                        {experienceLabel(record)}
                                    </DetailRow>
                                    <DetailRow label="Education">
                                        {
                                            EDUCATION_LABELS[
                                                record.educationLevel
                                            ]
                                        }
                                    </DetailRow>
                                    <DetailRow label="Gender">
                                        {
                                            GENDER_LABELS[
                                                record.genderRequirement
                                            ]
                                        }
                                    </DetailRow>
                                    <DetailRow label="Languages">
                                        {record.languages.length === 0
                                            ? '—'
                                            : record.languages
                                                  .map(
                                                      (entry) =>
                                                          `${sentence(entry.language)} (${sentence(entry.proficiency)})`,
                                                  )
                                                  .join(', ')}
                                    </DetailRow>
                                    <DetailRow label="Closing date">
                                        {record.closingDate === null ? (
                                            'No closing date — this post never expires'
                                        ) : (
                                            <span className="inline-flex flex-wrap items-center gap-2">
                                                <span className="tabular-nums">
                                                    {formatDate(
                                                        record.closingDate,
                                                    )}
                                                </span>
                                                {displayStatus ===
                                                    'expired' && (
                                                    <StatusPill
                                                        tone="warning"
                                                        size="sm"
                                                    >
                                                        Date passed
                                                    </StatusPill>
                                                )}
                                                {displayStatus === 'closed' && (
                                                    <StatusPill
                                                        tone="neutral"
                                                        size="sm"
                                                    >
                                                        Closed by staff
                                                    </StatusPill>
                                                )}
                                                {displayStatus ===
                                                    'archived' && (
                                                    <StatusPill
                                                        tone="neutral"
                                                        size="sm"
                                                    >
                                                        Archived
                                                    </StatusPill>
                                                )}
                                            </span>
                                        )}
                                    </DetailRow>
                                    <DetailRow label="Posted">
                                        {formatDate(record.createdAt)} by{' '}
                                        {poster?.name ?? 'Unknown account'}
                                    </DetailRow>
                                </dl>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--navy)]">
                                    <Contact
                                        className="size-4 text-[var(--slate)]"
                                        aria-hidden="true"
                                    />
                                    Contact
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl>
                                    <DetailRow label="Contact person">
                                        {record.contactPersonName ?? '—'}
                                    </DetailRow>
                                    <DetailRow label="Email">
                                        {record.contactEmail ?? '—'}
                                    </DetailRow>
                                    <DetailRow label="Phone">
                                        {record.contactPhone ?? '—'}
                                    </DetailRow>
                                    <DetailRow label="Posted by">
                                        {poster?.email ?? 'Unknown account'}
                                    </DetailRow>
                                </dl>
                            </CardContent>
                        </Card>

                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--navy)]">
                                        <MessageSquareText
                                            className="size-4 text-[var(--slate)]"
                                            aria-hidden="true"
                                        />
                                        Job description
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--navy)]">
                                        {record.jobDescription}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {tab === 'requirements' && (
                    <div
                        role="tabpanel"
                        aria-label="Requirements"
                        className="flex flex-col gap-5"
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base font-semibold text-[var(--navy)]">
                                    Screening questions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {questions.length === 0 ? (
                                    <DashboardEmptyState
                                        icon={MessageSquareText}
                                        title="No screening questions"
                                        message="Screening questions for this job post will be listed here."
                                    />
                                ) : (
                                    <>
                                        <ul className="divide-y divide-[var(--line)]">
                                            {questions.map((question) => (
                                                <li
                                                    key={question.id}
                                                    className="flex flex-wrap items-start justify-between gap-3 py-3"
                                                    data-testid={`job-post-question-${question.id}`}
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-[var(--navy)]">
                                                            {
                                                                question.questionText
                                                            }
                                                        </p>
                                                        <p className="text-xs text-[var(--slate)]">
                                                            {
                                                                ANSWER_TYPE_LABELS[
                                                                    question
                                                                        .answerType
                                                                ]
                                                            }{' '}
                                                            ·{' '}
                                                            {question.isRequired
                                                                ? 'Required'
                                                                : 'Optional'}
                                                            {question.expectedAnswer !==
                                                                null &&
                                                                ` · expected “${question.expectedAnswer}”`}
                                                            {question.answerType ===
                                                                'selection' &&
                                                                ` · Choices: ${question.options?.join(', ') ?? ''}`}
                                                        </p>
                                                    </div>
                                                    <StatusPill
                                                        tone={
                                                            question.answerCount >
                                                            0
                                                                ? 'teal'
                                                                : 'neutral'
                                                        }
                                                        size="sm"
                                                    >
                                                        {question.answerCount ===
                                                        0
                                                            ? 'No answers yet'
                                                            : `${question.answerCount} ${question.answerCount === 1 ? 'answer' : 'answers'}`}
                                                    </StatusPill>
                                                </li>
                                            ))}
                                        </ul>
                                        <p className="mt-3 text-xs text-[var(--slate)]">
                                            A question that already has answers
                                            is archived and replaced, never
                                            edited in place (§8.4).
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <div className="grid gap-5 lg:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold text-[var(--navy)]">
                                        Other requirements
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--navy)]">
                                        {record.otherRequirements ??
                                            'None recorded.'}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold text-[var(--navy)]">
                                        Application instructions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--navy)]">
                                        {record.applicationInstructions ??
                                            'None recorded.'}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {tab === 'applications' && (
                    <div role="tabpanel" aria-label="Applications">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base font-semibold text-[var(--navy)]">
                                    <span>
                                        Applications ({applications.length})
                                    </span>
                                    <Link
                                        href={system.applications()}
                                        className="text-sm font-medium text-[var(--teal-ink)] underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
                                    >
                                        Open in Applications
                                    </Link>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {applications.length === 0 ? (
                                    <DashboardEmptyState
                                        icon={Users}
                                        title="No applications yet"
                                        message="Applications to this job post will be listed here."
                                    />
                                ) : (
                                    <ul className="divide-y divide-[var(--line)]">
                                        {applications.map((application) => {
                                            const applicant =
                                                state.accounts.find(
                                                    (account) =>
                                                        account.id ===
                                                        application.applicantUserId,
                                                );

                                            return (
                                                <li
                                                    key={application.id}
                                                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                                                    data-testid={`job-post-application-${application.id}`}
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-[var(--navy)]">
                                                            {applicant?.name ??
                                                                `Applicant #${application.applicantUserId}`}
                                                        </p>
                                                        <p className="text-xs text-[var(--slate)]">
                                                            {applicant?.email ??
                                                                'No account on file'}{' '}
                                                            · submitted{' '}
                                                            {formatDate(
                                                                application.submittedAt,
                                                            )}
                                                            {application.availability !==
                                                                null &&
                                                                ` · ${AVAILABILITY_LABELS[application.availability]}`}
                                                            {application.expectedMonthlySalary !==
                                                                null &&
                                                                ` · expects ${record.salaryCurrency ?? ''} ${numberFormat.format(application.expectedMonthlySalary)}`}
                                                        </p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        {application.applicantArchivedAt !==
                                                            null && (
                                                            <StatusPill
                                                                tone="neutral"
                                                                size="sm"
                                                            >
                                                                Applicant
                                                                archived
                                                            </StatusPill>
                                                        )}
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

                {tab === 'agency' && (
                    <div role="tabpanel" aria-label="Agency">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base font-semibold text-[var(--navy)]">
                                    <span className="flex items-center gap-2">
                                        <Building2
                                            className="size-4 text-[var(--slate)]"
                                            aria-hidden="true"
                                        />
                                        Agency
                                    </span>
                                    {agency && (
                                        <Link
                                            href={agencyShow({
                                                agency: agency.id,
                                            })}
                                            className="text-sm font-medium text-[var(--teal-ink)] underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
                                        >
                                            Open in Agencies
                                        </Link>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {agency ? (
                                    <dl>
                                        <DetailRow label="Agency name">
                                            <Link
                                                href={agencyShow({
                                                    agency: agency.id,
                                                })}
                                                className="text-[var(--teal-ink)] underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
                                            >
                                                {agency.agencyName}
                                            </Link>
                                        </DetailRow>
                                        <DetailRow label="Pathway">
                                            {pathway !== null && (
                                                <PathwayBadge
                                                    pathway={pathway}
                                                />
                                            )}
                                        </DetailRow>
                                        <DetailRow label="DMW licence">
                                            <span className="tabular-nums">
                                                {agency.dmwLicenseNumber}
                                            </span>
                                        </DetailRow>
                                        <DetailRow label="City">
                                            {agency.headquartersCity}
                                        </DetailRow>
                                        <DetailRow label="Status">
                                            <StatusPill
                                                tone={
                                                    AGENCY_TONE[
                                                        agencyDisplayStatus(
                                                            agency,
                                                        )
                                                    ]
                                                }
                                                dot
                                            >
                                                {
                                                    AGENCY_STATUS_LABELS[
                                                        agencyDisplayStatus(
                                                            agency,
                                                        )
                                                    ]
                                                }
                                            </StatusPill>
                                        </DetailRow>
                                        <DetailRow label="Added">
                                            {formatDate(agency.createdAt)}
                                        </DetailRow>
                                    </dl>
                                ) : (
                                    <p className="text-sm text-[var(--slate)]">
                                        The Agency this job post belongs to is
                                        no longer in the console.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </SystemPage>

            {draft && (
                <EntitySheet
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    title="Edit job post"
                    description="What applicants see, and when this job post stops accepting applications."
                    size="wide"
                    data-testid="sheet-job-post-edit"
                    footer={
                        <SheetSaveActions
                            onCancel={() => setEditOpen(false)}
                            onSave={saveEdit}
                            saveLabel="Save changes"
                            saveDisabled={!draftDirty}
                            data-testid="sheet-save-job-post"
                        />
                    }
                >
                    <TextField
                        id="edit-job-post-title"
                        label="Job title"
                        required
                        value={draft.jobTitle}
                        onChange={(value) => update('jobTitle', value)}
                        error={errors.jobTitle}
                        data-testid="input-edit-job-post-title"
                    />
                    <TextField
                        id="edit-job-post-location"
                        label="Work location"
                        required
                        value={draft.workLocation}
                        onChange={(value) => update('workLocation', value)}
                        error={errors.workLocation}
                        data-testid="input-edit-job-post-location"
                    />

                    <LockedField
                        label="Category"
                        value={postCategoryLabel(state, record)}
                        reason={`Locked here: a job post is filed under the ${pathway === 'seabased' ? 'Sea-based' : 'Land-based'} subcategories of its Agency, so it can only move to another category from Categories.`}
                        data-testid="locked-job-post-category"
                    />

                    <div className="grid gap-5 sm:grid-cols-2">
                        <TextField
                            id="edit-job-post-vacancies"
                            label="Vacant positions"
                            required
                            inputMode="numeric"
                            value={draft.vacantPositions}
                            onChange={(value) =>
                                update('vacantPositions', value)
                            }
                            error={errors.vacantPositions}
                            data-testid="input-edit-job-post-vacancies"
                        />
                        <TextField
                            id="edit-job-post-closing"
                            label="Closing date"
                            type="date"
                            value={draft.closingDate}
                            onChange={(value) => update('closingDate', value)}
                            error={errors.closingDate}
                            hint="Leave empty for a post that never expires."
                            data-testid="input-edit-job-post-closing"
                        />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <TextField
                            id="edit-job-post-salary-min"
                            label="Salary from"
                            inputMode="numeric"
                            value={draft.monthlySalaryMin}
                            onChange={(value) =>
                                update('monthlySalaryMin', value)
                            }
                            error={errors.monthlySalaryMin}
                            hint={
                                record.salaryCurrency === null
                                    ? 'Monthly. Leave empty for no range.'
                                    : `Monthly, in ${record.salaryCurrency}. Leave empty for no range.`
                            }
                        />
                        <TextField
                            id="edit-job-post-salary-max"
                            label="Salary to"
                            inputMode="numeric"
                            value={draft.monthlySalaryMax}
                            onChange={(value) =>
                                update('monthlySalaryMax', value)
                            }
                            error={errors.monthlySalaryMax}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-[var(--navy)]">
                            Urgent
                        </span>
                        <SegmentedControl<'yes' | 'no'>
                            value={draft.isUrgent}
                            onValueChange={(value) => {
                                setDraft((current) =>
                                    current
                                        ? { ...current, isUrgent: value }
                                        : current,
                                );
                            }}
                            options={[
                                { value: 'yes', label: 'Urgent' },
                                { value: 'no', label: 'Standard' },
                            ]}
                            aria-label="Urgent"
                            data-testid="segmented-edit-job-post-urgent"
                        />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <TextField
                            id="edit-job-post-contact-person"
                            label="Contact person"
                            value={draft.contactPersonName}
                            onChange={(value) =>
                                update('contactPersonName', value)
                            }
                        />
                        <TextField
                            id="edit-job-post-contact-phone"
                            label="Contact phone"
                            value={draft.contactPhone}
                            onChange={(value) => update('contactPhone', value)}
                        />
                    </div>
                    <TextField
                        id="edit-job-post-contact-email"
                        label="Contact email"
                        type="email"
                        value={draft.contactEmail}
                        onChange={(value) => update('contactEmail', value)}
                        error={errors.contactEmail}
                    />
                    <TextAreaField
                        id="edit-job-post-description"
                        label="Job description"
                        required
                        value={draft.jobDescription}
                        onChange={(value) => update('jobDescription', value)}
                        error={errors.jobDescription}
                        maxLength={20_000}
                        hint="Plain text."
                        data-testid="input-edit-job-post-description"
                    />
                    <TextAreaField
                        id="edit-job-post-other"
                        label="Other requirements"
                        value={draft.otherRequirements}
                        onChange={(value) => update('otherRequirements', value)}
                        error={errors.otherRequirements}
                        maxLength={20_000}
                        hint="Plain text. Shown as additional qualifications."
                    />
                    <TextAreaField
                        id="edit-job-post-instructions"
                        label="Application instructions"
                        value={draft.applicationInstructions}
                        onChange={(value) =>
                            update('applicationInstructions', value)
                        }
                        error={errors.applicationInstructions}
                        maxLength={20_000}
                        hint="Plain text."
                    />
                </EntitySheet>
            )}

            {pending && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setPending(null);
                            setNewClosingDate('');
                            setReopenError(null);
                        }
                    }}
                    title={copy.title}
                    description={copy.description}
                    consequences={copy.consequences}
                    confirmLabel={copy.confirmLabel}
                    destructive={copy.destructive}
                    data-testid={copy.testId}
                    onConfirm={confirmPending}
                >
                    {pending === 'reopen' && needsNewDateToReopen && (
                        <div className="flex flex-col gap-2">
                            <TextField
                                id="reopen-closing-date"
                                label="New closing date"
                                required
                                type="date"
                                value={newClosingDate}
                                onChange={(value) => {
                                    setNewClosingDate(value);
                                    setReopenError(null);
                                }}
                                error={reopenError}
                                hint="A past date would show the post as Expired straight away."
                                data-testid="input-reopen-closing-date"
                            />
                        </div>
                    )}
                </ConfirmDialog>
            )}
        </>
    );
}

SystemJobPostShow.layout = {
    breadcrumbs: [
        { title: 'Job posts', href: system.jobPosts() },
        { title: 'Job post details', href: '#' },
    ],
};
