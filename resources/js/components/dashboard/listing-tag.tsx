import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const tones = {
    teal: 'border-transparent bg-[var(--teal-light)] text-[#1f6f66]',
    neutral:
        'border-[var(--line)] bg-[var(--surface-soft)] text-[var(--slate)]',
    danger: 'border-[#f5c6c0] bg-[#fdecea] text-[#c0392b]',
};

/** Applicant-preview tag, deliberately separate from dashboard table badges. */
export function ListingTag({
    tone,
    icon: Icon,
    children,
}: {
    tone: keyof typeof tones;
    icon?: LucideIcon;
    children: ReactNode;
}) {
    return (
        <Badge
            variant="outline"
            className={cn(
                'gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide uppercase',
                tones[tone],
            )}
        >
            {Icon && <Icon className="size-3" aria-hidden="true" />}
            {children}
        </Badge>
    );
}
