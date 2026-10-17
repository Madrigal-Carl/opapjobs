import type { ComponentProps } from 'react';
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';
import { FieldLabel, fieldControlClasses } from './form-input';

export type SelectOption = {
    value: string;
    label: string;
};

type FormSelectProps = Omit<ComponentProps<'select'>, 'className'> & {
    id: string;
    label?: string;
    /** Adds the red asterisk and marks the control required. */
    required?: boolean;
    hint?: string;
    error?: string;
    /** Empty-value option shown when nothing is chosen yet. */
    placeholder?: string;
    options: SelectOption[];
    className?: string;
    /** Applied to the select itself, for widths or smaller type. */
    selectClassName?: string;
};

/**
 * Labelled native select. A plain option list keeps the control and its
 * popup looking exactly like the post-a-job design.
 */
export function FormSelect({
    id,
    label,
    required,
    hint,
    error,
    placeholder,
    options,
    className,
    selectClassName,
    ...props
}: FormSelectProps) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            {label && (
                <FieldLabel htmlFor={id} required={required}>
                    {label}
                </FieldLabel>
            )}
            <select
                id={id}
                required={required}
                aria-invalid={Boolean(error)}
                className={cn(
                    fieldControlClasses,
                    'bg-white',
                    error && 'border-red-400',
                    selectClassName,
                )}
                {...props}
            >
                {placeholder !== undefined && (
                    <option value="">{placeholder}</option>
                )}
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {hint && !error && (
                <p className="text-xs text-slate-500">{hint}</p>
            )}
            <InputError message={error} />
        </div>
    );
}
