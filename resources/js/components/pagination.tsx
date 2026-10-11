import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export type PageItem = number | 'ellipsis';

/**
 * The compact page list used by the directory and the profile tabs: 1 … 4 5 6 … 9.
 */
export function getPageItems(page: number, totalPages: number): PageItem[] {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const items: PageItem[] = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    if (start > 2) {
        items.push('ellipsis');
    }

    for (let current = start; current <= end; current += 1) {
        items.push(current);
    }

    if (end < totalPages - 1) {
        items.push('ellipsis');
    }

    items.push(totalPages);

    return items;
}

type PageControlProps = {
    target: number;
    active?: boolean;
    disabled?: boolean;
    ariaLabel: string;
    testId: string;
    getPageHref?: (page: number) => string;
    onPageChange?: (page: number) => void;
    children: ReactNode;
};

function PageControl({
    target,
    active = false,
    disabled = false,
    ariaLabel,
    testId,
    getPageHref,
    onPageChange,
    children,
}: PageControlProps) {
    const className = active ? 'current' : undefined;
    const ariaCurrent = active ? 'page' : undefined;

    if (getPageHref) {
        return (
            <Link
                href={getPageHref(target)}
                preserveScroll
                className={className}
                aria-label={ariaLabel}
                aria-current={ariaCurrent}
                aria-disabled={disabled || undefined}
                data-testid={testId}
            >
                {children}
            </Link>
        );
    }

    return (
        <button
            type="button"
            className={className}
            aria-label={ariaLabel}
            aria-current={ariaCurrent}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            data-testid={testId}
            onClick={disabled ? undefined : () => onPageChange?.(target)}
        >
            {children}
        </button>
    );
}

type PaginationProps = {
    page: number;
    totalPages: number;
    label: string;
    /** Renders previous/next as Inertia links instead of buttons. */
    getPageHref?: (page: number) => string;
    onPageChange?: (page: number) => void;
    testIdPrefix?: string;
};

/**
 * Shared pagination control. Renders nothing for a single page.
 */
export function Pagination({
    page,
    totalPages,
    label,
    getPageHref,
    onPageChange,
    testIdPrefix = 'pagination',
}: PaginationProps) {
    if (totalPages <= 1) {
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
    ) => (
        <PageControl
            key={key}
            target={target}
            active={options.active}
            disabled={options.disabled}
            ariaLabel={ariaLabel}
            testId={testId}
            getPageHref={getPageHref}
            onPageChange={onPageChange}
        >
            {content}
        </PageControl>
    );

    return (
        <nav className="agency-pagination" aria-label={label}>
            <div className="agency-pagination-desktop">
                {control(
                    page - 1,
                    'prev',
                    'Previous page',
                    `${testIdPrefix}-prev`,
                    <ChevronLeft size={16} aria-hidden="true" />,
                    { disabled: isFirst },
                )}
                {items.map((item, index) =>
                    item === 'ellipsis' ? (
                        <span aria-hidden="true" key={`ellipsis-${index}`}>
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
                    <ChevronRight size={16} aria-hidden="true" />,
                    { disabled: isLast },
                )}
            </div>
            <div className="agency-pagination-mobile">
                {control(
                    page - 1,
                    'prev-mobile',
                    'Previous page',
                    `${testIdPrefix}-prev-mobile`,
                    <>
                        <ChevronLeft size={16} aria-hidden="true" /> Previous
                    </>,
                    { disabled: isFirst },
                )}
                <span>
                    Page {page} of {totalPages}
                </span>
                {control(
                    page + 1,
                    'next-mobile',
                    'Next page',
                    `${testIdPrefix}-next-mobile`,
                    <>
                        Next <ChevronRight size={16} aria-hidden="true" />
                    </>,
                    { disabled: isLast },
                )}
            </div>
        </nav>
    );
}
