import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared wrapper for dashboard pages: keeps the content away from the
 * edges of the sidebar inset and keeps the vertical rhythm consistent.
 */
export function DashboardPage({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col gap-6 px-4 py-4 md:px-6', className)}>
            {children}
        </div>
    );
}
