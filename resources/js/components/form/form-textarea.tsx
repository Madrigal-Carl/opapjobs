import type { ComponentProps } from 'react';
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';
import { FieldLabel, fieldControlClasses } from './form-input';

type FormTextareaProps = Omit<ComponentProps<'textarea'>, 'className'> & {
    id: string;
    label?: string;
    /** Adds the red asterisk and marks the control required. */
    required?: boolean;
    hint?: string;
    error?: string;
    className?: string;
    /** Applied to the textarea itself, for heights or smaller type. */
    textareaClassName?: string;
};

/**
 * Labelled multi-line text input for dashboard forms.
 */
export function FormTextarea({
    id,
    label,
    required,
    hint,
    error,
    className,
    textareaClassName,
    ...props
}: FormTextareaProps) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            {label && (
                <FieldLabel htmlFor={id} required={required}>
                    {label}
                </FieldLabel>
            )}
            <textarea
                id={id}
                required={required}
                aria-invalid={Boolean(error)}
                className={cn(
                    fieldControlClasses,
                    'resize-none leading-relaxed',
                    error && 'border-red-400',
                    textareaClassName,
                )}
                {...props}
            />
            {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
            <InputError message={error} />
        </div>
    );
}
