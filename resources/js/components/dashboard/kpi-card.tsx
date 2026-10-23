import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type KpiTone =
    | 'blue'
    | 'violet'
    | 'orange'
    | 'emerald'
    | 'teal'
    | 'amber'
    | 'red'
    | 'navy';

const toneClasses: Record<KpiTone, string> = {
    blue: 'text-[var(--tone-blue)]',
    violet: 'text-[var(--tone-violet)]',
    orange: 'text-[var(--tone-orange)]',
    emerald: 'text-[var(--tone-emerald)]',
    teal: 'text-[var(--teal)]',
    amber: 'text-[var(--amber)]',
    red: 'text-[var(--danger)]',
    navy: 'text-[var(--navy)]',
};

/** Tone-colored ground for the icon chip in `panel` variant. */
const toneChipClasses: Record<KpiTone, string> = {
    blue: 'bg-[var(--tone-blue)]/10 text-[var(--tone-blue)]',
    violet: 'bg-[var(--tone-violet)]/10 text-[var(--tone-violet)]',
    orange: 'bg-[var(--tone-orange)]/10 text-[var(--tone-orange)]',
    emerald: 'bg-[var(--tone-emerald)]/10 text-[var(--tone-emerald)]',
    teal: 'bg-[var(--teal)]/10 text-[var(--teal-ink)]',
    amber: 'bg-[var(--amber)]/15 text-[var(--navy)]',
    red: 'bg-[var(--danger-soft)] text-[var(--danger)]',
    navy: 'bg-[var(--surface-soft)] text-[var(--navy)]',
};

const numberFormat = new Intl.NumberFormat('en-US');

export type KpiCardProps = {
    label: string;
    /** Numbers are formatted with thousands separators. */
    value: number | string;
    caption?: string;
    icon: LucideIcon;
    tone?: KpiTone;
    /** Makes the whole card a link. */
    href?: string;
    /**
     * `panel` (console) tints the icon on a soft tone ground and lifts the
     * value, so the tile reads as a raised panel on the console's tinted
     * canvas. The default `flat` keeps the agency dashboard's tiles exactly
     * as they are.
     */
    variant?: 'flat' | 'panel';
    /** Renders a skeleton instead of the figures. */
    loading?: boolean;
    trend?: { value: string; direction: 'up' | 'down' | 'flat' };
    className?: string;
    'data-testid'?: string;
};

/**
 * Single KPI tile: label + tone-colored icon on top, a large tabular
 * value, then an optional caption and trend line. Feature-agnostic —
 * pair with `KpiGrid` for the standard four-across row.
 */
export function KpiCard({
    label,
    value,
    caption,
    icon: Icon,
    tone = 'navy',
    href,
    variant = 'flat',
    loading = false,
    trend,
    className,
    ...props
}: KpiCardProps) {
    const formatted =
        typeof value === 'number' ? numberFormat.format(value) : value;
    const panel = variant === 'panel';

    const body = (
        <>
            <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] leading-tight font-medium text-[var(--slate)]">
                    {label}
                </span>
                {panel ? (
                    <span
                        className={cn(
                            'flex size-7 shrink-0 items-center justify-center rounded-lg',
                            toneChipClasses[tone],
                        )}
                        aria-hidden="true"
                    >
                        <Icon className="size-4" />
                    </span>
                ) : (
                    <Icon
                        className={cn(
                            'size-[18px] shrink-0',
                            toneClasses[tone],
                        )}
                        aria-hidden="true"
                    />
                )}
            </div>
            {loading ? (
                <Skeleton className="h-7 w-20" aria-hidden="true" />
            ) : (
                <span className="font-serif text-[27px] leading-none font-bold tracking-tight text-[var(--navy-deep)] tabular-nums">
                    {formatted}
                </span>
            )}
            {(caption || trend) && (
                <div className="flex items-center gap-2">
                    {caption && (
                        <span className="text-xs text-[var(--slate)]/80">
                            {caption}
                        </span>
                    )}
                    {trend && (
                        <span
                            className={cn(
                                'inline-flex items-center gap-0.5 text-xs font-medium',
                                trend.direction === 'up'
                                    ? 'text-[var(--success)]'
                                    : trend.direction === 'down'
                                      ? 'text-[var(--danger)]'
                                      : 'text-[var(--slate)]',
                            )}
                        >
                            {trend.direction === 'up' ? (
                                <TrendingUp
                                    className="size-3"
                                    aria-hidden="true"
                                />
                            ) : trend.direction === 'down' ? (
                                <TrendingDown
                                    className="size-3"
                                    aria-hidden="true"
                                />
                            ) : null}
                            {trend.value}
                        </span>
                    )}
                </div>
            )}
        </>
    );

    const classes = cn(
        // The panel variant's icon chip is 28px tall where the flat icon is
        // 18px, so it needs the extra room: at 100px the content overflows
        // the 68px left after padding and the caption lands on the bottom
        // border. One height per variant avoids two conflicting utilities.
        //
        // `min-h`, not `h`: a figure like "SAR 2,500–3,200" wraps to two
        // lines, and a fixed height would push the caption past the border
        // again. Growing rather than truncating keeps the number readable,
        // and `KpiGrid` is a grid, so the row stretches to match — every
        // tile in a row stays the same height, with `justify-between`
        // pinning each caption to the bottom padding.
        panel ? 'min-h-[116px] shadow-sm' : 'h-[100px] shadow-xs',
        'flex flex-col justify-between gap-1.5 rounded-lg border border-[var(--line)] bg-white p-4',
        href && 'transition-colors hover:border-[var(--teal)]',
        className,
    );

    if (href && !loading) {
        return (
            <Link href={href} className={classes} {...props}>
                {body}
            </Link>
        );
    }

    return (
        <div className={classes} {...props}>
            {body}
        </div>
    );
}

/**
 * Responsive grid for KPI tiles: one column on mobile, two at `sm`,
 * four at `lg` by default.
 */
export function KpiGrid({
    columns = 4,
    children,
    className,
}: {
    columns?: 1 | 2 | 3 | 4;
    children: ReactNode;
    className?: string;
}) {
    const columnClasses: Record<typeof columns, string> = {
        1: '',
        2: 'sm:grid-cols-2',
        3: 'sm:grid-cols-2 lg:grid-cols-3',
        4: 'sm:grid-cols-2 lg:grid-cols-4',
    };

    return (
        <div
            className={cn(
                'grid grid-cols-1 gap-4',
                columnClasses[columns],
                className,
            )}
        >
            {children}
        </div>
    );
}
