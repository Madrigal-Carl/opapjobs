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
}: FormSectionProps) {
    const [open, setOpen] = useState(defaultOpen);

    const content = (
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
    );

    const header = (
        <div className="flex items-start gap-3">
            <span
                className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-soft)] text-xs font-semibold text-[var(--navy)] tabular-nums"
                aria-hidden="true"
            >
                {step}
            </span>
            <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Icon
                        className="size-4 text-[var(--slate)]"
                        aria-hidden="true"
                    />
                    {title}
                </CardTitle>
                <CardDescription className="mt-1">
                    {description}
                </CardDescription>
            </div>
        </div>
    );

    if (!collapsible) {
        return (
            <Card className={className}>
                <div className="px-6 pt-6">{header}</div>
                {content}
            </Card>
        );
    }

    return (
        <Card className={className}>
            <Collapsible
                open={open}
                onOpenChange={setOpen}
                data-testid={`section-${step}`}
            >
                <CollapsibleTrigger
                    className="w-full cursor-pointer rounded-xl px-6 pt-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 [&[data-state=open]>div>svg]:rotate-180"
                    data-testid={`section-trigger-${step}`}
                >
                    {header}
                    <ChevronDown
                        className="absolute right-6 mt-1 size-4 text-[var(--slate)] transition-transform"
                        aria-hidden="true"
                    />
                </CollapsibleTrigger>
                <CollapsibleContent>{content}</CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
