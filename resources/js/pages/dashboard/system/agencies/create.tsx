import { Head, router } from '@inertiajs/react';
import { Building2, Contact, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormSection } from '@/components/dashboard/form-section';
import { SystemPage } from '@/components/system/system-page';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Button } from '@/components/ui/button';
import { SuperAdminChip } from '@/components/system/super-admin-chip';
import { TextField, TextAreaField } from '@/components/system/form-text-field';
import { useFormChanges } from '@/hooks/use-form-changes';
import type { Pathway } from '@/types/agency';
import {
    isDuplicateEmail,
    isDuplicateLicense,
    isDuplicateSlug,
} from '@/data/system/selectors';
import { commitSystemChange, useSystemState } from '@/data/system/store';
import type { SystemState } from '@/data/system/store';
import type { AgencyRecord, UserRecord } from '@/data/system/types';
import * as system from '@/routes/dashboard/system';
import {
    create as agencyCreate,
    show as agencyShow,
} from '@/routes/dashboard/system/agencies';

/**
 * Adding an Agency (§4.4).
 *
 * Three short steps rather than one long form: the record has three genuinely
 * different concerns — who the Agency is, how to reach it, and who runs it —
 * and a single scroll hides the last one. Each step validates before it lets
 * the next one open, so a mistake is reported next to the field rather than
 * at the end of a page the user has already filled in.
 *
 * The admin is created with the Agency rather than afterwards, because an
 * Agency with no admin is not a valid state (§2.2) and could never be
 * reached again from this console.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = [
    {
        title: 'Identity',
        description: 'How the Agency is named, licensed and filed.',
        icon: Building2,
    },
    {
        title: 'Contact',
        description: 'How applicants and the Agency reach each other.',
        icon: Contact,
    },
    {
        title: 'Access',
        description: 'Staff seats, and the admin who runs the Agency.',
        icon: Users,
    },
];

type AgencyDraft = {
    agencyName: string;
    slug: string;
    pathway: Pathway;
    dmwLicenseNumber: string;
    headquartersCity: string;
    yearEstablished: string;
    agencySize: string;
    publicEmail: string;
    publicPhone: string;
    publicAddress: string;
    websiteUrl: string;
    facebookUrl: string;
    instagramUrl: string;
    xUrl: string;
    about: string;
    agencyUserLimit: string;
    adminName: string;
    adminEmail: string;
};

const EMPTY_DRAFT: AgencyDraft = {
    agencyName: '',
    slug: '',
    pathway: 'landbased',
    dmwLicenseNumber: '',
    headquartersCity: '',
    yearEstablished: '',
    agencySize: '',
    publicEmail: '',
    publicPhone: '',
    publicAddress: '',
    websiteUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    xUrl: '',
    about: '',
    agencyUserLimit: '5',
    adminName: '',
    adminEmail: '',
};

type DraftErrors = Partial<Record<keyof AgencyDraft, string>>;

function kebab(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/** URLs are optional; when present they are stored with a scheme. */
function looksLikeUrl(value: string): boolean {
    const trimmed = value.trim();

    return trimmed !== '' && !/\s/.test(trimmed) && trimmed.includes('.');
}

function withScheme(value: string): string {
    const trimmed = value.trim();

    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function validate(
    step: number,
    values: AgencyDraft,
    state: SystemState,
): DraftErrors {
    const errors: DraftErrors = {};

    if (step === 1) {
        const name = values.agencyName.trim();
        const slug = values.slug.trim();

        if (name === '') {
            errors.agencyName = 'Enter the Agency name.';
        }

        if (slug === '') {
            errors.slug = 'Enter a slug.';
        } else if (isDuplicateSlug(state, slug)) {
            errors.slug = `The slug “${slug}” is already used by another Agency.`;
        }

        const licence = values.dmwLicenseNumber.trim();

        if (licence === '') {
            errors.dmwLicenseNumber = 'Enter the DMW licence number.';
        } else if (isDuplicateLicense(state, licence)) {
            errors.dmwLicenseNumber = `An Agency already holds the licence ${licence}.`;
        }

        if (values.headquartersCity.trim() === '') {
            errors.headquartersCity = 'Enter the city the Agency is based in.';
        }

        if (
            values.yearEstablished.trim() !== '' &&
            !/^\d{4}$/.test(values.yearEstablished.trim())
        ) {
            errors.yearEstablished = 'Enter a four-digit year, e.g. 2009.';
        }
    }

    if (step === 2) {
        const email = values.publicEmail.trim();

        if (email !== '' && !EMAIL_PATTERN.test(email)) {
            errors.publicEmail =
                'Enter a valid email address, or leave it empty.';
        }

        if (values.facebookUrl !== '' && !looksLikeUrl(values.facebookUrl)) {
            errors.facebookUrl = 'Enter a full web address, or leave it empty.';
        }

        if (values.instagramUrl !== '' && !looksLikeUrl(values.instagramUrl)) {
            errors.instagramUrl =
                'Enter a full web address, or leave it empty.';
        }

        if (values.xUrl !== '' && !looksLikeUrl(values.xUrl)) {
            errors.xUrl = 'Enter a full web address, or leave it empty.';
        }

        if (values.websiteUrl !== '' && !looksLikeUrl(values.websiteUrl)) {
            errors.websiteUrl = 'Enter a full web address, or leave it empty.';
        }

        if (values.about.length > 20_000) {
            errors.about = 'Keep the description under 20,000 characters.';
        }
    }

    if (step === 3) {
        const limit = Number(values.agencyUserLimit);

        if (
            values.agencyUserLimit.trim() === '' ||
            !Number.isInteger(limit) ||
            limit < 1
        ) {
            errors.agencyUserLimit =
                'Enter a whole number of seats, at least 1.';
        }

        if (values.adminName.trim() === '') {
            errors.adminName = 'Enter the name of the Agency’s admin.';
        }

        const adminEmail = values.adminEmail.trim().toLowerCase();

        if (adminEmail === '') {
            errors.adminEmail = 'Enter the admin’s email address.';
        } else if (!EMAIL_PATTERN.test(adminEmail)) {
            errors.adminEmail = 'Enter a valid email address.';
        } else if (isDuplicateEmail(state, adminEmail)) {
            errors.adminEmail = 'An account with this email already exists.';
        }
    }

    return errors;
}

export default function SystemAgencyCreate() {
    const state = useSystemState();
    const form = useFormChanges<AgencyDraft>(EMPTY_DRAFT);

    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState<DraftErrors>({});
    const [reached, setReached] = useState(1);
    const [slugEdited, setSlugEdited] = useState(false);

    function clearError(key: keyof AgencyDraft) {
        setErrors((current) =>
            current[key] === undefined
                ? current
                : { ...current, [key]: undefined },
        );
    }

    function updateName(name: string) {
        clearError('agencyName');
        form.setValue('agencyName', name);

        // The slug follows the name until it is edited by hand, which is what
        // people expect on the first pass and harmless once they take over.
        if (!slugEdited) {
            form.setValue('slug', kebab(name));
        }
    }

    function goTo(next: number) {
        const found = validate(step, form.values, state);
        const stepKeys = errorsForStep(step);

        if (stepKeys.some((key) => found[key] !== undefined)) {
            setErrors(found);
            return;
        }

        setErrors({});
        setReached((current) => Math.max(current, next));
        setStep(next);
    }

    function errorsForStep(which: number): (keyof AgencyDraft)[] {
        if (which === 1) {
            return [
                'agencyName',
                'slug',
                'dmwLicenseNumber',
                'headquartersCity',
                'yearEstablished',
            ];
        }

        if (which === 2) {
            return [
                'publicEmail',
                'facebookUrl',
                'instagramUrl',
                'xUrl',
                'websiteUrl',
                'about',
            ];
        }

        return ['agencyUserLimit', 'adminName', 'adminEmail'];
    }

    function submit() {
        const found = validate(3, form.values, state);
        const stepKeys = errorsForStep(3);

        if (stepKeys.some((key) => found[key] !== undefined)) {
            setErrors(found);
            setStep(3);
            return;
        }

        const values = form.values;
        const agencyId = state.nextId;
        const adminId = state.nextId + 1;
        const now = new Date().toISOString();
        const name = values.agencyName.trim();

        const agency: AgencyRecord = {
            id: agencyId,
            slug: values.slug.trim(),
            agencyName: name,
            pathway: values.pathway,
            dmwLicenseNumber: values.dmwLicenseNumber.trim(),
            agencySize: values.agencySize.trim() || null,
            headquartersCity: values.headquartersCity.trim(),
            about: values.about.trim() || null,
            logoPath: null,
            yearEstablished:
                values.yearEstablished.trim() === ''
                    ? null
                    : Number(values.yearEstablished.trim()),
            publicPhone: values.publicPhone.trim() || null,
            publicEmail: values.publicEmail.trim() || null,
            publicAddress: values.publicAddress.trim() || null,
            facebookUrl:
                values.facebookUrl.trim() === ''
                    ? null
                    : withScheme(values.facebookUrl),
            instagramUrl:
                values.instagramUrl.trim() === ''
                    ? null
                    : withScheme(values.instagramUrl),
            xUrl: values.xUrl.trim() === '' ? null : withScheme(values.xUrl),
            websiteUrl:
                values.websiteUrl.trim() === ''
                    ? null
                    : withScheme(values.websiteUrl),
            verifiedAt: null,
            agencyUserLimit: Number(values.agencyUserLimit.trim()),
            adminUserId: adminId,
            suspendedAt: null,
            createdByUserId: adminId,
            deletedAt: null,
            createdAt: now,
        };

        const admin: UserRecord = {
            id: adminId,
            name: values.adminName.trim(),
            email: values.adminEmail.trim().toLowerCase(),
            emailVerifiedAt: null,
            role: 'admin',
            agencyId,
            createdByUserId: adminId,
            suspendedAt: null,
            lastActiveAt: null,
            deletedAt: null,
            createdAt: now,
        };

        commitSystemChange({
            action: 'create',
            subjectType: 'agency',
            subjectId: agencyId,
            subjectLabel: name,
            changes: [
                { field: 'Agency', from: null, to: name },
                {
                    field: 'DMW licence',
                    from: null,
                    to: agency.dmwLicenseNumber,
                },
                { field: 'Pathway', from: null, to: agency.pathway },
                {
                    field: 'Staff seats',
                    from: null,
                    to: agency.agencyUserLimit,
                },
                { field: 'Admin', from: null, to: admin.email },
            ],
            apply: (current) => ({
                ...current,
                nextId: current.nextId + 2,
                agencies: [...current.agencies, agency],
                accounts: [...current.accounts, admin],
            }),
        });

        toast.success(`“${name}” added, with ${admin.name} as its admin.`);
        router.get(agencyShow({ agency: agencyId }).url);
    }

    const Current = STEPS[step - 1];

    return (
        <>
            <Head title="Add agency" />

            <SystemPage>
                <div className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm md:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="font-serif text-[32px] leading-tight font-bold tracking-[-0.02em] text-[var(--navy-deep)]">
                                Add agency
                            </h1>
                            <p className="mt-1 text-sm text-[var(--slate)]">
                                Three steps: identity, contact, then the admin
                                who runs the Agency.
                            </p>
                        </div>
                        <SuperAdminChip />
                    </div>
                </div>

                {/* Step indicator: completed steps stay clickable so a value
                    entered earlier can be corrected without losing the rest. */}
                <ol
                    className="flex flex-wrap gap-2"
                    data-testid="agency-create-steps"
                >
                    {STEPS.map((entry, index) => {
                        const number = index + 1;
                        const active = number === step;
                        const done = number < step;
                        const available = number <= reached;

                        return (
                            <li key={entry.title}>
                                <button
                                    type="button"
                                    disabled={!available}
                                    aria-current={active ? 'step' : undefined}
                                    onClick={() => available && setStep(number)}
                                    data-testid={`agency-step-${number}`}
                                    className={[
                                        'flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                                        'focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none',
                                        active
                                            ? 'border-[var(--teal)] bg-[var(--teal-light)] text-[var(--teal-ink)]'
                                            : done
                                              ? 'border-[var(--line)] bg-white text-[var(--navy)] hover:border-[var(--teal)]'
                                              : 'border-[var(--line)] bg-white text-[var(--slate)]',
                                        !available &&
                                            'cursor-not-allowed opacity-60',
                                    ].join(' ')}
                                >
                                    <span className="tabular-nums">
                                        {number}
                                    </span>
                                    {entry.title}
                                </button>
                            </li>
                        );
                    })}
                </ol>

                <FormSection
                    step={step}
                    title={Current.title}
                    description={Current.description}
                    icon={Current.icon}
                >
                    {step === 1 && (
                        <div className="grid gap-5 sm:grid-cols-2">
                            <TextField
                                id="agency-name"
                                label="Agency name"
                                required
                                value={form.values.agencyName}
                                onChange={updateName}
                                error={errors.agencyName}
                                data-testid="input-agency-name"
                                className="sm:col-span-2"
                            />
                            <TextField
                                id="agency-slug"
                                label="Slug"
                                required
                                value={form.values.slug}
                                onChange={(value) => {
                                    setSlugEdited(true);
                                    clearError('slug');
                                    form.setValue('slug', kebab(value));
                                }}
                                error={errors.slug}
                                hint="Used in the Agency’s public address."
                                data-testid="input-agency-slug"
                            />
                            <div className="flex flex-col gap-2">
                                <span className="text-sm font-medium text-[var(--navy)]">
                                    Pathway
                                </span>
                                <SegmentedControl<Pathway>
                                    value={form.values.pathway}
                                    onValueChange={(value) =>
                                        form.setValue('pathway', value)
                                    }
                                    options={[
                                        {
                                            value: 'landbased',
                                            label: 'Land-based',
                                        },
                                        {
                                            value: 'seabased',
                                            label: 'Sea-based',
                                        },
                                    ]}
                                    aria-label="Pathway"
                                    data-testid="segmented-agency-pathway"
                                />
                                <p className="text-xs text-[var(--slate)]">
                                    Job posts can only use subcategories of this
                                    pathway, and it cannot be changed later
                                    while the Agency has job posts.
                                </p>
                            </div>
                            <TextField
                                id="agency-licence"
                                label="DMW licence number"
                                required
                                value={form.values.dmwLicenseNumber}
                                onChange={(value) => {
                                    clearError('dmwLicenseNumber');
                                    form.setValue('dmwLicenseNumber', value);
                                }}
                                error={errors.dmwLicenseNumber}
                                data-testid="input-agency-licence"
                            />
                            <TextField
                                id="agency-city"
                                label="Headquarters city"
                                required
                                value={form.values.headquartersCity}
                                onChange={(value) => {
                                    clearError('headquartersCity');
                                    form.setValue('headquartersCity', value);
                                }}
                                error={errors.headquartersCity}
                                data-testid="input-agency-city"
                            />
                            <TextField
                                id="agency-established"
                                label="Year established"
                                inputMode="numeric"
                                value={form.values.yearEstablished}
                                onChange={(value) => {
                                    clearError('yearEstablished');
                                    form.setValue('yearEstablished', value);
                                }}
                                error={errors.yearEstablished}
                                data-testid="input-agency-established"
                            />
                            <TextField
                                id="agency-size"
                                label="Agency size"
                                value={form.values.agencySize}
                                onChange={(value) =>
                                    form.setValue('agencySize', value)
                                }
                                hint="Free text — write it the way the Agency describes itself."
                                data-testid="input-agency-size"
                                className="sm:col-span-2"
                            />
                        </div>
                    )}

                    {step === 2 && (
                        <div className="grid gap-5 sm:grid-cols-2">
                            <TextField
                                id="agency-email"
                                label="Public email"
                                type="email"
                                value={form.values.publicEmail}
                                onChange={(value) => {
                                    clearError('publicEmail');
                                    form.setValue('publicEmail', value);
                                }}
                                error={errors.publicEmail}
                                data-testid="input-agency-email"
                            />
                            <TextField
                                id="agency-phone"
                                label="Public phone"
                                value={form.values.publicPhone}
                                onChange={(value) =>
                                    form.setValue('publicPhone', value)
                                }
                                data-testid="input-agency-phone"
                            />
                            <TextField
                                id="agency-address"
                                label="Public address"
                                value={form.values.publicAddress}
                                onChange={(value) =>
                                    form.setValue('publicAddress', value)
                                }
                                data-testid="input-agency-address"
                                className="sm:col-span-2"
                            />
                            <TextField
                                id="agency-website"
                                label="Website"
                                value={form.values.websiteUrl}
                                onChange={(value) => {
                                    clearError('websiteUrl');
                                    form.setValue('websiteUrl', value);
                                }}
                                error={errors.websiteUrl}
                                data-testid="input-agency-website"
                            />
                            <TextField
                                id="agency-facebook"
                                label="Facebook"
                                value={form.values.facebookUrl}
                                onChange={(value) => {
                                    clearError('facebookUrl');
                                    form.setValue('facebookUrl', value);
                                }}
                                error={errors.facebookUrl}
                                data-testid="input-agency-facebook"
                            />
                            <TextField
                                id="agency-instagram"
                                label="Instagram"
                                value={form.values.instagramUrl}
                                onChange={(value) => {
                                    clearError('instagramUrl');
                                    form.setValue('instagramUrl', value);
                                }}
                                error={errors.instagramUrl}
                                data-testid="input-agency-instagram"
                            />
                            <TextField
                                id="agency-x"
                                label="X"
                                value={form.values.xUrl}
                                onChange={(value) => {
                                    clearError('xUrl');
                                    form.setValue('xUrl', value);
                                }}
                                error={errors.xUrl}
                                data-testid="input-agency-x"
                            />
                            <TextAreaField
                                id="agency-about"
                                label="About"
                                value={form.values.about}
                                onChange={(value) => {
                                    clearError('about');
                                    form.setValue('about', value);
                                }}
                                error={errors.about}
                                maxLength={20_000}
                                hint="Plain text. This is what applicants read before they apply."
                                data-testid="input-agency-about"
                                className="sm:col-span-2"
                            />
                        </div>
                    )}

                    {step === 3 && (
                        <div className="grid gap-5 sm:grid-cols-2">
                            <TextField
                                id="agency-seats"
                                label="Staff seats"
                                required
                                inputMode="numeric"
                                value={form.values.agencyUserLimit}
                                onChange={(value) => {
                                    clearError('agencyUserLimit');
                                    form.setValue('agencyUserLimit', value);
                                }}
                                error={errors.agencyUserLimit}
                                hint="How many staff accounts this Agency may hold. Its admin does not use a seat."
                                data-testid="input-agency-seats"
                            />
                            <div />
                            <TextField
                                id="agency-admin-name"
                                label="Admin name"
                                required
                                value={form.values.adminName}
                                onChange={(value) => {
                                    clearError('adminName');
                                    form.setValue('adminName', value);
                                }}
                                error={errors.adminName}
                                data-testid="input-agency-admin-name"
                            />
                            <TextField
                                id="agency-admin-email"
                                label="Admin email"
                                required
                                type="email"
                                value={form.values.adminEmail}
                                onChange={(value) => {
                                    clearError('adminEmail');
                                    form.setValue('adminEmail', value);
                                }}
                                error={errors.adminEmail}
                                hint="The account is created with the Agency. An Agency has exactly one admin."
                                data-testid="input-agency-admin-email"
                            />
                        </div>
                    )}
                </FormSection>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                            step === 1
                                ? router.get(system.agencies().url)
                                : goTo(step - 1)
                        }
                        data-testid="button-agency-create-back"
                    >
                        {step === 1 ? 'Cancel' : 'Back'}
                    </Button>

                    {step < 3 ? (
                        <Button
                            type="button"
                            variant="primary"
                            onClick={() => goTo(step + 1)}
                            data-testid="button-agency-create-next"
                        >
                            Next
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="primary"
                            onClick={submit}
                            data-testid="button-agency-create-submit"
                        >
                            Add agency
                        </Button>
                    )}
                </div>
            </SystemPage>
        </>
    );
}

SystemAgencyCreate.layout = {
    breadcrumbs: [
        {
            title: 'Agencies',
            href: system.agencies(),
        },
        {
            title: 'Add agency',
            href: agencyCreate(),
        },
    ],
};
