import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Row-level `…` menu furniture.
 *
 * Split from `inline-list-row` so table screens and pane screens share the
 * exact same trigger and spacing rather than growing two lookalikes. The
 * trigger keeps the literal `⋯` glyph instead of a lucide icon so the two
 * stay visually identical at every size.
 */
export function RowMenu({
    children,
    label = 'More actions',
    testId = 'row-menu',
}: {
    children: ReactNode;
    label?: string;
    testId?: string;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={label}
                    data-testid={testId}
                    className="size-8 shrink-0 rounded-md text-[var(--slate)] hover:text-[var(--navy)]"
                >
                    <span aria-hidden="true" className="text-base leading-none">
                        ⋯
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
                {children}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export type SystemRowAction = {
    label: string;
    icon: LucideIcon;
    onSelect: () => void;
    testId?: string;
    /** Rendered in the danger tone and grouped after a separator. */
    destructive?: boolean;
    /**
     * One line of consequence shown above the first destructive action.
     * Defaults to the console-wide archive wording.
     */
    hint?: string;
};

/**
 * Declarative `…` menu for a table row: safe actions first, then a separator,
 * a one-line explanation, and the destructive action last.
 *
 * Destructive actions in the console are always *archive* — the word "Delete"
 * is not offered anywhere, because nothing here is deleted.
 */
export function SystemRowMenu({
    actions,
    label = 'More actions',
    testId = 'row-menu',
}: {
    actions: SystemRowAction[];
    label?: string;
    testId?: string;
}) {
    const safe = actions.filter((action) => !action.destructive);
    const destructive = actions.filter((action) => action.destructive);
    const firstDestructive = destructive[0];

    return (
        <RowMenu label={label} testId={testId}>
            {safe.map((action) => {
                const Icon = action.icon;

                return (
                    <DropdownMenuItem
                        key={action.label}
                        onSelect={action.onSelect}
                        data-testid={
                            action.testId ??
                            `menu-${action.label.toLowerCase()}`
                        }
                    >
                        <Icon className="size-4" aria-hidden="true" />
                        {action.label}
                    </DropdownMenuItem>
                );
            })}

            {firstDestructive && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[11px] text-[var(--slate)]">
                        {firstDestructive.hint ??
                            'Archive stops it appearing in pickers'}
                    </DropdownMenuLabel>
                    {destructive.map((action) => {
                        const Icon = action.icon;

                        return (
                            <DropdownMenuItem
                                key={action.label}
                                onSelect={action.onSelect}
                                data-testid={
                                    action.testId ??
                                    `menu-${action.label.toLowerCase()}`
                                }
                                className="text-[var(--danger)] focus:text-[var(--danger)]"
                            >
                                <Icon className="size-4" aria-hidden="true" />
                                {action.label}
                            </DropdownMenuItem>
                        );
                    })}
                </>
            )}
        </RowMenu>
    );
}
