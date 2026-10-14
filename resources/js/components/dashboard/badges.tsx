import { Badge } from '@/components/ui/badge';
import type { EffectiveStatus } from '@/data/job-attributes';
import type { AccountStatus } from '@/types/account';
import type { Pathway } from '@/types/agency';
import type { ApplicationStage } from '@/types/application';
import type { Availability } from '@/types/applicant';

/**
 * Badges use a light tint of their hue with dark text, so a table row
 * stays calm and scannable. Only genuinely terminal or alert states
 * (Hired, Urgent) use a solid fill, which keeps them standing out.
 * Every badge always carries its text label, so colour is never the
 * only signal.
 */
const stageClasses: Record<ApplicationStage, string> = {
    Applied: 'border-transparent bg-[var(--navy)]/5 text-[var(--navy)]',
    Reviewed: 'border-transparent bg-[var(--teal)]/15 text-[var(--navy)]',
    Interview: 'border-transparent bg-[var(--navy)]/15 text-[var(--navy)]',
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

const statusClasses: Record<EffectiveStatus, string> = {
    published: 'border-transparent bg-[var(--teal)]/15 text-[var(--navy)]',
    draft: 'border-transparent bg-[var(--navy)]/8 text-[var(--slate)]',
    closed: 'border-transparent bg-muted text-muted-foreground',
};

const statusLabels: Record<EffectiveStatus, string> = {
    published: 'Published',
    draft: 'Draft',
    closed: 'Closed',
};

export function ListingStatusBadge({ status }: { status: EffectiveStatus }) {
    return (
        <Badge
            variant="outline"
            className={statusClasses[status]}
            data-testid={`badge-status-${status}`}
        >
            {statusLabels[status]}
        </Badge>
    );
}

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
        <Badge
            variant="outline"
            className={
                postingType === 'manpooling'
                    ? 'border-transparent bg-[var(--navy)]/5 text-[var(--navy)]'
                    : 'border-transparent bg-[var(--teal)]/15 text-[var(--navy)]'
            }
        >
            {labels[postingType]}
        </Badge>
    );
}
