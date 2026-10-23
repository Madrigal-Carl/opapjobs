import { Link, type InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { SuperAdminChip } from '@/components/system/super-admin-chip';
import { Button } from '@/components/ui/button';

export type SystemPageAction = {
    label: string;
    icon?: LucideIcon;
    /** Route helper; renders a prefetched Inertia link. */
    href?: NonNullable<InertiaLinkProps['href']>;
    /** Used when the action opens a dialog or a stepper in place. */
    onClick?: () => void;
    testId?: string;
};

type SystemPageHeaderProps = {
    title: string;
    subtitle?: string;
    /** The amber primary action. Omit on screens with nothing to create. */
    action?: SystemPageAction;
    /** Secondary controls placed between the chip and the primary action. */
    actions?: ReactNode;
    'data-testid'?: string;
};

/**
 * Page heading for every console screen: the record name, one line saying
 * what the screen is for, the teal SUPER ADMIN chip, and the amber action.
 *
 * It exists because `PageHeader` treats `actions` as a full replacement for
 * `action`, and every console screen needs *both* the chip and the action
 * button. Building the row here keeps the chip in the same place on all
 * thirteen screens instead of each one restating it.
 */
export function SystemPageHeader({
    title,
    subtitle,
    action,
    actions,
    'data-testid': testId,
}: SystemPageHeaderProps) {
    const Icon = action?.icon ?? Plus;

    const primary =
        action === undefined ? null : action.href !== undefined ? (
            <Button
                asChild
                className="h-10 rounded-lg px-5 text-sm font-semibold"
                data-testid={action.testId}
            >
                <Link href={action.href}>
                    <Icon className="size-4" aria-hidden="true" />
                    {action.label}
                </Link>
            </Button>
        ) : (
            <Button
                type="button"
                variant="primary"
                className="h-10 rounded-lg px-5 text-sm font-semibold"
                onClick={action.onClick}
                data-testid={action.testId}
            >
                <Icon className="size-4" aria-hidden="true" />
                {action.label}
            </Button>
        );

    return (
        <div className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm md:p-5">
            <PageHeader
                title={title}
                subtitle={subtitle}
                data-testid={testId}
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <SuperAdminChip />
                        {actions}
                        {primary}
                    </div>
                }
            />
        </div>
    );
}
