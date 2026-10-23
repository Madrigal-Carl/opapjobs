import type { ReactNode } from 'react';
import { DashboardPage } from '@/components/dashboard/page';
import { cn } from '@/lib/utils';

/**
 * Content wrapper for every console screen.
 *
 * It exists because the console sits on white cards over a white canvas —
 * the 1px `--line` border is the only thing separating a KPI tile, the
 * filter panel and the table from the page behind them, so nothing reads
 * as raised. Tinting the canvas with the existing `--surface-soft` token
 * gives those white panels something to sit on.
 *
 * It only wraps the shared `DashboardPage` rather than restyling it: the
 * agency dashboard keeps the white canvas, and this file is the single
 * place the console's canvas is decided.
 */
export function SystemPage({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <DashboardPage
            className={cn('min-h-full bg-[var(--surface-soft)]', className)}
        >
            {children}
        </DashboardPage>
    );
}
