import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type SwitchProps = Omit<ComponentProps<'button'>, 'onChange'> & {
    checked: boolean;
    onCheckedChange?: (checked: boolean) => void;
};

export function Switch({
    checked,
    onCheckedChange,
    className,
    disabled,
    ...props
}: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            data-state={checked ? 'checked' : 'unchecked'}
            onClick={() => {
                if (disabled) {
                    return;
                }

                onCheckedChange?.(!checked);
            }}
            onKeyDown={(event) => {
                if (disabled) {
                    return;
                }

                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onCheckedChange?.(!checked);
                }
            }}
            className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60',
                checked
                    ? 'border-transparent bg-[var(--teal)]'
                    : 'border-[var(--line)] bg-[var(--surface-soft)]',
                className,
            )}
            {...props}
        >
            <span
                className={cn(
                    'pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform',
                    checked ? 'translate-x-6' : 'translate-x-1',
                )}
                aria-hidden="true"
            />
        </button>
    );
}
