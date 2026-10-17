import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PageHeaderAction = {
    label: string;
    /** Icon rendered left of the label. Defaults to `Plus`. */
    icon?: LucideIcon;
    href?: string;
    onClick?: () => void;
    /** Optional test id placed on the rendered button. */
    testId?: string;
};

type PageHeaderProps = {
    title: string;
    subtitle?: string;
    /** 'with-action' (default) shows the amber action button, 'plain' the title block only. */
    variant?: 'with-action' | 'plain';
    /** Primary action rendered as the amber button. Ignored when variant = 'plain' or `actions` is set. */
    action?: PageHeaderAction;
    /** Escape hatch for several buttons or custom controls (replaces `action`). */
    actions?: ReactNode;
    className?: string;
    'data-testid'?: string;
};

/**
 * Dashboard page heading. The title (Manrope, 32px, navy-deep) and an
 * optional subtitle sit on the left; the right slot is either a single
 * amber primary action, a custom `actions` node, or nothing (`plain`).
 * Below `sm` the right slot drops under the title.
 */
export function PageHeader({
    title,
    subtitle,
    variant = 'with-action',
    action,
    actions,
    className,
    ...props
}: PageHeaderProps) {
    const Icon = action?.icon ?? Plus;
    const showAction = variant !== 'plain' && !actions && action;

    return (
        <div
            className={cn(
                'flex flex-wrap items-center justify-between gap-4',
                className,
            )}
            {...props}
        >
            <div className="min-w-0">
                <h1 className="font-serif text-[32px] leading-tight font-bold tracking-[-0.02em] text-[var(--navy-deep)]">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-1 text-sm text-[var(--slate)]">
                        {subtitle}
                    </p>
                )}
            </div>
            {actions ??
                (showAction && action ? (
                    <Button
                        asChild
                        className="h-10 rounded-lg px-5 text-sm font-semibold"
                        data-testid={action.testId}
                    >
                        <Link
                            href={action.href ?? '#'}
                            onClick={action.onClick}
                        >
                            <Icon className="size-4" aria-hidden="true" />
                            {action.label}
                        </Link>
                    </Button>
                ) : null)}
        </div>
    );
}

/**
 * Legacy heading used by the other dashboard pages. Keeps the original
 * markup so those pages look exactly the same while they migrate to
 * `PageHeader`.
 */
export function DashboardPageHeader({
    title,
    subtitle,
    actions,
}: {
    title: string;
    subtitle: string;
    actions?: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
                <h1 className="font-serif text-2xl font-bold tracking-[-0.02em] text-[var(--navy)] sm:text-3xl">
                    {title}
                </h1>
                <p className="mt-1 text-sm text-[var(--slate)]">{subtitle}</p>
            </div>
            {actions && (
                <div className="flex flex-wrap items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}
