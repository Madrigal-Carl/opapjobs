import type { ReactNode } from 'react';

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
