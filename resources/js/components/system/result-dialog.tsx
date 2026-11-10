import { CircleCheck, CircleX } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type ResultDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    variant: 'success' | 'error';
    title: string;
    description: string;
    closeLabel?: string;
    onCloseAutoFocus?: ComponentProps<typeof DialogContent>['onCloseAutoFocus'];
};

export function ResultDialog({
    open,
    onOpenChange,
    variant,
    title,
    description,
    closeLabel = 'Close',
    onCloseAutoFocus,
}: ResultDialogProps) {
    const Icon = variant === 'success' ? CircleCheck : CircleX;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-h-[calc(100dvh-2rem)] overflow-y-auto motion-reduce:animate-none"
                onCloseAutoFocus={onCloseAutoFocus}
                data-testid="dialog-result"
            >
                <Icon
                    className={
                        variant === 'success'
                            ? 'size-10 text-[var(--teal-ink)]'
                            : 'size-10 text-destructive'
                    }
                    aria-hidden="true"
                />
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className="leading-relaxed">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" onClick={() => onOpenChange(false)}>
                        {closeLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
