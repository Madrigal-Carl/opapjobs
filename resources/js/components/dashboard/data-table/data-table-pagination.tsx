import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { getPageItems } from '@/components/pagination';
import { cn } from '@/lib/utils';

type DataTablePaginationProps = {
    page: number;
    totalPages: number;
    onPageChange?: (page: number) => void;
    /** Renders the controls as Inertia links instead of buttons. */
    getPageHref?: (page: number) => string;
    /** Keeps the control visible even when everything fits on one page. */
    alwaysShow?: boolean;
    label?: string;
    testIdPrefix?: string;
    className?: string;
};

const controlClasses =
    'flex size-8 items-center justify-center rounded-md border border-[var(--line)] bg-white text-sm font-medium text-[var(--navy)] transition-colors hover:bg-[var(--surface-soft)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none disabled:pointer-events-none disabled:text-[var(--neutral-dot)]';

const activeClasses =
    'border-[var(--navy-deep)] bg-[var(--navy-deep)] text-white hover:bg-[var(--navy-deep)]';

/**
 * Centered pagination strip for a dashboard table card: 32x32 buttons
 * with the current page filled navy-deep. Restyles `getPageItems` with
 * Tailwind only, so the public agency directory keeps the
 * `.agency-pagination` look from the shared `Pagination`.
 */
export function DataTablePagination({
    page,
    totalPages,
    onPageChange,
    getPageHref,
    alwaysShow = false,
    label = 'Pagination',
    testIdPrefix = 'pagination',
    className,
}: DataTablePaginationProps) {
    if (totalPages <= 1 && !alwaysShow) {
        return null;
    }

    const items = getPageItems(page, totalPages);
    const isFirst = page <= 1;
    const isLast = page >= totalPages;

    const control = (
        target: number,
        key: string,
        ariaLabel: string,
        testId: string,
        content: ReactNode,
        options: { active?: boolean; disabled?: boolean } = {},
    ) => {
        const classes = cn(
            controlClasses,
            options.active && activeClasses,
            options.disabled && 'opacity-60',
        );

        if (getPageHref && !options.disabled) {
            return (
                <Link
                    key={key}
                    href={getPageHref(target)}
                    preserveScroll
                    className={classes}
                    aria-label={ariaLabel}
                    aria-current={options.active ? 'page' : undefined}
                    data-testid={testId}
                >
                    {content}
                </Link>
            );
        }

        return (
            <button
                key={key}
                type="button"
                className={classes}
                aria-label={ariaLabel}
                aria-current={options.active ? 'page' : undefined}
                disabled={options.disabled}
                data-testid={testId}
                onClick={
                    options.disabled ? undefined : () => onPageChange?.(target)
                }
            >
                {content}
            </button>
        );
    };

    return (
        <nav
            className={cn(
                'flex items-center justify-center gap-1.5 px-5 py-4',
                className,
            )}
            aria-label={label}
        >
            {control(
                page - 1,
                'prev',
                'Previous page',
                `${testIdPrefix}-prev`,
                <ChevronLeft className="size-4" aria-hidden="true" />,
                { disabled: isFirst },
            )}
            {items.map((item, index) =>
                item === 'ellipsis' ? (
                    <span
                        key={`ellipsis-${index}`}
                        className="px-1 text-[var(--slate)]"
                        aria-hidden="true"
                    >
                        …
                    </span>
                ) : (
                    control(
                        item,
                        `page-${item}`,
                        `Page ${item}`,
                        `${testIdPrefix}-${item}`,
                        item,
                        { active: item === page },
                    )
                ),
            )}
            {control(
                page + 1,
                'next',
                'Next page',
                `${testIdPrefix}-next`,
                <ChevronRight className="size-4" aria-hidden="true" />,
                { disabled: isLast },
            )}
        </nav>
    );
}
