import type { ReactNode } from 'react';

/**
 * Shared wrapper for dashboard pages: keeps the content away from the
 * edges of the sidebar inset and keeps the vertical rhythm consistent.
 */
export function DashboardPage({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-col gap-6 px-4 py-4 md:px-6">{children}</div>
    );
}
