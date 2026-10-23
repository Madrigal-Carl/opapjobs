import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

type LockedFieldProps = {
    /** What is locked, e.g. "Pathway". */
    label: string;
    /** The value shown in place of an editable control. */
    value: ReactNode;
    /**
     * The reason *and* the way out, e.g. "Pathway is locked because this
     * Agency has 14 job posts."
     */
    reason: string;
    className?: string;
    'data-testid'?: string;
};

/**
 * Read-only stand-in for a field the rules do not allow to change
 * (spec §5.4). Always states the reason rather than silently disabling the
 * control, and keeps the value legible so the record still reads correctly.
 */
export function LockedField({
    label,
    value,
    reason,
    className,
    'data-testid': testId,
}: LockedFieldProps) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--slate)]">
                {label}
                <Lock
                    aria-label="Locked"
                    className="size-3.5 text-[var(--slate)]"
                />
            </span>

            <div className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2.5">
                <div className="text-sm text-[var(--navy)]">{value}</div>
            </div>

            <p className="text-xs text-[var(--slate)]">{reason}</p>
            <span className="sr-only" data-testid={testId}>
                {label} is locked: {reason}
            </span>
        </div>
    );
}
