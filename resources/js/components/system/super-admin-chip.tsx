import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Persistent marker that this console edits every Agency, not just its own
 * (spec §5.10). Space Mono, uppercase, teal — the same eyebrow treatment the
 * sidebar group labels use, so it reads as system chrome rather than content.
 */
export function SuperAdminChip({ className }: { className?: string }) {
    return (
        <span
            data-testid="super-admin-chip"
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-[var(--teal)] bg-[var(--teal-light)] px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.12em] text-[var(--teal-ink)] uppercase',
                className,
            )}
        >
            <ShieldCheck className="size-3" aria-hidden="true" />
            Super admin
        </span>
    );
}
