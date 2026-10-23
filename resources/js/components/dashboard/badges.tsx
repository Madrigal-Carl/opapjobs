import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATUS_LABELS, type EffectiveStatus } from '@/data/job-attributes';
import type { AccountStatus } from '@/types/account';
import type { Pathway } from '@/types/agency';
import type { ApplicationStage } from '@/types/application';
import type { Availability } from '@/types/applicant';
import type { JobPostDisplayStatus } from '@/types/job-post';

/**
 * Generic pill primitive: a light tint of the tone's hue with dark text
 * and an optional leading dot. The text label is always rendered, so
 * colour is never the only signal.
 */
export type StatusPillTone =
    | 'success'
    | 'neutral'
    | 'warning'
    | 'danger'
    | 'info'
    | 'teal'
    | 'navy'
    | 'indigo';

const pillToneClasses: Record<
    StatusPillTone,
    { container: string; dot: string }
> = {
    success: {
        container:
            'border-transparent bg-[var(--success-soft)] text-[var(--success-ink)]',
        dot: 'bg-[var(--success)]',
    },
    neutral: {
        container:
            'border-transparent bg-[var(--neutral-soft)] text-[var(--neutral-ink)]',
        dot: 'bg-[var(--neutral-dot)]',
    },
    warning: {
        container: 'border-transparent bg-[var(--amber)]/20 text-[var(--navy)]',
        dot: 'bg-[var(--amber)]',
    },
    danger: {
        container:
            'border-transparent bg-[var(--danger-soft)] text-[var(--danger)]',
        dot: 'bg-[var(--danger)]',
    },
    info: {
        container:
            'border-transparent bg-[var(--surface-soft)] text-[var(--navy)]',
        dot: 'bg-[var(--teal)]',
    },
    teal: {
        container:
            'border-transparent bg-[var(--teal-light)] text-[var(--teal-ink)]',
        dot: 'bg-[var(--teal)]',
    },
    navy: {
        container: 'border-transparent bg-[var(--navy)]/10 text-[var(--navy)]',
        dot: 'bg-[var(--navy)]',
    },
    indigo: {
        container:
            'border-transparent bg-[var(--indigo-soft)] text-[var(--navy)]',
        dot: 'bg-[var(--navy)]/40',
    },
};

type StatusPillProps = {
    tone: StatusPillTone;
    /** Renders the leading 6px dot. */
    dot?: boolean;
    /** 'md' (default) is 12px/600 at ~24px high, 'sm' is 11px at ~20px. */
    size?: 'sm' | 'md';
    dotClassName?: string;
    children: ReactNode;
    className?: string;
    'data-testid'?: string;
};

export function StatusPill({
    tone,
    dot = false,
    size = 'md',
    dotClassName,
    children,
    className,
    ...props
}: StatusPillProps) {
    return (
        <Badge
            variant="outline"
            className={cn(
                'gap-1.5 font-semibold whitespace-nowrap',
                size === 'sm' ? 'h-5 px-2 text-[11px]' : 'h-6 px-2.5 text-xs',
                pillToneClasses[tone].container,
                className,
            )}
            {...props}
        >
            {dot && (
                <span
                    className={cn(
                        'size-1.5 shrink-0 rounded-full',
                        pillToneClasses[tone].dot,
                        dotClassName,
                    )}
                    aria-hidden="true"
                />
            )}
            {children}
        </Badge>
    );
}

/**
 * Badges use a light tint of their hue with dark text, so a table row
 * stays calm and scannable. Only genuinely terminal or alert states
 * (Hired, Urgent) use a solid fill, which keeps them standing out.
 * Every badge always carries its text label, so colour is never the
 * only signal.
 */
const stageClasses: Record<ApplicationStage, string> = {
    Reviewed: 'border-transparent bg-[var(--teal)]/15 text-[var(--navy)]',
    Shortlisted: 'border-transparent bg-[var(--navy)]/5 text-[var(--navy)]',
    Interviewed: 'border-transparent bg-[var(--navy)]/15 text-[var(--navy)]',
    Hired: 'border-transparent bg-[var(--teal)] text-white',
    Pending: 'border-transparent bg-[var(--amber)]/20 text-[var(--navy)]',
};

export function StageBadge({ stage }: { stage: ApplicationStage }) {
    return (
        <Badge variant="outline" className={stageClasses[stage]}>
            {stage}
        </Badge>
    );
}

export function PathwayBadge({ pathway }: { pathway: Pathway }) {
    return (
        <Badge
            variant="outline"
            className={
                pathway === 'landbased'
                    ? 'border-transparent bg-[var(--navy)]/5 text-[var(--navy)]'
                    : 'border-transparent bg-[var(--teal)]/15 text-[var(--navy)]'
            }
        >
            {pathway === 'landbased' ? 'Landbased' : 'Seabased'}
        </Badge>
    );
}

export function AvailabilityBadge({
    availability,
}: {
    availability: Availability;
}) {
    return (
        <Badge
            variant="outline"
            className={
                availability === 'Available now'
                    ? 'border-transparent bg-[var(--teal)]/15 text-[var(--navy)]'
                    : 'border-transparent bg-[var(--navy)]/5 text-[var(--navy)]'
            }
        >
            {availability}
        </Badge>
    );
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
    return (
        <Badge
            variant="outline"
            className={
                status === 'Active'
                    ? 'border-transparent bg-[var(--teal)]/15 text-[var(--navy)]'
                    : 'border-transparent bg-destructive/10 text-destructive'
            }
        >
            {status}
        </Badge>
    );
}

const statusTone: Record<
    EffectiveStatus | JobPostDisplayStatus,
    StatusPillTone
> = {
    active: 'success',
    published: 'success',
    expired: 'warning',
    closed: 'danger',
    archived: 'neutral',
};

export function JobPostStatusBadge({
    status,
}: {
    status: EffectiveStatus | JobPostDisplayStatus;
}) {
    return (
        <StatusPill
            tone={statusTone[status]}
            dot
            dotClassName={
                status === 'archived' ? 'bg-[var(--neutral-dot)]/60' : undefined
            }
            data-testid={`badge-status-${status}`}
        >
            {status === 'active' ? 'Active' : STATUS_LABELS[status]}
        </StatusPill>
    );
}

export { JobPostStatusBadge as ListingStatusBadge };

export function ClosingSoonBadge() {
    return (
        <Badge
            variant="outline"
            className="border-transparent bg-[var(--amber)]/25 text-[var(--navy)]"
            data-testid="badge-closing-soon"
        >
            Closing soon
        </Badge>
    );
}

export function FeaturedBadge() {
    return (
        <Badge
            variant="outline"
            className="border-transparent bg-[var(--amber)]/20 text-[var(--navy)]"
        >
            Featured
        </Badge>
    );
}

export function UrgentBadge() {
    return (
        <Badge
            variant="outline"
            className="border-transparent bg-destructive text-white"
        >
            Urgent
        </Badge>
    );
}

export function PostingTypeBadge({
    postingType,
    labels,
}: {
    postingType: 'joborder' | 'manpooling';
    labels: Record<'joborder' | 'manpooling', string>;
}) {
    return (
        <StatusPill
            tone={postingType === 'manpooling' ? 'indigo' : 'teal'}
            data-testid={`badge-posting-type-${postingType}`}
        >
            {labels[postingType]}
        </StatusPill>
    );
}
