import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * Labelled text control used by the console's forms.
 *
 * The console keeps every message inline rather than in a toast, because a
 * blocked save needs to sit next to the field that caused it. That is why
 * `error` and `hint` live here instead of being composed by each caller — a
 * field that cannot show its own error would otherwise drift into a toast,
 * and a toast cannot be read after the next one covers it.
 */
type TextFieldProps = {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string | null;
    /** Shown only while there is no error, so the two never compete. */
    hint?: ReactNode;
    required?: boolean;
    type?: string;
    placeholder?: string;
    autoComplete?: string;
    inputMode?: 'text' | 'numeric' | 'email' | 'url' | 'tel';
    disabled?: boolean;
    className?: string;
    'data-testid'?: string;
};

export function TextField({
    id,
    label,
    value,
    onChange,
    error,
    hint,
    required = false,
    type = 'text',
    placeholder,
    autoComplete,
    inputMode,
    disabled = false,
    className,
    'data-testid': testId,
}: TextFieldProps) {
    const errorId = error ? `${id}-error` : undefined;

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <Label
                htmlFor={id}
                className="flex items-center gap-1 text-sm font-medium text-[var(--navy)]"
            >
                {label}
                {required && (
                    <span aria-hidden="true" className="text-[var(--danger)]">
                        *
                    </span>
                )}
            </Label>
            <Input
                id={id}
                type={type}
                value={value}
                placeholder={placeholder}
                autoComplete={autoComplete}
                inputMode={inputMode}
                disabled={disabled}
                aria-invalid={error ? true : undefined}
                aria-describedby={errorId}
                onChange={(event) => onChange(event.target.value)}
                data-testid={testId}
                className={cn(
                    'h-10 rounded-lg text-sm',
                    error && 'border-[var(--danger)]',
                )}
            />
            {error ? (
                <p
                    id={errorId}
                    role="alert"
                    className="text-xs font-medium text-[var(--danger)]"
                >
                    {error}
                </p>
            ) : (
                hint && <p className="text-xs text-[var(--slate)]">{hint}</p>
            )}
        </div>
    );
}

/** Multi-line variant for free-text such as "About" or a description. */
export function TextAreaField({
    id,
    label,
    value,
    onChange,
    error,
    hint,
    required = false,
    placeholder,
    rows = 5,
    maxLength,
    disabled = false,
    className,
    'data-testid': testId,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string | null;
    hint?: ReactNode;
    required?: boolean;
    placeholder?: string;
    rows?: number;
    /** Rich text in this app is plain text with a hard cap (§4.12). */
    maxLength?: number;
    disabled?: boolean;
    className?: string;
    'data-testid'?: string;
}) {
    const errorId = error ? `${id}-error` : undefined;
    const tooLong = maxLength !== undefined && value.length > maxLength;

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <Label
                htmlFor={id}
                className="flex items-center gap-1 text-sm font-medium text-[var(--navy)]"
            >
                {label}
                {required && (
                    <span aria-hidden="true" className="text-[var(--danger)]">
                        *
                    </span>
                )}
            </Label>
            <Textarea
                id={id}
                value={value}
                rows={rows}
                placeholder={placeholder}
                disabled={disabled}
                aria-invalid={error ? true : undefined}
                aria-describedby={errorId}
                onChange={(event) => onChange(event.target.value)}
                data-testid={testId}
                className={cn(
                    'rounded-lg text-sm',
                    (error || tooLong) && 'border-[var(--danger)]',
                )}
            />
            {error ? (
                <p
                    id={errorId}
                    role="alert"
                    className="text-xs font-medium text-[var(--danger)]"
                >
                    {error}
                </p>
            ) : (
                hint && <p className="text-xs text-[var(--slate)]">{hint}</p>
            )}
            {maxLength !== undefined && (
                <p className="text-xs text-[var(--slate)] tabular-nums">
                    {value.length} / {maxLength} characters
                </p>
            )}
        </div>
    );
}
