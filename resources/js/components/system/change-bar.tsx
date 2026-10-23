import { useEffect } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type ChangeBarProps = {
    /** Number of fields the user has edited since the last save. */
    count: number;
    saving?: boolean;
    onDiscard: () => void;
    onSave: () => void;
    saveDisabled?: boolean;
    'data-testid'?: string;
};

/**
 * Sticky bar shown while a form has unsaved edits (spec §5.2). It states
 * how many fields changed, offers the one primary action, and documents the
 * Ctrl/Cmd+S shortcut it wires up.
 */
export function ChangeBar({
    count,
    saving = false,
    onDiscard,
    onSave,
    saveDisabled = false,
    'data-testid': testId,
}: ChangeBarProps) {
    // Ctrl/Cmd+S saves in place of the browser's "Save page". Registered on
    // window so the shortcut works wherever focus sits inside the form.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                event.preventDefault();
                if (count > 0 && !saving && !saveDisabled) {
                    onSave();
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [count, saving, saveDisabled, onSave]);

    if (count === 0) {
        return null;
    }

    return (
        <div
            role="status"
            data-testid={testId ?? 'change-bar'}
            className="sticky bottom-0 z-20 mt-2 flex items-center justify-between gap-4 rounded-lg border border-[var(--teal)] bg-white px-4 py-3 shadow-[var(--shadow-md)]"
        >
            <p className="text-sm font-semibold text-[var(--navy)]">
                {count} unsaved {count === 1 ? 'change' : 'changes'}
                <span className="ml-2 hidden font-normal text-[var(--slate)] sm:inline">
                    Ctrl or ⌘ + S to save
                </span>
            </p>

            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onDiscard}
                    disabled={saving}
                >
                    <RotateCcw className="size-4" />
                    Discard
                </Button>
                <Button
                    type="button"
                    variant="primary"
                    onClick={onSave}
                    disabled={saving || saveDisabled}
                    aria-busy={saving}
                    data-testid="change-bar-save"
                >
                    {saving ? (
                        <Spinner className="size-4" />
                    ) : (
                        <Save className="size-4" />
                    )}
                    Save changes
                </Button>
            </div>
        </div>
    );
}
