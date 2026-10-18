import type { LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardTitle,
} from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

type FormSectionProps = {
    step: number;
    title: string;
    description: string;
    icon: LucideIcon;
    /** Lets the user fold the section away once it is done. */
    collapsible?: boolean;
    defaultOpen?: boolean;
    children: ReactNode;
    className?: string;
    optional?: boolean;
    headerAction?: ReactNode;
};

/**
 * A numbered step in the post-a-job form. Sections can be collapsed
 * to keep the long form scannable.
 */
export function FormSection({
    step,
    title,
    description,
    icon: Icon,
    collapsible = false,
    defaultOpen = true,
    children,
    className,
    optional = false,
    headerAction,
}: FormSectionProps) {
    const [open, setOpen] = useState(defaultOpen);

    const content = (
        <CardContent className="mt-4 flex flex-col gap-5 border-t border-[var(--line)] px-0 pt-4">
            {children}
        </CardContent>
    );

    const header = (
        <div className="flex flex-wrap items-start gap-3">
            <span
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)] text-xs font-semibold text-[var(--navy)] tabular-nums"
                aria-hidden="true"
            >
                {step}
            </span>
            <div className="min-w-0 flex-1">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base font-semibold text-[var(--navy)]">
                    <Icon
                        className="size-4 text-[var(--slate)]"
                        aria-hidden="true"
                    />
                    {title}
                    {optional && (
                        <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--slate)] uppercase">
                            Optional
                        </span>
                    )}
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-[var(--slate)]">
                    {description}
                </CardDescription>
            </div>
            {headerAction && (
                <div className="ml-auto self-center">{headerAction}</div>
            )}
        </div>
    );

    if (!collapsible) {
        return (
            <Card
                className={cn(
                    'gap-0 rounded-xl border-[var(--line)] bg-white p-5 shadow-sm',
                    className,
                )}
                data-testid={`section-${step}`}
            >
                {header}
                {content}
            </Card>
        );
    }

    return (
        <Card
            className={cn(
                'gap-0 rounded-xl border-[var(--line)] bg-white p-5 shadow-sm',
                className,
            )}
        >
            <Collapsible
                open={open}
                onOpenChange={setOpen}
                data-testid={`section-${step}`}
            >
                {header}
                <CollapsibleTrigger
                    className="mt-3 flex items-center gap-2 rounded-md text-xs text-[var(--slate)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40"
                    data-testid={`section-trigger-${step}`}
                >
                    {open ? 'Collapse section' : 'Expand section'}
                    <ChevronDown
                        className={cn('size-4', open && 'rotate-180')}
                        aria-hidden="true"
                    />
                </CollapsibleTrigger>
                <CollapsibleContent>{content}</CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
