import { Head } from '@inertiajs/react';
import { ExternalLink } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { SystemPage } from '@/components/system/system-page';
import { ChangeBar } from '@/components/system/change-bar';
import { ConfirmDialog } from '@/components/system/confirm-dialog';
import { TextAreaField, TextField } from '@/components/system/form-text-field';
import { LockedField } from '@/components/system/locked-field';
import { SystemPageHeader } from '@/components/system/system-page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import {
    commitSystemChange,
    popAuditEntry,
    updateSystemState,
    useSystemState,
} from '@/data/system/store';
import type { AuditChange, SiteContentState } from '@/data/system/types';
import { useFormChanges } from '@/hooks/use-form-changes';
import { useSystemLoading } from '@/hooks/use-system-loading';
import { home } from '@/routes';
import * as system from '@/routes/dashboard/system';

/**
 * Site content (§4.12).
 *
 * The copy the public site renders: the announcement bar, the homepage
 * blocks (hero, stats, resource cards), the contact desks and the footer.
 * One draft covers the whole record so edits survive moving between the
 * sections, and the ChangeBar states how many individual fields differ
 * from what the store holds — including edits made in another section.
 *
 * Every save goes through `commitSystemChange`, so the audit log records
 * the full field-level diff, and the Undo toast restores the exact typed
 * values via `updateSystemState` and drops the audit row again. The one
 * value that cannot change is a resource card's icon name: it is matched
 * against the icons the homepage knows how to draw, so it gets a
 * `LockedField` with the reason and the way out rather than an input.
 */

/** The four content groups behind the section strip. */
type Area = 'announcement' | 'home' | 'contact' | 'footer';

const AREA_OPTIONS: { value: Area; label: string }[] = [
    { value: 'announcement', label: 'Announcement' },
    { value: 'home', label: 'Homepage' },
    { value: 'contact', label: 'Contact' },
    { value: 'footer', label: 'Footer' },
];

const AREA_LABELS: Record<Area, string> = {
    announcement: 'Announcement',
    contact: 'Contact',
    footer: 'Footer',
    home: 'Homepage',
};

/** Same budget every long-text record in the console gets (§4.1). */
const LONG_TEXT_MAX = 20_000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s()-]*$/;
const FULL_ADDRESS_PATTERN = /^https?:\/\/\S+$/i;

/** Internal site paths ("/contact") or a full web address. */
function isLinkTarget(value: string): boolean {
    const trimmed = value.trim();

    return (
        (trimmed.startsWith('/') && !/\s/.test(trimmed)) ||
        FULL_ADDRESS_PATTERN.test(trimmed)
    );
}

function isFullWebAddress(value: string): boolean {
    return FULL_ADDRESS_PATTERN.test(value.trim());
}

type StatDraft = { label: string; value: string };
type ResourceDraft = {
    id: string;
    icon: string;
    eyebrow: string;
    title: string;
    body: string;
    link: string;
};
type DeskDraft = {
    id: string;
    label: string;
    email: string;
    phone: string;
    blurb: string;
};
type FooterLinkDraft = { id: string; label: string; href: string };

/**
 * The whole record as one flat draft. Arrays keep their item ids (and the
 * locked icon names) so rows stay keyed, and they are only ever replaced
 * by a copy, which keeps `useFormChanges`' reference equality honest.
 */
type ContentDraft = {
    announcementEnabled: boolean;
    announcementText: string;
    announcementLink: string;
    heroHeadline: string;
    heroSubtext: string;
    heroPrimaryCta: string;
    heroSecondaryCta: string;
    stats: StatDraft[];
    resources: ResourceDraft[];
    desks: DeskDraft[];
    footerLinks: FooterLinkDraft[];
    socialFacebook: string;
    socialInstagram: string;
    socialX: string;
    socialWebsite: string;
};

type DraftErrors = Record<string, string | undefined>;

function toDraft(content: SiteContentState): ContentDraft {
    return {
        announcementEnabled: content.announcement.enabled,
        announcementText: content.announcement.text,
        announcementLink: content.announcement.link,
        heroHeadline: content.homeHero.headline,
        heroSubtext: content.homeHero.subtext,
        heroPrimaryCta: content.homeHero.primaryCta,
        heroSecondaryCta: content.homeHero.secondaryCta,
        stats: content.homeStats.map((stat) => ({ ...stat })),
        resources: content.homeResources.map((resource) => ({ ...resource })),
        desks: content.contactDesks.map((desk) => ({ ...desk })),
        footerLinks: content.footerLinks.map((link) => ({ ...link })),
        socialFacebook: content.socialUrls.facebook,
        socialInstagram: content.socialUrls.instagram,
        socialX: content.socialUrls.x,
        socialWebsite: content.socialUrls.website,
    };
}

/** The draft as the typed record, trimmed the way it would be saved. */
function buildContent(draft: ContentDraft): SiteContentState {
    return {
        announcement: {
            enabled: draft.announcementEnabled,
            text: draft.announcementText.trim(),
            link: draft.announcementLink.trim(),
        },
        homeHero: {
            headline: draft.heroHeadline.trim(),
            subtext: draft.heroSubtext.trim(),
            primaryCta: draft.heroPrimaryCta.trim(),
            secondaryCta: draft.heroSecondaryCta.trim(),
        },
        homeStats: draft.stats.map((stat) => ({
            label: stat.label.trim(),
            value: stat.value.trim(),
        })),
        homeResources: draft.resources.map((resource) => ({
            ...resource,
            eyebrow: resource.eyebrow.trim(),
            title: resource.title.trim(),
            body: resource.body.trim(),
            link: resource.link.trim(),
        })),
        contactDesks: draft.desks.map((desk) => ({
            ...desk,
            label: desk.label.trim(),
            email: desk.email.trim(),
            phone: desk.phone.trim(),
            blurb: desk.blurb.trim(),
        })),
        footerLinks: draft.footerLinks.map((link) => ({
            ...link,
            label: link.label.trim(),
            href: link.href.trim(),
        })),
        socialUrls: {
            facebook: draft.socialFacebook.trim(),
            instagram: draft.socialInstagram.trim(),
            x: draft.socialX.trim(),
            website: draft.socialWebsite.trim(),
        },
    };
}

type DraftChange = { area: Area; change: AuditChange };

/**
 * Field-level diff between what the store holds and what the draft would
 * save. Compares the trimmed forms, so trailing whitespace a save would
 * drop never counts as an unsaved change.
 */
function diffContent(
    next: SiteContentState,
    current: SiteContentState,
): DraftChange[] {
    const changes: DraftChange[] = [];

    function record(
        area: Area,
        field: string,
        from: string | boolean,
        to: string | boolean,
    ): void {
        if (from !== to) {
            changes.push({ area, change: { field, from, to } });
        }
    }

    record(
        'announcement',
        'Announcement shown',
        current.announcement.enabled,
        next.announcement.enabled,
    );
    record(
        'announcement',
        'Announcement text',
        current.announcement.text,
        next.announcement.text,
    );
    record(
        'announcement',
        'Announcement link',
        current.announcement.link,
        next.announcement.link,
    );

    record(
        'home',
        'Hero headline',
        current.homeHero.headline,
        next.homeHero.headline,
    );
    record(
        'home',
        'Hero subtext',
        current.homeHero.subtext,
        next.homeHero.subtext,
    );
    record(
        'home',
        'Hero main button',
        current.homeHero.primaryCta,
        next.homeHero.primaryCta,
    );
    record(
        'home',
        'Hero second button',
        current.homeHero.secondaryCta,
        next.homeHero.secondaryCta,
    );

    current.homeStats.forEach((stat, index) => {
        const updated = next.homeStats[index];

        record(
            'home',
            `Homepage stat ${index + 1} label`,
            stat.label,
            updated ? updated.label : '',
        );
        record(
            'home',
            `Homepage stat ${index + 1} value`,
            stat.value,
            updated ? updated.value : '',
        );
    });

    current.homeResources.forEach((resource, index) => {
        const updated = next.homeResources[index];

        record(
            'home',
            `Resource card ${index + 1} eyebrow`,
            resource.eyebrow,
            updated ? updated.eyebrow : '',
        );
        record(
            'home',
            `Resource card ${index + 1} title`,
            resource.title,
            updated ? updated.title : '',
        );
        record(
            'home',
            `Resource card ${index + 1} body`,
            resource.body,
            updated ? updated.body : '',
        );
        record(
            'home',
            `Resource card ${index + 1} link`,
            resource.link,
            updated ? updated.link : '',
        );
    });

    current.contactDesks.forEach((desk, index) => {
        const updated = next.contactDesks[index];

        record(
            'contact',
            `Contact desk ${index + 1} label`,
            desk.label,
            updated ? updated.label : '',
        );
        record(
            'contact',
            `Contact desk ${index + 1} email`,
            desk.email,
            updated ? updated.email : '',
        );
        record(
            'contact',
            `Contact desk ${index + 1} phone`,
            desk.phone,
            updated ? updated.phone : '',
        );
        record(
            'contact',
            `Contact desk ${index + 1} blurb`,
            desk.blurb,
            updated ? updated.blurb : '',
        );
    });

    current.footerLinks.forEach((link, index) => {
        const updated = next.footerLinks[index];

        record(
            'footer',
            `Footer link ${index + 1} label`,
            link.label,
            updated ? updated.label : '',
        );
        record(
            'footer',
            `Footer link ${index + 1} target`,
            link.href,
            updated ? updated.href : '',
        );
    });

    record(
        'footer',
        'Facebook address',
        current.socialUrls.facebook,
        next.socialUrls.facebook,
    );
    record(
        'footer',
        'Instagram address',
        current.socialUrls.instagram,
        next.socialUrls.instagram,
    );
    record('footer', 'X address', current.socialUrls.x, next.socialUrls.x);
    record(
        'footer',
        'Website address',
        current.socialUrls.website,
        next.socialUrls.website,
    );

    return changes;
}

/**
 * Inline rules a broken edit triggers. Values are seeded valid, so an
 * error only appears once the user empties or mangles its field — and it
 * always sits under that field rather than in a toast.
 */
function validateDraft(draft: ContentDraft): DraftErrors {
    const errors: DraftErrors = {};

    if (draft.announcementEnabled && draft.announcementText.trim() === '') {
        errors.announcementText =
            'Enter the announcement text, or turn the announcement off.';
    }
    if (
        draft.announcementLink.trim() !== '' &&
        !isLinkTarget(draft.announcementLink)
    ) {
        errors.announcementLink =
            'Enter a path starting with “/”, or a full web address.';
    }

    if (draft.heroHeadline.trim() === '') {
        errors.heroHeadline = 'Enter the headline the homepage opens with.';
    }
    if (draft.heroPrimaryCta.trim() === '') {
        errors.heroPrimaryCta = 'Enter the label for the main button.';
    }
    if (draft.heroSubtext.length > LONG_TEXT_MAX) {
        errors.heroSubtext = 'Keep the subtext under 20,000 characters.';
    }

    const seenStatLabels = new Set<string>();

    draft.stats.forEach((stat, index) => {
        const label = stat.label.trim();

        if (label === '') {
            errors[`stats.${index}.label`] = `Stat ${index + 1} needs a label.`;
        } else if (seenStatLabels.has(label.toLowerCase())) {
            errors[`stats.${index}.label`] =
                `Two stats are labelled “${label}” — each one counts something different.`;
        } else {
            seenStatLabels.add(label.toLowerCase());
        }

        if (stat.value.trim() === '') {
            errors[`stats.${index}.value`] = `Stat ${index + 1} needs a value.`;
        }
    });

    draft.resources.forEach((resource, index) => {
        if (resource.eyebrow.trim() === '') {
            errors[`resources.${index}.eyebrow`] =
                `Card ${index + 1} needs an eyebrow.`;
        }
        if (resource.title.trim() === '') {
            errors[`resources.${index}.title`] =
                `Card ${index + 1} needs a title.`;
        }
        if (resource.body.length > LONG_TEXT_MAX) {
            errors[`resources.${index}.body`] =
                'Keep the body under 20,000 characters.';
        }
        if (resource.link.trim() !== '' && !isLinkTarget(resource.link)) {
            errors[`resources.${index}.link`] =
                'Enter a path starting with “/”, or a full web address.';
        }
    });

    draft.desks.forEach((desk, index) => {
        if (desk.label.trim() === '') {
            errors[`desks.${index}.label`] = `Desk ${index + 1} needs a label.`;
        }
        if (desk.email.trim() === '') {
            errors[`desks.${index}.email`] =
                `Desk ${index + 1} needs an email address.`;
        } else if (!EMAIL_PATTERN.test(desk.email.trim())) {
            errors[`desks.${index}.email`] = 'Enter a valid email address.';
        }
        if (
            desk.phone.trim() !== '' &&
            !PHONE_PATTERN.test(desk.phone.trim())
        ) {
            errors[`desks.${index}.phone`] =
                'Enter a phone number, e.g. +63 2 8555 0100.';
        }
    });

    draft.footerLinks.forEach((link, index) => {
        if (link.label.trim() === '') {
            errors[`footer.${index}.label`] =
                `Footer link ${index + 1} needs a label.`;
        }
        if (link.href.trim() === '') {
            errors[`footer.${index}.href`] =
                `Footer link ${index + 1} needs a target.`;
        } else if (!isLinkTarget(link.href)) {
            errors[`footer.${index}.href`] =
                'Enter a path starting with “/”, or a full web address.';
        }
    });

    for (const [key, label] of [
        ['socialFacebook', 'Facebook'],
        ['socialInstagram', 'Instagram'],
        ['socialX', 'X'],
        ['socialWebsite', 'Website'],
    ] as const) {
        const value = draft[key].trim();

        if (value === '') {
            errors[key] = `Enter the ${label} address.`;
        } else if (!isFullWebAddress(value)) {
            errors[key] =
                `Enter the full ${label} address, including https://.`;
        }
    }

    return errors;
}

type SetValue = <K extends keyof ContentDraft>(
    key: K,
    value: ContentDraft[K],
) => void;

type PaneProps = {
    draft: ContentDraft;
    setValue: SetValue;
    setMany: (patch: Partial<ContentDraft>) => void;
    errors: DraftErrors;
};

/** One bordered block per editable item, the console's list rhythm. */
function ItemBlock({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-4">
            <h3 className="text-[11px] font-semibold tracking-[0.06em] text-[var(--slate)] uppercase">
                {title}
            </h3>
            {children}
        </div>
    );
}

/** Area 1: the announcement bar at the top of the public site. */
function AnnouncementPane({ draft, setValue, errors }: PaneProps) {
    return (
        <Card data-testid="pane-announcement">
            <CardHeader>
                <CardTitle className="text-base font-semibold text-[var(--navy)]">
                    Announcement bar
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--navy)]">
                    <Checkbox
                        checked={draft.announcementEnabled}
                        onCheckedChange={(checked) =>
                            setValue('announcementEnabled', checked === true)
                        }
                        data-testid="checkbox-announcement-enabled"
                    />
                    Show the announcement bar on the public site
                </label>

                <TextField
                    id="announcement-text"
                    label="Announcement text"
                    required
                    value={draft.announcementText}
                    onChange={(value) => setValue('announcementText', value)}
                    error={errors.announcementText ?? null}
                    hint="One line — it sits above every page of the public site."
                    data-testid="input-announcement-text"
                />

                <TextField
                    id="announcement-link"
                    label="Announcement link"
                    value={draft.announcementLink}
                    onChange={(value) => setValue('announcementLink', value)}
                    error={errors.announcementLink ?? null}
                    hint="Where the bar sends people — a path like /contact, or a full web address."
                    data-testid="input-announcement-link"
                />
            </CardContent>
        </Card>
    );
}

/** Area 2: the homepage blocks — hero, stat row, resource cards. */
function HomePane({ draft, setValue, setMany, errors }: PaneProps) {
    function updateStat(index: number, key: keyof StatDraft, value: string) {
        setMany({
            stats: draft.stats.map((stat, rowIndex) =>
                rowIndex === index ? { ...stat, [key]: value } : stat,
            ),
        });
    }

    function updateResource(
        index: number,
        key: keyof ResourceDraft,
        value: string,
    ) {
        setMany({
            resources: draft.resources.map((resource, rowIndex) =>
                rowIndex === index ? { ...resource, [key]: value } : resource,
            ),
        });
    }

    return (
        <div
            role="tabpanel"
            aria-label="Homepage"
            className="flex flex-col gap-5"
            data-testid="pane-home"
        >
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold text-[var(--navy)]">
                        Hero
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                    <TextField
                        id="hero-headline"
                        label="Headline"
                        required
                        value={draft.heroHeadline}
                        onChange={(value) => setValue('heroHeadline', value)}
                        error={errors.heroHeadline ?? null}
                        data-testid="input-hero-headline"
                    />

                    <TextAreaField
                        id="hero-subtext"
                        label="Subtext"
                        rows={3}
                        maxLength={LONG_TEXT_MAX}
                        value={draft.heroSubtext}
                        onChange={(value) => setValue('heroSubtext', value)}
                        error={errors.heroSubtext ?? null}
                        data-testid="input-hero-subtext"
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                            id="hero-primary-cta"
                            label="Main button"
                            required
                            value={draft.heroPrimaryCta}
                            onChange={(value) =>
                                setValue('heroPrimaryCta', value)
                            }
                            error={errors.heroPrimaryCta ?? null}
                            data-testid="input-hero-primary-cta"
                        />
                        <TextField
                            id="hero-secondary-cta"
                            label="Second button"
                            value={draft.heroSecondaryCta}
                            onChange={(value) =>
                                setValue('heroSecondaryCta', value)
                            }
                            data-testid="input-hero-secondary-cta"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold text-[var(--navy)]">
                        Stats row
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <p className="text-xs text-[var(--slate)]">
                        The four numbers under the hero. Each one needs its own
                        label so visitors know what the figure counts.
                    </p>
                    {draft.stats.map((stat, index) => (
                        <ItemBlock
                            key={`stat-${index}`}
                            title={`Stat ${index + 1}`}
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <TextField
                                    id={`stat-label-${index}`}
                                    label="Label"
                                    required
                                    value={stat.label}
                                    onChange={(value) =>
                                        updateStat(index, 'label', value)
                                    }
                                    error={
                                        errors[`stats.${index}.label`] ?? null
                                    }
                                    data-testid={`input-stat-label-${index}`}
                                />
                                <TextField
                                    id={`stat-value-${index}`}
                                    label="Value"
                                    required
                                    value={stat.value}
                                    onChange={(value) =>
                                        updateStat(index, 'value', value)
                                    }
                                    error={
                                        errors[`stats.${index}.value`] ?? null
                                    }
                                    data-testid={`input-stat-value-${index}`}
                                />
                            </div>
                        </ItemBlock>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold text-[var(--navy)]">
                        Resource cards
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <p className="text-xs text-[var(--slate)]">
                        The cards that walk applicants through preparing,
                        applying and checking an Agency.
                    </p>
                    {draft.resources.map((resource, index) => (
                        <ItemBlock
                            key={resource.id}
                            title={`Card ${index + 1}`}
                        >
                            <LockedField
                                label="Icon"
                                value={
                                    <span className="font-mono text-xs font-semibold">
                                        {resource.icon}
                                    </span>
                                }
                                reason="The icon name is matched against the set the homepage can draw — an unknown name would leave the card without its image. Keep it and edit the eyebrow, title and body around it."
                                data-testid={`locked-resource-icon-${resource.id}`}
                            />

                            <div className="grid gap-4 sm:grid-cols-2">
                                <TextField
                                    id={`resource-eyebrow-${index}`}
                                    label="Eyebrow"
                                    required
                                    value={resource.eyebrow}
                                    onChange={(value) =>
                                        updateResource(index, 'eyebrow', value)
                                    }
                                    error={
                                        errors[`resources.${index}.eyebrow`] ??
                                        null
                                    }
                                    data-testid={`input-resource-eyebrow-${index}`}
                                />
                                <TextField
                                    id={`resource-link-${index}`}
                                    label="Link"
                                    value={resource.link}
                                    onChange={(value) =>
                                        updateResource(index, 'link', value)
                                    }
                                    error={
                                        errors[`resources.${index}.link`] ??
                                        null
                                    }
                                    hint="A path like /jobs, or a full web address."
                                    data-testid={`input-resource-link-${index}`}
                                />
                            </div>

                            <TextField
                                id={`resource-title-${index}`}
                                label="Title"
                                required
                                value={resource.title}
                                onChange={(value) =>
                                    updateResource(index, 'title', value)
                                }
                                error={
                                    errors[`resources.${index}.title`] ?? null
                                }
                                data-testid={`input-resource-title-${index}`}
                            />

                            <TextAreaField
                                id={`resource-body-${index}`}
                                label="Body"
                                rows={3}
                                maxLength={LONG_TEXT_MAX}
                                value={resource.body}
                                onChange={(value) =>
                                    updateResource(index, 'body', value)
                                }
                                error={
                                    errors[`resources.${index}.body`] ?? null
                                }
                                data-testid={`input-resource-body-${index}`}
                            />
                        </ItemBlock>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

/** Area 3: the contact desks shown on the public contact page. */
function ContactPane({ draft, setMany, errors }: PaneProps) {
    function updateDesk(index: number, key: keyof DeskDraft, value: string) {
        setMany({
            desks: draft.desks.map((desk, rowIndex) =>
                rowIndex === index ? { ...desk, [key]: value } : desk,
            ),
        });
    }

    return (
        <Card data-testid="pane-contact">
            <CardHeader>
                <CardTitle className="text-base font-semibold text-[var(--navy)]">
                    Contact desks
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <p className="text-xs text-[var(--slate)]">
                    Each desk is one point of contact on the public contact
                    page. Every desk needs a working email address — it is how
                    applicants actually reach it.
                </p>
                {draft.desks.map((desk, index) => (
                    <ItemBlock key={desk.id} title={`Desk ${index + 1}`}>
                        <TextField
                            id={`desk-label-${index}`}
                            label="Label"
                            required
                            value={desk.label}
                            onChange={(value) =>
                                updateDesk(index, 'label', value)
                            }
                            error={errors[`desks.${index}.label`] ?? null}
                            data-testid={`input-desk-label-${index}`}
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <TextField
                                id={`desk-email-${index}`}
                                label="Email"
                                required
                                type="email"
                                inputMode="email"
                                value={desk.email}
                                onChange={(value) =>
                                    updateDesk(index, 'email', value)
                                }
                                error={errors[`desks.${index}.email`] ?? null}
                                data-testid={`input-desk-email-${index}`}
                            />
                            <TextField
                                id={`desk-phone-${index}`}
                                label="Phone"
                                inputMode="tel"
                                value={desk.phone}
                                onChange={(value) =>
                                    updateDesk(index, 'phone', value)
                                }
                                error={errors[`desks.${index}.phone`] ?? null}
                                hint="Optional — shown next to the email address."
                                data-testid={`input-desk-phone-${index}`}
                            />
                        </div>
                        <TextField
                            id={`desk-blurb-${index}`}
                            label="Blurb"
                            value={desk.blurb}
                            onChange={(value) =>
                                updateDesk(index, 'blurb', value)
                            }
                            hint="One line saying what this desk answers."
                            data-testid={`input-desk-blurb-${index}`}
                        />
                    </ItemBlock>
                ))}
            </CardContent>
        </Card>
    );
}

/** Area 4: the footer links and the social addresses. */
function FooterPane({ draft, setValue, setMany, errors }: PaneProps) {
    function updateFooterLink(
        index: number,
        key: keyof FooterLinkDraft,
        value: string,
    ) {
        setMany({
            footerLinks: draft.footerLinks.map((link, rowIndex) =>
                rowIndex === index ? { ...link, [key]: value } : link,
            ),
        });
    }

    return (
        <div
            role="tabpanel"
            aria-label="Footer"
            className="flex flex-col gap-5"
            data-testid="pane-footer"
        >
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold text-[var(--navy)]">
                        Footer links
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <p className="text-xs text-[var(--slate)]">
                        Every footer link needs a target — a path like /jobs or
                        a full web address.
                    </p>
                    {draft.footerLinks.map((link, index) => (
                        <ItemBlock key={link.id} title={`Link ${index + 1}`}>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <TextField
                                    id={`footer-label-${index}`}
                                    label="Label"
                                    required
                                    value={link.label}
                                    onChange={(value) =>
                                        updateFooterLink(index, 'label', value)
                                    }
                                    error={
                                        errors[`footer.${index}.label`] ?? null
                                    }
                                    data-testid={`input-footer-label-${index}`}
                                />
                                <TextField
                                    id={`footer-href-${index}`}
                                    label="Target"
                                    required
                                    value={link.href}
                                    onChange={(value) =>
                                        updateFooterLink(index, 'href', value)
                                    }
                                    error={
                                        errors[`footer.${index}.href`] ?? null
                                    }
                                    data-testid={`input-footer-href-${index}`}
                                />
                            </div>
                        </ItemBlock>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold text-[var(--navy)]">
                        Social addresses
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                    <p className="text-xs text-[var(--slate)]">
                        The footer shows one icon per address, so each needs a
                        full web address — an empty or half-written one would
                        render a link that goes nowhere.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                            id="social-facebook"
                            label="Facebook"
                            required
                            inputMode="url"
                            value={draft.socialFacebook}
                            onChange={(value) =>
                                setValue('socialFacebook', value)
                            }
                            error={errors.socialFacebook ?? null}
                            data-testid="input-social-facebook"
                        />
                        <TextField
                            id="social-instagram"
                            label="Instagram"
                            required
                            inputMode="url"
                            value={draft.socialInstagram}
                            onChange={(value) =>
                                setValue('socialInstagram', value)
                            }
                            error={errors.socialInstagram ?? null}
                            data-testid="input-social-instagram"
                        />
                        <TextField
                            id="social-x"
                            label="X"
                            required
                            inputMode="url"
                            value={draft.socialX}
                            onChange={(value) => setValue('socialX', value)}
                            error={errors.socialX ?? null}
                            data-testid="input-social-x"
                        />
                        <TextField
                            id="social-website"
                            label="Website"
                            required
                            inputMode="url"
                            value={draft.socialWebsite}
                            onChange={(value) =>
                                setValue('socialWebsite', value)
                            }
                            error={errors.socialWebsite ?? null}
                            data-testid="input-social-website"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/** Skeleton beat so the panes paint like every other console screen. */
function ContentSkeleton() {
    return (
        <ul
            className="flex flex-col gap-3"
            data-testid="content-skeleton"
            aria-hidden="true"
        >
            {Array.from({ length: 3 }).map((_, index) => (
                <li
                    key={`skeleton-${index}`}
                    className="rounded-lg border border-[var(--line)] bg-white p-5"
                >
                    <Skeleton className="mb-4 h-4 w-40 motion-reduce:animate-none" />
                    <Skeleton className="mb-2 h-10 w-full motion-reduce:animate-none" />
                    <Skeleton className="h-10 w-full motion-reduce:animate-none" />
                </li>
            ))}
        </ul>
    );
}

/**
 * The form itself. Seeded from the store content on mount; an Undo bumps
 * the parent's form key so this remounts with the restored originals as
 * its new baseline.
 */
function ContentForm({
    content,
    area,
    onAreaChange,
    onReverted,
}: {
    content: SiteContentState;
    area: Area;
    onAreaChange: (next: Area) => void;
    onReverted: () => void;
}) {
    const { values, isDirty, setValue, setMany, discard, accept } =
        useFormChanges<ContentDraft>(toDraft(content));

    const [confirming, setConfirming] = useState(false);

    const errors = useMemo(() => validateDraft(values), [values]);
    const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

    // Dirty = what a save would actually write differs from the store.
    const changes = useMemo(
        () => diffContent(buildContent(values), content),
        [values, content],
    );

    const sectionsTouched = useMemo(() => {
        const counts = new Map<Area, number>();

        for (const entry of changes) {
            counts.set(entry.area, (counts.get(entry.area) ?? 0) + 1);
        }

        return counts;
    }, [changes]);

    function requestSave() {
        if (hasErrors || changes.length === 0) {
            return;
        }

        setConfirming(true);
    }

    function confirmSave() {
        setConfirming(false);

        const next = buildContent(values);
        const original = content;

        commitSystemChange({
            action: 'update',
            subjectType: 'content',
            subjectId: 'site-content',
            subjectLabel: 'Site content',
            changes: changes.map((entry) => entry.change),
            apply: (current) => ({
                ...current,
                content: next,
            }),
        });

        accept();

        toast.success('Site content saved.', {
            duration: 6000,
            action: {
                label: 'Undo',
                onClick: () => {
                    updateSystemState((current) => ({
                        ...current,
                        content: original,
                    }));
                    popAuditEntry();
                    onReverted();
                },
            },
        });
    }

    const paneProps: PaneProps = {
        draft: values,
        setValue,
        setMany,
        errors,
    };

    return (
        <>
            <SegmentedControl<Area>
                value={area}
                onValueChange={onAreaChange}
                options={AREA_OPTIONS}
                aria-label="Content section"
                data-testid="segmented-area"
            />

            {area === 'announcement' && <AnnouncementPane {...paneProps} />}
            {area === 'home' && <HomePane {...paneProps} />}
            {area === 'contact' && <ContactPane {...paneProps} />}
            {area === 'footer' && <FooterPane {...paneProps} />}

            <ChangeBar
                count={changes.length}
                onDiscard={discard}
                onSave={requestSave}
                saveDisabled={hasErrors}
                data-testid="change-bar-content"
            />

            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title="Save these content changes?"
                description={`${changes.length} ${changes.length === 1 ? 'field differs' : 'fields differ'} from the content the public site renders.`}
                consequences={[
                    ...[...sectionsTouched.entries()].map(
                        ([areaTouched, count]) =>
                            `${AREA_LABELS[areaTouched]}: ${count} ${count === 1 ? 'field' : 'fields'}.`,
                    ),
                    isDirty
                        ? 'Edits left in other sections stay unsaved until you save them too.'
                        : 'Every field is up to date in this form.',
                    'The audit log records each field’s before and after values.',
                    'Undo in the toast restores the exact previous values and drops the audit row.',
                ]}
                confirmLabel="Save changes"
                data-testid="confirm-content-save"
                onConfirm={confirmSave}
            />
        </>
    );
}

export default function ContentPage() {
    const state = useSystemState();
    const loading = useSystemLoading();

    const [area, setArea] = useState<Area>('announcement');
    // Bumped by an Undo so the form remounts on the restored originals.
    const [formVersion, setFormVersion] = useState(0);

    return (
        <>
            <Head title="Site content" />

            <SystemPage>
                <SystemPageHeader
                    title="Site content"
                    subtitle="The announcement bar, the homepage blocks, the contact desks and the footer the public site renders."
                    actions={
                        <Button
                            asChild
                            variant="secondary"
                            className="h-10 rounded-lg px-5 text-sm font-semibold"
                            data-testid="button-preview-site"
                        >
                            <a
                                href={home.url()}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <ExternalLink
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Preview the site
                            </a>
                        </Button>
                    }
                    data-testid="header-content"
                />

                {loading ? (
                    <ContentSkeleton />
                ) : (
                    <ContentForm
                        key={formVersion}
                        content={state.content}
                        area={area}
                        onAreaChange={setArea}
                        onReverted={() =>
                            setFormVersion((version) => version + 1)
                        }
                    />
                )}
            </SystemPage>
        </>
    );
}

ContentPage.layout = {
    breadcrumbs: [
        {
            title: 'Site content',
            href: system.content(),
        },
    ],
};
