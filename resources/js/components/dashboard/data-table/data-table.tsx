import { Inbox } from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';
import { DashboardEmptyState } from '@/components/dashboard/empty-state';
import { SortableHead } from '@/components/dashboard/sortable-head';
import { DataTablePagination } from '@/components/dashboard/data-table/data-table-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { SortDirection } from '@/data/selectors';
import { cn } from '@/lib/utils';

export type DataTableAlign = 'left' | 'right' | 'center';

export type DataTableAccent = 'amber' | 'red' | 'teal' | 'navy' | 'neutral';

export type Column<T> = {
    key: string;
    /** Plain text; sortable columns pass it to an aria-sort header. */
    header: string;
    cell: (row: T) => ReactNode;
    align?: DataTableAlign;
    /** Any CSS width, e.g. '22%' or 'w-[140px]' via `className`. */
    width?: string;
    className?: string;
    headerClassName?: string;
    /** Renders a sortable header; requires the `sort` prop. */
    sortable?: boolean;
};

const accentClasses: Record<DataTableAccent, string> = {
    amber: 'bg-[var(--amber)]',
    red: 'bg-[var(--danger)]',
    teal: 'bg-[var(--teal)]',
    navy: 'bg-[var(--navy)]',
    neutral: 'bg-[var(--neutral-dot)]',
};

const alignClasses: Record<DataTableAlign, string> = {
    left: 'text-left',
    right: 'text-right',
    center: 'text-center',
};

const headerClasses =
    'h-[50px] border-y border-[var(--line)] bg-[var(--surface-soft)]/50 px-4 text-[11px] font-semibold tracking-[0.06em] text-[var(--slate)] uppercase';

type DataTablePaginationOptions = {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    getPageHref?: (page: number) => string;
    alwaysShow?: boolean;
    label?: string;
    testIdPrefix?: string;
};

type DataTableProps<T> = {
    columns: Column<T>[];
    data: T[];
    getRowId: (row: T) => string;
    /** Optional `data-testid` for each body row, supplied by the caller. */
    getRowTestId?: (row: T) => string;
    /** Left accent bar color per row, rendered inside the first cell. */
    getRowAccent?: (row: T) => DataTableAccent | undefined;
    /** Renders the trailing actions cell (usually a dropdown menu). */
    renderRowActions?: (row: T) => ReactNode;
    onRowClick?: (row: T) => void;
    /** Toolbar row rendered inside the card, above the table. */
    toolbar?: ReactNode;
    pagination?: DataTablePaginationOptions;
    /** Column-header sorting; driven by a select when header labels stay static. */
    sort?: {
        field: string | null;
        direction: SortDirection;
        onSort: (field: string) => void;
    };
    loading?: boolean;
    emptyState?: ReactNode;
    className?: string;
    'data-testid'?: string;
};

/**
 * Generic card-wrapped data table: optional toolbar on top, header row,
 * body rows (with an optional accent bar in the first cell and a trailing
 * actions cell), skeleton rows while loading, an empty state inside the
 * card and an optional pagination strip. Feature-agnostic — no data
 * imports; everything comes through props.
 */
export function DataTable<T>({
    columns,
    data,
    getRowId,
    getRowTestId,
    getRowAccent,
    renderRowActions,
    onRowClick,
    toolbar,
    pagination,
    sort,
    loading = false,
    emptyState,
    className,
    ...props
}: DataTableProps<T>) {
    const columnCount = columns.length + (renderRowActions ? 1 : 0);

    const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
        }
    };

    return (
        <div
            className={cn(
                'overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-xs',
                className,
            )}
        >
            {toolbar}

            <Table
                className="min-w-[760px]"
                aria-busy={loading || undefined}
                data-testid={props['data-testid']}
            >
                <colgroup>
                    {columns.map((column) => (
                        <col
                            key={column.key}
                            style={
                                column.width
                                    ? { width: column.width }
                                    : undefined
                            }
                        />
                    ))}
                    {renderRowActions && <col style={{ width: '6%' }} />}
                </colgroup>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        {columns.map((column) =>
                            column.sortable && sort ? (
                                <SortableHead
                                    key={column.key}
                                    field={column.key}
                                    label={column.header}
                                    activeField={sort.field}
                                    direction={sort.direction}
                                    onSort={sort.onSort}
                                    align={
                                        column.align === 'right'
                                            ? 'right'
                                            : 'left'
                                    }
                                    className={cn(
                                        headerClasses,
                                        column.headerClassName,
                                    )}
                                />
                            ) : (
                                <TableHead
                                    key={column.key}
                                    scope="col"
                                    className={cn(
                                        headerClasses,
                                        alignClasses[column.align ?? 'left'],
                                        column.headerClassName,
                                    )}
                                >
                                    {column.header}
                                </TableHead>
                            ),
                        )}
                        {renderRowActions && (
                            <TableHead scope="col" className={headerClasses}>
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading &&
                        Array.from({ length: 5 }).map((_, index) => (
                            <TableRow key={`skeleton-${index}`}>
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.key}
                                        className="h-[74px] px-4"
                                    >
                                        <Skeleton className="h-4 w-3/4" />
                                    </TableCell>
                                ))}
                                {renderRowActions && (
                                    <TableCell className="px-4">
                                        <Skeleton className="size-4" />
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}

                    {!loading &&
                        data.map((row) => {
                            const accent = getRowAccent?.(row) ?? undefined;

                            return (
                                <TableRow
                                    key={getRowId(row)}
                                    data-testid={getRowTestId?.(row)}
                                    className={cn(
                                        'border-[var(--line)] hover:bg-[var(--cream)]/60',
                                        onRowClick && 'cursor-pointer',
                                    )}
                                    tabIndex={onRowClick ? 0 : undefined}
                                    onClick={
                                        onRowClick
                                            ? () => onRowClick(row)
                                            : undefined
                                    }
                                    onKeyDown={
                                        onRowClick
                                            ? handleRowKeyDown
                                            : undefined
                                    }
                                >
                                    {columns.map((column, index) => {
                                        const content = column.cell(row);

                                        return (
                                            <TableCell
                                                key={column.key}
                                                className={cn(
                                                    'px-4 py-3.5',
                                                    alignClasses[
                                                        column.align ?? 'left'
                                                    ],
                                                    column.className,
                                                )}
                                            >
                                                {index === 0 && accent ? (
                                                    <div className="flex items-start gap-3">
                                                        <span
                                                            className={cn(
                                                                'mt-0.5 h-5 w-1 shrink-0 rounded-full',
                                                                accentClasses[
                                                                    accent
                                                                ],
                                                            )}
                                                            aria-hidden="true"
                                                        />
                                                        <div className="min-w-0">
                                                            {content}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    content
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                    {renderRowActions && (
                                        <TableCell className="px-4 text-right">
                                            {renderRowActions(row)}
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}

                    {!loading && data.length === 0 && (
                        <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={columnCount} className="p-0">
                                {emptyState ?? (
                                    <DashboardEmptyState
                                        icon={Inbox}
                                        title="Nothing here yet"
                                        message="There is no data to show right now."
                                    />
                                )}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {pagination && (
                <DataTablePagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={pagination.onPageChange}
                    getPageHref={pagination.getPageHref}
                    alwaysShow={pagination.alwaysShow}
                    label={pagination.label}
                    testIdPrefix={pagination.testIdPrefix}
                    className="border-t border-[var(--line)]"
                />
            )}
        </div>
    );
}
