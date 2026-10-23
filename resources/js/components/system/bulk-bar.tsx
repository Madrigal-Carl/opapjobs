import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Action strip that appears above a table once rows are ticked.
 *
 * Every bulk flow in the console shows this first: the count is read out
 * before any button is offered, so an operator always knows how many records
 * a bulk archive would touch. It renders nothing at zero selected, which
 * means it can sit permanently inside a toolbar without leaving an empty
 * strip behind.
 */
export function BulkBar({
    count,
    label,
    onClear,
    children,
    'data-testid': testId = 'bulk-bar',
}: {
    /** Number of currently selected rows. */
    count: number;
    /** Plural noun for the records, e.g. `agencies`. */
    label: string;
    onClear: () => void;
    /** Bulk action buttons. */
    children: ReactNode;
    'data-testid'?: string;
}) {
    if (count === 0) {
        return null;
    }

    return (
        <div
            role="region"
            aria-label="Bulk actions"
            data-testid={testId}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--line)] bg-[var(--teal-light)]/40 px-5 py-3"
        >
            <span className="text-sm font-semibold text-[var(--navy)]">
                {count} {count === 1 ? label.replace(/s$/, '') : label} selected
            </span>

            <div className="flex flex-wrap items-center gap-2">{children}</div>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="ml-auto"
                data-testid="bulk-clear"
            >
                <X className="size-4" aria-hidden="true" />
                Clear selection
            </Button>
        </div>
    );
}
