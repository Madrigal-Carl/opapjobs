import { cn } from '@/lib/utils';

/**
 * Staff-seat usage against `agency_user_limit` — the "3 / 5" figure with a
 * thin meter under it.
 *
 * The bar is decorative and the text beside it is the real value, so the
 * ratio stays readable in a table cell, at 360px, and to a screen reader
 * (the track is an ARIA `meter`). It turns red only when the Agency is at or
 * over its cap, which is the one state worth flagging without a toast.
 */
export function SeatMeter({
    used,
    limit,
    className,
    'data-testid': testId,
}: {
    used: number;
    limit: number;
    className?: string;
    'data-testid'?: string;
}) {
    const full = limit > 0 && used >= limit;
    const ratio = limit <= 0 ? 0 : Math.min(1, used / limit);

    return (
        <div
            className={cn('flex items-center gap-2', className)}
            data-testid={testId}
        >
            <span className="text-xs whitespace-nowrap text-[var(--slate)] tabular-nums">
                <span
                    className={cn(
                        'font-semibold',
                        full ? 'text-[var(--danger)]' : 'text-[var(--navy)]',
                    )}
                >
                    {used}
                </span>
                {' / '}
                {limit}
            </span>

            <span
                role="meter"
                aria-valuenow={used}
                aria-valuemin={0}
                aria-valuemax={limit}
                aria-label={`${used} of ${limit} staff seats used`}
                className="h-1.5 min-w-10 flex-1 overflow-hidden rounded-full bg-[var(--surface-soft)]"
            >
                <span
                    className={cn(
                        'block h-full rounded-full motion-safe:transition-[width]',
                        full ? 'bg-[var(--danger)]' : 'bg-[var(--teal)]',
                    )}
                    style={{ width: `${ratio * 100}%` }}
                />
            </span>
        </div>
    );
}
