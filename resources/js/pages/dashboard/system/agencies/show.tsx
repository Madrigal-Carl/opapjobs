import { Head, router, setLayoutProps } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    BriefcaseBusiness,
    Building2,
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
import { SeatMeter } from '@/components/system/seat-meter';
import { SuperAdminChip } from '@/components/system/super-admin-chip';
import { SystemRowMenu } from '@/components/system/system-row-menu';
import { SystemTabs } from '@/components/system/system-tabs';
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
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
    AGENCY_STATUS_LABELS,
    type AgencyDisplayStatus,
    agencyAdmin,
    agencyDisplayStatus,
    agencyJobPosts,
    agencyRating,
    agencySeatsUsed,
    DISPLAY_STATUS_LABELS,
    isDuplicateLicense,
    isDuplicateSlug,
    jobPostDisplayStatus,
} from '@/data/system/selectors';
import {
    commitSystemChange,
    popAuditEntry,
    type SystemState,
    updateSystemState,
    useSystemState,
} from '@/data/system/store';
import type { AgencyRecord, JobPostRecord } from '@/data/system/types';
import type { JobPostDisplayStatus } from '@/types/job-post';
import * as system from '@/routes/dashboard/system';
import type { Pathway } from '@/types/agency';

/**
 * One Agency, in full (§4.4).
 *
 * The record view a superadmin opens from the list: what the Agency is, who
 * runs it, and what it has posted. The sections exist because these questions
 * have different answers and different editors — swapping the admin is a
 * different act from amending the licence, so each gets its own surface.
 *
 * A refresh loses the in-memory store, so an id that no longer resolves gets
 * a real "not found" rather than an empty page.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS_TONE: Record<AgencyDisplayStatus, StatusPillTone> = {
    active: 'success',
    suspended: 'warning',
    archived: 'neutral',
};

/** Display status is what the operator reads, so tones are keyed off it. */
const POST_TONE: Record<JobPostDisplayStatus, StatusPillTone> = {
    active: 'success',
    expired: 'warning',
    closed: 'neutral',
    archived: 'neutral',
};

const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'staff', label: 'Staff' },
    { id: 'posts', label: 'Job posts' },
    { id: 'reviews', label: 'Reviews' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** The confirm dialog renders from whichever verb is in flight. */
type PendingAction =
    | 'suspend'
    | 'reactivate'
    | 'archive'
    | 'restore'
    | 'replace-admin';

type AgencyShowProps = {
    agencyId: string;
};

type EditDraft = {
    agencyName: string;
    slug: string;
    pathway: Pathway;
    dmwLicenseNumber: string;
    headquartersCity: string;
    yearEstablished: string;
    agencySize: string;
    about: string;
    publicEmail: string;
    publicPhone: string;
    publicAddress: string;
    websiteUrl: string;
    facebookUrl: string;
    instagramUrl: string;
    xUrl: string;
    agencyUserLimit: string;
};

type EditErrors = Partial<Record<keyof EditDraft, string>>;

function kebab(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function looksLikeUrl(value: string): boolean {
    const trimmed = value.trim();

    return trimmed !== '' && !/\s/.test(trimmed) && trimmed.includes('.');
}

function withScheme(value: string): string {
    const trimmed = value.trim();

    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function toDraft(agency: AgencyRecord): EditDraft {
    return {
        agencyName: agency.agencyName,
        slug: agency.slug,
        pathway: agency.pathway,
        dmwLicenseNumber: agency.dmwLicenseNumber,
        headquartersCity: agency.headquartersCity,
        yearEstablished:
            agency.yearEstablished === null
                ? ''
                : String(agency.yearEstablished),
        agencySize: agency.agencySize ?? '',
        about: agency.about ?? '',
        publicEmail: agency.publicEmail ?? '',
        publicPhone: agency.publicPhone ?? '',
        publicAddress: agency.publicAddress ?? '',
        websiteUrl: agency.websiteUrl ?? '',
        facebookUrl: agency.facebookUrl ?? '',
        instagramUrl: agency.instagramUrl ?? '',
        xUrl: agency.xUrl ?? '',
        agencyUserLimit: String(agency.agencyUserLimit),
    };
}

function validateDraft(
    draft: EditDraft,
    agency: AgencyRecord,
    state: SystemState,
): EditErrors {
    const errors: EditErrors = {};

    if (draft.agencyName.trim() === '') {
        errors.agencyName = 'Enter the Agency name.';
    }

    if (draft.slug.trim() === '') {
        errors.slug = 'Enter a slug.';
    } else if (isDuplicateSlug(state, draft.slug.trim(), agency.id)) {
        errors.slug = `The slug “${draft.slug.trim()}” is already used by another Agency.`;
    }

    if (draft.dmwLicenseNumber.trim() === '') {
        errors.dmwLicenseNumber = 'Enter the DMW licence number.';
    } else if (
        isDuplicateLicense(state, draft.dmwLicenseNumber.trim(), agency.id)
    ) {
        errors.dmwLicenseNumber = 'Another Agency already holds this licence.';
    }

    if (draft.headquartersCity.trim() === '') {
        errors.headquartersCity = 'Enter the city the Agency is based in.';
    }

    if (
        draft.yearEstablished.trim() !== '' &&
        !/^\d{4}$/.test(draft.yearEstablished.trim())
    ) {
        errors.yearEstablished = 'Enter a four-digit year, e.g. 2009.';
    }

    if (
        draft.publicEmail.trim() !== '' &&
        !EMAIL_PATTERN.test(draft.publicEmail.trim())
    ) {
        errors.publicEmail = 'Enter a valid email address, or leave it empty.';
    }

    for (const [key, label] of [
        ['websiteUrl', 'Website'],
        ['facebookUrl', 'Facebook'],
        ['instagramUrl', 'Instagram'],
        ['xUrl', 'X'],
    ] as const) {
        if (draft[key] !== '' && !looksLikeUrl(draft[key])) {
            errors[key] = `Enter a full ${label} address, or leave it empty.`;
        }
    }

    if (draft.about.length > 20_000) {
        errors.about = 'Keep the description under 20,000 characters.';
    }

    const limit = Number(draft.agencyUserLimit);

    if (
        draft.agencyUserLimit.trim() === '' ||
        !Number.isInteger(limit) ||
        limit < 1
    ) {
        errors.agencyUserLimit = 'Enter a whole number of seats, at least 1.';
    }

    return errors;
}

/** Pairs the editable fields with their labels for the audit diff. */
const EDIT_FIELDS: { key: keyof EditDraft; label: string }[] = [
    { key: 'agencyName', label: 'Agency name' },
    { key: 'slug', label: 'Slug' },
    { key: 'pathway', label: 'Pathway' },
    { key: 'dmwLicenseNumber', label: 'DMW licence' },
    { key: 'headquartersCity', label: 'City' },
    { key: 'yearEstablished', label: 'Year established' },
    { key: 'agencySize', label: 'Size' },
    { key: 'about', label: 'About' },
    { key: 'publicEmail', label: 'Public email' },
    { key: 'publicPhone', label: 'Public phone' },
    { key: 'publicAddress', label: 'Public address' },
    { key: 'websiteUrl', label: 'Website' },
    { key: 'facebookUrl', label: 'Facebook' },
    { key: 'instagramUrl', label: 'Instagram' },
    { key: 'xUrl', label: 'X' },
    { key: 'agencyUserLimit', label: 'Staff seats' },
];

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
            ariaLabel="Agency sections"
            testIdPrefix="agency"
            data-testid="agency-tabs"
        />
    );
}

export default function SystemAgencyShow({ agencyId }: AgencyShowProps) {
    const state = useSystemState();
    const [tab, setTab] = useState<TabId>('overview');
    const [editOpen, setEditOpen] = useState(false);
    const [draft, setDraft] = useState<EditDraft | null>(null);
    const [errors, setErrors] = useState<EditErrors>({});
    const [pending, setPending] = useState<PendingAction | null>(null);
    const [replacementId, setReplacementId] = useState('');

    const record = state.agencies.find(
        (entry) => String(entry.id) === String(agencyId),
    );

    const posts = useMemo(
        () => (record ? agencyJobPosts(state, record.id) : []),
        [state, record],
    );

    const admin = record ? agencyAdmin(state, record.id) : undefined;
    const seatsUsed = record ? agencySeatsUsed(state, record.id) : 0;
    const rating = record ? agencyRating(state, record.id) : null;

    const staff = useMemo(
        () =>
            record
                ? state.accounts.filter(
                      (account) =>
                          account.agencyId === record.id &&
                          account.role === 'agency' &&
                          account.deletedAt === null,
                  )
                : [],
        [state, record],
    );

    const postIds = useMemo(
        () => new Set(posts.map((post) => post.id)),
        [posts],
    );

    const applicantCount = useMemo(
        () =>
            state.applications.filter((application) =>
                postIds.has(application.jobPostId),
            ).length,
        [state, postIds],
    );

    const reviews = useMemo(
        () =>
            record
                ? state.reviews.filter(
                      (review) =>
                          review.agencyId === record.id &&
                          review.deletedAt === null,
                  )
                : [],
        [state, record],
    );

    const adminCandidates = useMemo(
        () =>
            record
                ? state.accounts.filter(
                      (account) =>
                          account.agencyId === record.id &&
                          account.role === 'agency' &&
                          account.deletedAt === null &&
                          account.suspendedAt === null,
                  )
                : [],
        [state, record],
    );

    /**
     * The name only exists client-side, so the trail is set here rather than
     * on the static `layout`, which cannot know it. Runs before the not-found
     * branch so a stale link still reports where it came from.
     */
    setLayoutProps({
        breadcrumbs: [
            { title: 'Agencies', href: system.agencies() },
            {
                title: record?.agencyName ?? 'Agency not found',
                href: '#',
            },
        ],
    });

    if (!record) {
        return (
            <>
                <Head title="Agency" />
                <SystemPage>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="font-serif text-[32px] leading-tight font-bold tracking-[-0.02em] text-[var(--navy-deep)]">
                            Agency not found
                        </h1>
                        <SuperAdminChip />
                    </div>
                    <DashboardEmptyState
                        icon={Building2}
                        title="That Agency is no longer in the console"
                        message="Demo data resets whenever the page reloads, so a link opened later will not resolve."
                        onReset={() => router.get(system.agencies().url)}
                    />
                </SystemPage>
            </>
        );
    }

    const displayStatus = agencyDisplayStatus(record);
    const pathwayLocked = posts.length > 0;

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

    function saveEdit() {
        if (!draft || !record) {
            return;
        }

        const found = validateDraft(draft, record, state);

        if (Object.keys(found).length > 0) {
            setErrors(found);
            return;
        }

        const original = toDraft(record);

        /**
         * The draft holds form strings; Undo has to hand back the record's
         * own values or numeric fields would be restored as text.
         */
        const undo: Partial<AgencyRecord> = {
            agencyName: record.agencyName,
            slug: record.slug,
            pathway: record.pathway,
            dmwLicenseNumber: record.dmwLicenseNumber,
            headquartersCity: record.headquartersCity,
            yearEstablished: record.yearEstablished,
            agencySize: record.agencySize,
            about: record.about,
            publicEmail: record.publicEmail,
            publicPhone: record.publicPhone,
            publicAddress: record.publicAddress,
            websiteUrl: record.websiteUrl,
            facebookUrl: record.facebookUrl,
            instagramUrl: record.instagramUrl,
            xUrl: record.xUrl,
            agencyUserLimit: record.agencyUserLimit,
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

        const patch: Partial<AgencyRecord> = {
            agencyName: draft.agencyName.trim(),
            slug: draft.slug.trim(),
            pathway: draft.pathway,
            dmwLicenseNumber: draft.dmwLicenseNumber.trim(),
            headquartersCity: draft.headquartersCity.trim(),
            yearEstablished:
                draft.yearEstablished.trim() === ''
                    ? null
                    : Number(draft.yearEstablished.trim()),
            agencySize: draft.agencySize.trim() || null,
            about: draft.about.trim() || null,
            publicEmail: draft.publicEmail.trim() || null,
            publicPhone: draft.publicPhone.trim() || null,
            publicAddress: draft.publicAddress.trim() || null,
            websiteUrl:
                draft.websiteUrl.trim() === ''
                    ? null
                    : withScheme(draft.websiteUrl),
            facebookUrl:
                draft.facebookUrl.trim() === ''
                    ? null
                    : withScheme(draft.facebookUrl),
            instagramUrl:
                draft.instagramUrl.trim() === ''
                    ? null
                    : withScheme(draft.instagramUrl),
            xUrl: draft.xUrl.trim() === '' ? null : withScheme(draft.xUrl),
            agencyUserLimit: Number(draft.agencyUserLimit.trim()),
        };

        commitSystemChange({
            action: 'update',
            subjectType: 'agency',
            subjectId: record.id,
            subjectLabel: record.agencyName,
            changes,
            apply: (current) => ({
                ...current,
                agencies: current.agencies.map((entry) =>
                    entry.id === record.id ? { ...entry, ...patch } : entry,
                ),
            }),
        });

        toast.success(`Changes to “${record.agencyName}” saved.`, {
            duration: 6000,
            action: {
                label: 'Undo',
                onClick: () => {
                    updateSystemState((current) => ({
                        ...current,
                        agencies: current.agencies.map((entry) =>
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

        const stamp = new Date().toISOString();

        if (pending === 'replace-admin') {
            const next = state.accounts.find(
                (account) => String(account.id) === replacementId,
            );

            if (!next || !admin) {
                setPending(null);
                return;
            }

            const previous = admin;

            commitSystemChange({
                action: 'replace-admin',
                subjectType: 'agency',
                subjectId: record.id,
                subjectLabel: record.agencyName,
                changes: [
                    { field: 'Admin', from: previous.email, to: next.email },
                ],
                apply: (current) => ({
                    ...current,
                    accounts: current.accounts.map((account) => {
                        if (account.id === previous.id) {
                            return { ...account, role: 'agency' as const };
                        }

                        if (account.id === next.id) {
                            return { ...account, role: 'admin' as const };
                        }

                        return account;
                    }),
                    agencies: current.agencies.map((entry) =>
                        entry.id === record.id
                            ? { ...entry, adminUserId: next.id }
                            : entry,
                    ),
                }),
            });

            toast.success(
                `“${next.name}” is now the admin of “${record.agencyName}”.`,
                {
                    duration: 6000,
                    action: {
                        label: 'Undo',
                        onClick: () => {
                            updateSystemState((current) => ({
                                ...current,
                                accounts: current.accounts.map((account) => {
                                    if (account.id === previous.id) {
                                        return {
                                            ...account,
                                            role: 'admin' as const,
                                        };
                                    }

                                    if (account.id === next.id) {
                                        return {
                                            ...account,
                                            role: 'agency' as const,
                                        };
                                    }

                                    return account;
                                }),
                                agencies: current.agencies.map((entry) =>
                                    entry.id === record.id
                                        ? {
                                              ...entry,
                                              adminUserId: previous.id,
                                          }
                                        : entry,
                                ),
                            }));
                            popAuditEntry();
                        },
                    },
                },
            );
            setPending(null);
            setReplacementId('');
            return;
        }

        mutateStatus(pending, stamp);
        setPending(null);
    }

    function mutateStatus(
        verb: 'suspend' | 'reactivate' | 'archive' | 'restore',
        stamp: string,
    ) {
        if (!record) {
            return;
        }

        let patch: Partial<AgencyRecord>;
        let original: Partial<AgencyRecord>;
        let field: string;
        let from: boolean;
        let to: boolean;
        let pastTense: string;

        if (verb === 'suspend') {
            patch = { suspendedAt: stamp };
            original = { suspendedAt: record.suspendedAt };
            field = 'Suspended';
            from = false;
            to = true;
            pastTense = 'suspended';
        } else if (verb === 'reactivate') {
            patch = { suspendedAt: null };
            original = { suspendedAt: record.suspendedAt };
            field = 'Suspended';
            from = true;
            to = false;
            pastTense = 'reactivated';
        } else if (verb === 'archive') {
            patch = { deletedAt: stamp };
            original = { deletedAt: record.deletedAt };
            field = 'Archived';
            from = false;
            to = true;
            pastTense = 'archived';
        } else {
            patch = { deletedAt: null };
            original = { deletedAt: record.deletedAt };
            field = 'Archived';
            from = true;
            to = false;
            pastTense = 'restored';
        }

        commitSystemChange({
            action: verb,
            subjectType: 'agency',
            subjectId: record.id,
            subjectLabel: record.agencyName,
            changes: [{ field, from, to }],
            apply: (current) => ({
                ...current,
                agencies: current.agencies.map((entry) =>
                    entry.id === record.id ? { ...entry, ...patch } : entry,
                ),
            }),
        });

        toast.success(`“${record.agencyName}” ${pastTense}.`, {
            duration: 6000,
            action: {
                label: 'Undo',
                onClick: () => {
                    updateSystemState((current) => ({
                        ...current,
                        agencies: current.agencies.map((entry) =>
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
                description: 'This Agency is no longer open in the console.',
                consequences: [],
                confirmLabel: 'Confirm',
                destructive: false,
                testId: 'confirm-agency',
            };
        }

        if (pending === 'replace-admin') {
            return {
                title: 'Replace this Agency’s admin?',
                description: `${admin?.name ?? 'The current admin'} moves onto a staff seat.`,
                consequences: [
                    'An Agency has exactly one admin, so the two accounts swap roles.',
                    `${admin?.name ?? 'The current admin'} keeps their account and stays on this Agency's team.`,
                    `Staff seats stay at ${seatsUsed} of ${record.agencyUserLimit} — one seat is handed over, not added, because the admin seat is not counted.`,
                ],
                confirmLabel: 'Replace admin',
                destructive: false,
                testId: 'confirm-agency-replace-admin',
            };
        }

        if (pending === 'suspend') {
            return {
                title: 'Suspend this Agency?',
                description: `“${record.agencyName}” stays in the list, but its staff cannot sign in.`,
                consequences: [
                    `${seatsUsed} of ${record.agencyUserLimit} staff seats stay held while it is suspended.`,
                    `${posts.length} job posts keep the status they already have.`,
                    'You can reactivate it at any time.',
                ],
                confirmLabel: 'Suspend',
                destructive: true,
                testId: 'confirm-agency-suspend',
            };
        }

        if (pending === 'reactivate') {
            return {
                title: 'Reactivate this Agency?',
                description: `“${record.agencyName}” and its staff regain access.`,
                consequences: [
                    `${seatsUsed} of ${record.agencyUserLimit} staff seats will be in use.`,
                    `${posts.length} job posts keep the status they already have, so no post changes on its own.`,
                ],
                confirmLabel: 'Reactivate',
                destructive: false,
                testId: 'confirm-agency-reactivate',
            };
        }

        if (pending === 'archive') {
            return {
                title: 'Archive this Agency?',
                description: `“${record.agencyName}” disappears from every list straight away.`,
                consequences: [
                    `${posts.length} job posts stay attached and keep the status they already have.`,
                    `${seatsUsed} staff accounts keep their seats while it is archived.`,
                    'Restore it at any time.',
                ],
                confirmLabel: 'Archive',
                destructive: true,
                testId: 'confirm-agency-archive',
            };
        }

        return {
            title: 'Restore this Agency?',
            description: `“${record.agencyName}” returns to every list and picker.`,
            consequences: [
                `It will show ${seatsUsed} of ${record.agencyUserLimit} staff seats in use.`,
                `${posts.length} job posts need no change of their own.`,
            ],
            confirmLabel: 'Restore',
            destructive: false,
            testId: 'confirm-agency-restore',
        };
    }

    const socials = [
        { label: 'Website', value: record.websiteUrl },
        { label: 'Facebook', value: record.facebookUrl },
        { label: 'Instagram', value: record.instagramUrl },
        { label: 'X', value: record.xUrl },
    ].filter((entry) => entry.value !== null);

    const copy = pendingCopy();

    /** Nothing to save until a field actually differs from the record. */
    const draftDirty =
        draft !== null &&
        EDIT_FIELDS.some(
            (field) => draft[field.key] !== toDraft(record)[field.key],
        );

    return (
        <>
            <Head title={record.agencyName} />

            <SystemPage>
                <div className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm md:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="font-serif text-[32px] leading-tight font-bold tracking-[-0.02em] text-[var(--navy-deep)]">
                                    {record.agencyName}
                                </h1>
                                <PathwayBadge pathway={record.pathway} />
                                <StatusPill
                                    tone={STATUS_TONE[displayStatus]}
                                    dot
                                    data-testid="status-agency"
                                >
                                    {AGENCY_STATUS_LABELS[displayStatus]}
                                </StatusPill>
                            </div>
                            <p className="mt-1 text-sm text-[var(--slate)]">
                                /{record.slug} · {record.headquartersCity} ·
                                Licence {record.dmwLicenseNumber}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <SuperAdminChip />
                            <Button
                                type="button"
                                variant="secondary"
                                className="h-10 rounded-lg px-5 text-sm font-semibold"
                                onClick={openEdit}
                                data-testid="button-agency-edit"
                            >
                                <Pencil className="size-4" aria-hidden="true" />
                                Edit agency
                            </Button>
                            <SystemRowMenu
                                actions={
                                    displayStatus === 'archived'
                                        ? [
                                              {
                                                  label: 'Restore agency',
                                                  icon: ArchiveRestore,
                                                  testId: 'menu-restore-agency',
                                                  onSelect: () =>
                                                      setPending('restore'),
                                              },
                                          ]
                                        : [
                                              ...(record.suspendedAt === null
                                                  ? [
                                                        {
                                                            label: 'Suspend agency',
                                                            icon: Pause,
                                                            testId: 'menu-suspend-agency',
                                                            onSelect: () =>
                                                                setPending(
                                                                    'suspend',
                                                                ),
                                                        },
                                                    ]
                                                  : [
                                                        {
                                                            label: 'Reactivate agency',
                                                            icon: Play,
                                                            testId: 'menu-reactivate-agency',
                                                            onSelect: () =>
                                                                setPending(
                                                                    'reactivate',
                                                                ),
                                                        },
                                                    ]),
                                              {
                                                  label: 'Archive agency',
                                                  icon: Archive,
                                                  testId: 'menu-archive-agency',
                                                  onSelect: () =>
                                                      setPending('archive'),
                                              },
                                          ]
                                }
                            />
                        </div>
                    </div>
                </div>

                <KpiGrid>
                    <KpiCard
                        label="Staff seats"
                        value={`${seatsUsed} / ${record.agencyUserLimit}`}
                        caption={
                            admin
                                ? `Admin seat not counted — ${admin.name}`
                                : 'No admin yet'
                        }
                        icon={Users}
                        tone="teal"
                        data-testid="kpi-agency-seats"
                    />
                    <KpiCard
                        label="Job posts"
                        value={posts.length}
                        caption="Attached to this Agency"
                        icon={BriefcaseBusiness}
                        tone="blue"
                        data-testid="kpi-agency-posts"
                    />
                    <KpiCard
                        label="Applicants"
                        value={applicantCount}
                        caption="Across its job posts"
                        icon={Building2}
                        tone="violet"
                        data-testid="kpi-agency-applicants"
                    />
                    <KpiCard
                        label="Reviews"
                        value={reviews.length}
                        caption={
                            rating === null
                                ? 'No reviews yet'
                                : `${rating.toFixed(1)} out of 5`
                        }
                        icon={MessageSquareText}
                        tone="amber"
                        data-testid="kpi-agency-reviews"
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
                                    <Building2
                                        className="size-4 text-[var(--slate)]"
                                        aria-hidden="true"
                                    />
                                    Identity
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl>
                                    <DetailRow label="Slug">
                                        <span className="font-mono text-xs">
                                            /{record.slug}
                                        </span>
                                    </DetailRow>
                                    <DetailRow label="Pathway">
                                        <PathwayBadge
                                            pathway={record.pathway}
                                        />
                                    </DetailRow>
                                    <DetailRow label="DMW licence">
                                        <span className="tabular-nums">
                                            {record.dmwLicenseNumber}
                                        </span>
                                    </DetailRow>
                                    <DetailRow label="City">
                                        {record.headquartersCity}
                                    </DetailRow>
                                    <DetailRow label="Year established">
                                        {record.yearEstablished ?? '—'}
                                    </DetailRow>
                                    <DetailRow label="Size">
                                        {record.agencySize ?? '—'}
                                    </DetailRow>
                                    <DetailRow label="Added">
                                        {formatDate(record.createdAt)}
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
                                    <DetailRow label="Email">
                                        {record.publicEmail ?? '—'}
                                    </DetailRow>
                                    <DetailRow label="Phone">
                                        {record.publicPhone ?? '—'}
                                    </DetailRow>
                                    <DetailRow label="Address">
                                        {record.publicAddress ?? '—'}
                                    </DetailRow>
                                    {socials.map((entry) => (
                                        <DetailRow
                                            key={entry.label}
                                            label={entry.label}
                                        >
                                            <a
                                                href={entry.value ?? undefined}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[var(--teal-ink)] underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
                                            >
                                                {entry.value}
                                            </a>
                                        </DetailRow>
                                    ))}
                                    <DetailRow label="Verified">
                                        {record.verifiedAt === null
                                            ? 'Not verified yet'
                                            : 'Licence confirmed'}
                                    </DetailRow>
                                </dl>
                                {record.about && (
                                    <p className="mt-4 border-t border-[var(--line)] pt-4 text-sm leading-relaxed whitespace-pre-line text-[var(--slate)]">
                                        {record.about}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {tab === 'staff' && (
                    <div
                        role="tabpanel"
                        aria-label="Staff"
                        className="flex flex-col gap-5"
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base font-semibold text-[var(--navy)]">
                                    <span>Admin</span>
                                    {admin && adminCandidates.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() =>
                                                setPending('replace-admin')
                                            }
                                            data-testid="button-replace-admin"
                                        >
                                            Replace admin
                                        </Button>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {admin ? (
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-[var(--navy)]">
                                                {admin.name}
                                            </p>
                                            <p className="truncate text-xs text-[var(--slate)]">
                                                {admin.email}
                                            </p>
                                        </div>
                                        <SeatMeter
                                            used={seatsUsed}
                                            limit={record.agencyUserLimit}
                                            className="w-full sm:w-56"
                                            data-testid="seat-meter-agency"
                                        />
                                    </div>
                                ) : (
                                    <p className="text-sm text-[var(--slate)]">
                                        This Agency has no admin yet. Add one
                                        from Accounts and it will be picked up
                                        here.
                                    </p>
                                )}
                                <p className="mt-3 text-xs text-[var(--slate)]">
                                    The admin seat is not counted towards{' '}
                                    {record.agencyUserLimit}, so{' '}
                                    {record.agencyUserLimit - seatsUsed} of{' '}
                                    {record.agencyUserLimit} staff seats remain
                                    for the team.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base font-semibold text-[var(--navy)]">
                                    Staff accounts
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {staff.length === 0 ? (
                                    <DashboardEmptyState
                                        icon={Users}
                                        title="No staff accounts yet"
                                        message="Staff accounts use the seats shown above and are managed from Accounts."
                                    />
                                ) : (
                                    <ul className="divide-y divide-[var(--line)]">
                                        {staff.map((account) => (
                                            <li
                                                key={account.id}
                                                className="flex flex-wrap items-center justify-between gap-3 py-3"
                                                data-testid={`staff-row-${account.id}`}
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-[var(--navy)]">
                                                        {account.name}
                                                    </p>
                                                    <p className="truncate text-xs text-[var(--slate)]">
                                                        {account.email}
                                                    </p>
                                                </div>
                                                <StatusPill
                                                    tone={
                                                        account.suspendedAt !==
                                                        null
                                                            ? 'warning'
                                                            : 'success'
                                                    }
                                                    dot
                                                >
                                                    {account.suspendedAt !==
                                                    null
                                                        ? 'Suspended'
                                                        : 'Active'}
                                                </StatusPill>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {tab === 'posts' && (
                    <div role="tabpanel" aria-label="Job posts">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base font-semibold text-[var(--navy)]">
                                    Job posts
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {posts.length === 0 ? (
                                    <DashboardEmptyState
                                        icon={BriefcaseBusiness}
                                        title="No job posts yet"
                                        message="Job posts for this Agency will be listed here."
                                    />
                                ) : (
                                    <ul className="divide-y divide-[var(--line)]">
                                        {posts.map((post) => {
                                            const display =
                                                jobPostDisplayStatus(post);

                                            return (
                                                <li
                                                    key={post.id}
                                                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                                                    data-testid={`agency-post-${post.id}`}
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-[var(--navy)]">
                                                            {post.jobTitle}
                                                        </p>
                                                        <p className="text-xs text-[var(--slate)]">
                                                            {postCategoryLabel(
                                                                state,
                                                                post,
                                                            )}
                                                            {' · closes '}
                                                            {post.closingDate ===
                                                            null
                                                                ? 'no closing date'
                                                                : formatDate(
                                                                      post.closingDate,
                                                                  )}
                                                        </p>
                                                    </div>
                                                    <StatusPill
                                                        tone={
                                                            POST_TONE[display]
                                                        }
                                                        dot
                                                    >
                                                        {
                                                            DISPLAY_STATUS_LABELS[
                                                                display
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

                {tab === 'reviews' && (
                    <div role="tabpanel" aria-label="Reviews">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base font-semibold text-[var(--navy)]">
                                    Reviews
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {reviews.length === 0 ? (
                                    <DashboardEmptyState
                                        icon={MessageSquareText}
                                        title="No reviews yet"
                                        message="Reviews from applicants will be listed here."
                                    />
                                ) : (
                                    <ul className="divide-y divide-[var(--line)]">
                                        {reviews.map((review) => (
                                            <li
                                                key={review.id}
                                                className="py-3"
                                                data-testid={`agency-review-${review.id}`}
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <span className="text-sm font-semibold text-[var(--navy)] tabular-nums">
                                                        {review.rating} / 5
                                                    </span>
                                                    <span className="text-xs text-[var(--slate)]">
                                                        {formatDate(
                                                            review.createdAt,
                                                        )}
                                                    </span>
                                                </div>
                                                {review.reviewText && (
                                                    <p className="mt-1 text-sm text-[var(--slate)]">
                                                        {review.reviewText}
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
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
                    title="Edit agency"
                    description="What applicants see, and how many staff seats the Agency holds."
                    data-testid="sheet-agency-edit"
                    footer={
                        <SheetSaveActions
                            onCancel={() => setEditOpen(false)}
                            onSave={saveEdit}
                            saveLabel="Save changes"
                            saveDisabled={!draftDirty}
                            data-testid="sheet-save-agency"
                        />
                    }
                >
                    <TextField
                        id="edit-agency-name"
                        label="Agency name"
                        required
                        value={draft.agencyName}
                        onChange={(value) => update('agencyName', value)}
                        error={errors.agencyName}
                        data-testid="input-edit-agency-name"
                    />
                    <TextField
                        id="edit-agency-slug"
                        label="Slug"
                        required
                        value={draft.slug}
                        onChange={(value) => {
                            setDraft((current) =>
                                current
                                    ? { ...current, slug: kebab(value) }
                                    : current,
                            );
                            setErrors((current) => ({
                                ...current,
                                slug: undefined,
                            }));
                        }}
                        error={errors.slug}
                        data-testid="input-edit-agency-slug"
                    />

                    {pathwayLocked ? (
                        <LockedField
                            label="Pathway"
                            value={<PathwayBadge pathway={record.pathway} />}
                            reason={`Locked while this Agency has ${posts.length} job posts, because each one uses a subcategory of a single pathway. Archive its job posts to change it.`}
                            data-testid="locked-agency-pathway"
                        />
                    ) : (
                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-[var(--navy)]">
                                Pathway
                            </span>
                            <SegmentedControl<Pathway>
                                value={draft.pathway}
                                onValueChange={(value) => {
                                    setDraft((current) =>
                                        current
                                            ? { ...current, pathway: value }
                                            : current,
                                    );
                                }}
                                options={[
                                    {
                                        value: 'landbased',
                                        label: 'Land-based',
                                    },
                                    { value: 'seabased', label: 'Sea-based' },
                                ]}
                                aria-label="Pathway"
                                data-testid="segmented-edit-agency-pathway"
                            />
                            <p className="text-xs text-[var(--slate)]">
                                Pathway locks once the Agency has job posts,
                                because each post is filed under one pathway.
                            </p>
                        </div>
                    )}

                    <TextField
                        id="edit-agency-licence"
                        label="DMW licence number"
                        required
                        value={draft.dmwLicenseNumber}
                        onChange={(value) => update('dmwLicenseNumber', value)}
                        error={errors.dmwLicenseNumber}
                        data-testid="input-edit-agency-licence"
                    />
                    <TextField
                        id="edit-agency-city"
                        label="Headquarters city"
                        required
                        value={draft.headquartersCity}
                        onChange={(value) => update('headquartersCity', value)}
                        error={errors.headquartersCity}
                        data-testid="input-edit-agency-city"
                    />
                    <div className="grid gap-5 sm:grid-cols-2">
                        <TextField
                            id="edit-agency-established"
                            label="Year established"
                            inputMode="numeric"
                            value={draft.yearEstablished}
                            onChange={(value) =>
                                update('yearEstablished', value)
                            }
                            error={errors.yearEstablished}
                        />
                        <TextField
                            id="edit-agency-size"
                            label="Agency size"
                            value={draft.agencySize}
                            onChange={(value) => update('agencySize', value)}
                            hint="Free text."
                        />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <TextField
                            id="edit-agency-email"
                            label="Public email"
                            type="email"
                            value={draft.publicEmail}
                            onChange={(value) => update('publicEmail', value)}
                            error={errors.publicEmail}
                        />
                        <TextField
                            id="edit-agency-phone"
                            label="Public phone"
                            value={draft.publicPhone}
                            onChange={(value) => update('publicPhone', value)}
                        />
                    </div>
                    <TextField
                        id="edit-agency-address"
                        label="Public address"
                        value={draft.publicAddress}
                        onChange={(value) => update('publicAddress', value)}
                    />
                    <div className="grid gap-5 sm:grid-cols-2">
                        <TextField
                            id="edit-agency-website"
                            label="Website"
                            value={draft.websiteUrl}
                            onChange={(value) => update('websiteUrl', value)}
                            error={errors.websiteUrl}
                        />
                        <TextField
                            id="edit-agency-facebook"
                            label="Facebook"
                            value={draft.facebookUrl}
                            onChange={(value) => update('facebookUrl', value)}
                            error={errors.facebookUrl}
                        />
                        <TextField
                            id="edit-agency-instagram"
                            label="Instagram"
                            value={draft.instagramUrl}
                            onChange={(value) => update('instagramUrl', value)}
                            error={errors.instagramUrl}
                        />
                        <TextField
                            id="edit-agency-x"
                            label="X"
                            value={draft.xUrl}
                            onChange={(value) => update('xUrl', value)}
                            error={errors.xUrl}
                        />
                    </div>
                    <TextAreaField
                        id="edit-agency-about"
                        label="About"
                        value={draft.about}
                        onChange={(value) => update('about', value)}
                        error={errors.about}
                        maxLength={20_000}
                        hint="Plain text."
                        data-testid="input-edit-agency-about"
                    />
                    <TextField
                        id="edit-agency-seats"
                        label="Staff seats"
                        required
                        inputMode="numeric"
                        value={draft.agencyUserLimit}
                        onChange={(value) => update('agencyUserLimit', value)}
                        error={errors.agencyUserLimit}
                        hint="The admin does not use a seat."
                        data-testid="input-edit-agency-seats"
                    />
                </EntitySheet>
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
                >
                    {pending === 'replace-admin' && (
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="replace-admin-select">
                                Promote a staff account
                            </Label>
                            <Select
                                value={replacementId}
                                onValueChange={setReplacementId}
                            >
                                <SelectTrigger
                                    id="replace-admin-select"
                                    data-testid="select-replace-admin"
                                >
                                    <SelectValue placeholder="Choose a staff account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {adminCandidates.map((account) => (
                                        <SelectItem
                                            key={account.id}
                                            value={String(account.id)}
                                        >
                                            {account.name} — {account.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </ConfirmDialog>
            )}
        </>
    );
}

SystemAgencyShow.layout = {
    breadcrumbs: [
        { title: 'Agencies', href: system.agencies() },
        { title: 'Agency details', href: '#' },
    ],
};
