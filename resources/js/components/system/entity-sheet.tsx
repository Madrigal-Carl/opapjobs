import type { ReactNode } from 'react';
import { Spinner } from '@/components/ui/spinner';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

type EntitySheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Title naming the record, e.g. "Edit agency". */
    title: string;
    /** One line saying what the form does. Required — the Sheet is modal. */
    description: string;
    children: ReactNode;
    /** Footer actions. Cancel is supplied; pass the save button. */
    footer?: ReactNode;
    /** Wider sheet for forms with a two-column block or a select plus label. */
    size?: 'default' | 'wide';
    'data-testid'?: string;
};

/**
 * Right-hand edit surface for one small record (spec §5.1). Full width on
 * mobile so the fields stay usable, and `sm:max-w-lg` on desktop so it
 * reads as a side panel rather than a page. The built-in close button and
 * Escape both route through `onOpenChange`, so a caller with unsaved edits
 * can intercept and confirm before closing.
 */
export function EntitySheet({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    size = 'default',
    'data-testid': testId,
}: EntitySheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                data-testid={testId}
                className={
                    size === 'wide'
                        ? 'gap-0 overflow-y-auto sm:max-w-xl'
                        : 'gap-0 overflow-y-auto'
                }
            >
                <SheetHeader className="border-b border-[var(--line)] p-5">
                    <SheetTitle className="font-serif text-xl font-bold tracking-[-0.02em] text-[var(--navy)]">
                        {title}
                    </SheetTitle>
                    <SheetDescription className="text-sm text-[var(--slate)]">
                        {description}
                    </SheetDescription>
                </SheetHeader>

                {/* Scroll region: the header and footer stay put while a
                    long form scrolls between them. */}
                <div className="flex flex-col gap-5 overflow-y-auto p-5">
                    {children}
                </div>

                {footer && (
                    <SheetFooter className="border-t border-[var(--line)] p-5">
                        {footer}
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    );
}

/**
 * The two footer buttons every entity sheet ends with: a ghost Cancel and
 * an amber Save. `saving` drives the spinner and `aria-busy`.
 */
export function SheetSaveActions({
    onCancel,
    onSave,
    saveLabel = 'Save changes',
    saving = false,
    saveDisabled = false,
    'data-testid': testId,
}: {
    onCancel: () => void;
    onSave: () => void;
    saveLabel?: string;
    saving?: boolean;
    saveDisabled?: boolean;
    'data-testid'?: string;
}) {
    return (
        <>
            <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={saving}
            >
                Cancel
            </Button>
            <Button
                type="button"
                variant="primary"
                onClick={onSave}
                disabled={saving || saveDisabled}
                aria-busy={saving}
                data-testid={testId ?? 'sheet-save'}
            >
                {saving && <Spinner className="size-4" />}
                {saveLabel}
            </Button>
        </>
    );
}
