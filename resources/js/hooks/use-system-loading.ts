import { useEffect, useState } from 'react';

/**
 * First-load gate for a Super Admin console list screen.
 *
 * The console reads from an in-memory store, so there is no network wait to
 * hide behind — but a table that snaps into existence on mount reads as a
 * glitch rather than as a screen. Holding `loading` for one short beat gives
 * `DataTable` time to paint its skeleton rows first, which is the ~400ms
 * first-load skeleton used everywhere else in the app.
 *
 * The timer is cleared on unmount so a quick navigation away cannot call
 * `setState` on a dead component.
 */
export function useSystemLoading(delayMs = 400): boolean {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = window.setTimeout(() => setLoading(false), delayMs);

        return () => window.clearTimeout(timer);
    }, [delayMs]);

    return loading;
}
