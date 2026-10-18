import type { ComponentProps, ReactNode } from 'react';
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';

/**
 * Input chrome shared by every field in this folder, copied from the
 * post-a-job design so new fields match without restyling each time.
 */
export const fieldControlClasses =
    'w-full rounded-lg border border-[#D8D2C2] px-3.5 py-2.5 text-sm text-[#12263F] outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#12263F] disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Field label: 12px semibold navy with an optional red asterisk.
 */
export function FieldLabel({
    htmlFor,
    children,
    required,
}: {
    htmlFor?: string;
    children: ReactNode;
    required?: boolean;
}) {
    return (
        <label
            htmlFor={htmlFor}
            className="block text-xs font-semibold text-[#12263F]"
        >
            {children}
            {required && <span className="text-red-500"> *</span>}
        </label>
    );
}

type FormInputProps = Omit<ComponentProps<'input'>, 'className'> & {
    id: string;
    label?: string;
    /** Adds the red asterisk and marks the control required. */
    required?: boolean;
    hint?: string;
    error?: string;
    /** Icon pinned inside the control, e.g. a map pin. */
    icon?: ReactNode;
    className?: string;
    /** Applied to the input itself, for widths or smaller type. */
    inputClassName?: string;
};

/**
 * Labelled text/number/date/email input for dashboard forms.
 *
 * Usage:
 *   <FormInput id="job-title" label="Job title" required value={value}
 *              onChange={(e) => onChange(e.target.value)} error={error} />
 */
export function FormInput({
    id,
    label,
    required,
    hint,
    error,
    icon,
    className,
    inputClassName,
    ...props
}: FormInputProps) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            {label && (
                <FieldLabel htmlFor={id} required={required}>
                    {label}
                </FieldLabel>
            )}
            <div className="relative">
                {icon && (
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        {icon}
                    </span>
                )}
                <input
                    id={id}
                    required={required}
                    aria-invalid={Boolean(error)}
                    className={cn(
                        fieldControlClasses,
                        icon && 'pl-10',
                        error && 'border-red-400',
                        inputClassName,
                    )}
                    {...props}
                />
            </div>
            {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
            <InputError message={error} />
        </div>
    );
}
