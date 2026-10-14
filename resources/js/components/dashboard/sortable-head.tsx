import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SortDirection } from '@/data/selectors';

type SortableHeadProps<TField extends string> = {
    field: TField;
    label: string;
    activeField: TField | null;
    direction: SortDirection;
    onSort: (field: TField) => void;
    align?: 'left' | 'right';
    className?: string;
};

/**
 * A table header that toggles sorting. The active column shows a
 * solid arrow plus stronger text, inactive columns reveal a muted
 * arrow on hover, and aria-sort carries the state for screen readers.
 */
export function SortableHead<TField extends string>({
    field,
    label,
    activeField,
    direction,
    onSort,
    align = 'left',
    className,
}: SortableHeadProps<TField>) {
    const isActive = activeField === field;
    const ariaSort = isActive
        ? direction === 'asc'
            ? 'ascending'
            : 'descending'
        : 'none';

    return (
        <TableHead
            aria-sort={ariaSort}
            className={cn(align === 'right' && 'text-right', className)}
        >
            <button
                type="button"
                onClick={() => onSort(field)}
                className={cn(
                    'inline-flex items-center gap-1 rounded-sm uppercase transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none',
                    align === 'right' && 'flex-row-reverse',
                    isActive ? 'text-[var(--navy)]' : 'text-muted-foreground',
                )}
                data-testid={`sort-${field}`}
            >
                {label}
                {isActive ? (
                    direction === 'asc' ? (
                        <ArrowUp className="size-3.5" aria-hidden="true" />
                    ) : (
                        <ArrowDown className="size-3.5" aria-hidden="true" />
                    )
                ) : (
                    <ArrowUpDown
                        className="size-3.5 opacity-40 transition-opacity group-hover:opacity-70 sm:opacity-0 sm:group-hover:opacity-70"
                        aria-hidden="true"
                    />
                )}
            </button>
        </TableHead>
    );
}
