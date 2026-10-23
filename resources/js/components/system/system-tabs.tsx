import { cn } from '@/lib/utils';

export type SystemTabEntry = {
    id: string;
    label: string;
};

/**
 * Section switcher for the console's detail screens (Agencies, Job posts,
 * Applicants all need one).
 *
 * The three screens each carried their own copy of this strip, and each one
 * signalled the active tab with a white pill on a grey ground — the one
 * indicator that tells you where you are was the faintest thing on screen.
 * The active tab now takes the console's teal (`--teal-light` ground with
 * `--teal-ink` text), so selection reads at a glance and matches the
 * SUPER ADMIN chip.
 *
 * It is a real ARIA tablist: `role="tab"` buttons with `aria-selected`, and
 * the container labelled per screen. Tab panels stay the caller's job —
 * they carry the ids and `aria-labelledby` the pages already set up.
 */
export function SystemTabs({
    tabs,
    value,
    onChange,
    ariaLabel,
    testIdPrefix,
    'data-testid': testId,
    className,
}: {
    /** `readonly` so the page-level `TABS` consts fit without a spread. */
    tabs: readonly SystemTabEntry[];
    value: string;
    onChange: (next: string) => void;
    ariaLabel: string;
    /** e.g. `agency` renders `tab-agency-overview`. */
    testIdPrefix: string;
    /** Container testid, e.g. `agency-tabs`. */
    'data-testid'?: string;
    className?: string;
}) {
    return (
        <div
            role="tablist"
            aria-label={ariaLabel}
            data-testid={testId}
            className={cn(
                'flex flex-wrap gap-1 rounded-lg border border-[var(--line)] bg-white p-1',
                className,
            )}
        >
            {tabs.map((entry) => {
                const active = entry.id === value;

                return (
                    <button
                        key={entry.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(entry.id)}
                        data-testid={`tab-${testIdPrefix}-${entry.id}`}
                        className={cn(
                            'rounded-md px-3.5 py-1.5 text-sm font-medium motion-safe:transition-colors',
                            'focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none',
                            active
                                ? 'bg-[var(--teal-light)] text-[var(--teal-ink)]'
                                : 'text-[var(--slate)] hover:bg-[var(--surface-soft)] hover:text-[var(--navy)]',
                        )}
                    >
                        {entry.label}
                    </button>
                );
            })}
        </div>
    );
}
