import type { ReactNode } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type ConfirmDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    /** One line naming the record so the user knows what is affected. */
    description: string;
    /** Concrete consequences with counts. Rendered as a bulleted list. */
    consequences?: string[];
    /** Extra content between the description and the buttons. */
    children?: ReactNode;
    confirmLabel: string;
    cancelLabel?: string;
    /** Destructive actions use the red confirm button; everything else amber. */
    destructive?: boolean;
    onConfirm: () => void;
    busy?: boolean;
    'data-testid'?: string;
};

/**
 * Impact-before-action confirmation (spec §5.5). Always states the concrete
 * consequence — with counts where they matter — rather than a generic
 * "Are you sure?", and names the primary action in the user's words.
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    consequences,
    children,
    confirmLabel,
    cancelLabel = 'Cancel',
    destructive = false,
    onConfirm,
    busy = false,
    'data-testid': testId,
}: ConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg" data-testid={testId}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                {consequences && consequences.length > 0 && (
                    <ul className="flex flex-col gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--navy)]">
                        {consequences.map((consequence) => (
                            <li key={consequence} className="flex gap-2">
                                <span
                                    aria-hidden="true"
                                    className="mt-2 size-1 shrink-0 rounded-full bg-[var(--teal)]"
                                />
                                <span>{consequence}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {children}

                <DialogFooter>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                        disabled={busy}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        variant={destructive ? 'destructive' : 'primary'}
                        onClick={onConfirm}
                        disabled={busy}
                        aria-busy={busy}
                        data-testid="confirm-dialog-confirm"
                    >
                        {busy && <Spinner className="size-4" />}
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
