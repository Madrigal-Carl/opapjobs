import { Badge } from '@/components/ui/badge';
import type { AccountStatus } from '@/types/account';
import type { Pathway } from '@/types/agency';
import type { ApplicationStage } from '@/types/application';
import type { Availability } from '@/types/applicant';

const stageClasses: Record<ApplicationStage, string> = {
    Applied: 'bg-[var(--surface-soft)] text-[var(--navy)]',
    Reviewed: 'bg-white text-[var(--slate)]',
    Interview: 'bg-[var(--navy)] text-white',
    Hired: 'bg-[var(--teal)] text-white',
    Pending: 'bg-[var(--amber)] text-[var(--navy)]',
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
                    ? 'bg-[var(--surface-soft)] text-[var(--navy)]'
                    : 'bg-[var(--navy)] text-white'
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
                    ? 'bg-[var(--teal)] text-white'
                    : 'bg-[var(--surface-soft)] text-[var(--navy)]'
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
                    ? 'bg-[var(--teal)] text-white'
                    : 'bg-destructive text-white'
            }
        >
            {status}
        </Badge>
    );
}

export function FeaturedBadge() {
    return (
        <Badge
            variant="outline"
            className="bg-[var(--amber)] text-[var(--navy)]"
        >
            Featured
        </Badge>
    );
}

export function UrgentBadge() {
    return (
        <Badge variant="outline" className="bg-destructive text-white">
            Urgent
        </Badge>
    );
}
