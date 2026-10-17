import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Compact applicant facts in two mobile columns and three desktop columns. */
export function ListingFactGrid({
    facts,
}: {
    facts: { label: string; value: ReactNode; icon: LucideIcon }[];
}) {
    return (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            {facts
                .filter(
                    (fact) =>
                        fact.value !== undefined &&
                        fact.value !== null &&
                        fact.value !== '',
                )
                .map(({ label, value, icon: Icon }) => (
                    <div key={label} className="min-w-0">
                        <dt className="text-[10px] font-semibold tracking-[0.08em] text-[#8a99a6] uppercase">
                            {label}
                        </dt>
                        <dd className="mt-1.5 flex items-start gap-2 text-[13px] font-semibold break-words text-[var(--navy)]">
                            <Icon
                                className="mt-0.5 size-3.5 shrink-0 text-[var(--slate)]"
                                aria-hidden="true"
                            />
                            <span className="min-w-0">{value}</span>
                        </dd>
                    </div>
                ))}
        </dl>
    );
}
