import { RefreshCw, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type DataTableToolbarProps = {
    children: ReactNode;
    className?: string;
    'data-testid'?: string;
};

/**
 * Filter row above a `DataTable`: fields sit on the bottom edge with a
 * 16px gap and wrap onto further rows on narrow screens. Put the reset
 * / refresh control last with `ml-auto` to pin it to the far right.
 */
export function DataTableToolbar({
    children,
    className,
    ...props
}: DataTableToolbarProps) {
    return (
        <div
            className={cn(
                'flex flex-wrap items-end gap-4 border-b border-[var(--line)] px-5 py-4',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

type DataTableFieldProps = {
    /** Uppercase micro-label rendered above the control. */
    label: string;
    htmlFor?: string;
    className?: string;
    children: ReactNode;
};

/** A labelled control inside a `DataTableToolbar`. */
export function DataTableField({
    label,
    htmlFor,
    className,
    children,
}: DataTableFieldProps) {
    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <label
                htmlFor={htmlFor}
                className="text-[11px] font-semibold tracking-[0.06em] text-[var(--slate)] uppercase"
            >
                {label}
            </label>
            {children}
        </div>
    );
}

type DataTableSearchProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    id?: string;
    className?: string;
    'data-testid'?: string;
};

/** Search input with an inline magnifier icon. */
export function DataTableSearch({
    value,
    onChange,
    placeholder,
    id,
    className,
    ...props
}: DataTableSearchProps) {
    return (
        <div className={cn('relative', className)}>
            <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--slate)]"
                aria-hidden="true"
            />
            <Input
                id={id}
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                className="h-10 rounded-lg pr-4 pl-9 text-sm shadow-none"
                {...props}
            />
        </div>
    );
}

export type DataTableSelectOption = {
    value: string;
    label: string;
};

type DataTableSelectProps<T extends string> = {
    value: T;
    onValueChange: (value: T) => void;
    options: DataTableSelectOption[];
    ariaLabel: string;
    id?: string;
    className?: string;
    'data-testid'?: string;
};

/** Fixed-width select used for toolbar filters. */
export function DataTableSelect<T extends string>({
    value,
    onValueChange,
    options,
    ariaLabel,
    id,
    className,
    ...props
}: DataTableSelectProps<T>) {
    return (
        <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger
                id={id}
                aria-label={ariaLabel}
                className={cn(
                    'h-10 w-40 rounded-lg bg-white text-sm font-medium shadow-none',
                    className,
                )}
                {...props}
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

type DataTableRefreshButtonProps = {
    onClick: () => void;
    /** Spins the icon briefly, e.g. while the query re-runs. */
    spinning?: boolean;
    className?: string;
    'data-testid'?: string;
};

/** 40x40 outlined icon button that resets the toolbar filters. */
export function DataTableRefreshButton({
    onClick,
    spinning = false,
    className,
    ...props
}: DataTableRefreshButtonProps) {
    return (
        <Button
            variant="secondary"
            size="icon"
            onClick={onClick}
            aria-label="Reset filters and refresh"
            className={cn('size-10 rounded-lg text-[var(--slate)]', className)}
            {...props}
        >
            <RefreshCw
                className={cn('size-4', spinning && 'animate-spin')}
                aria-hidden="true"
            />
        </Button>
    );
}
