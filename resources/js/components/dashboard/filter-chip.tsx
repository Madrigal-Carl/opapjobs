import { X } from 'lucide-react';

type FilterChipProps = {
    label: string;
    value: string;
    onRemove: () => void;
    testId?: string;
};

/**
 * A single removable filter. Showing the active filters as chips makes
 * the current state obvious and lets one filter be dropped without
 * touching the others.
 */
export function FilterChip({
    label,
    value,
    onRemove,
    testId,
}: FilterChipProps) {
    return (
        <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove filter: ${label} ${value}`}
            className="inline-flex max-w-56 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] py-1 pr-1.5 pl-3 text-xs text-[var(--navy)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-light)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
            data-testid={testId}
        >
            <span className="truncate">
                <span className="text-[var(--slate)]">{label}:</span>{' '}
                <span className="font-medium">{value}</span>
            </span>
            <span
                className="inline-flex size-4 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--teal)] hover:text-white"
                aria-hidden="true"
            >
                <X className="size-3" />
            </span>
        </button>
    );
}
