import * as React from "react"

import { Input } from "@/components/ui/input"
import { authErrorClasses, authLabelClasses } from "@/lib/auth-form-styles"
import { cn } from "@/lib/utils"

type FieldProps = Omit<React.ComponentProps<"input">, "id" | "className"> & {
  id: string
  label: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  className?: string
  labelClassName?: string
  inputClassName?: string
}

/**
 * Text/number/email/etc. input matching the OPAP auth form fields.
 *
 * Usage:
 *   <Field
 *     id="signin-email"
 *     label="Email address"
 *     type="email"
 *     name="email"
 *     autoComplete="email"
 *     required
 *     error={errors.email}
 *     icon={<Mail size={17} aria-hidden="true" />}
 *   />
 */
function Field({
  id,
  label,
  error,
  hint,
  icon,
  className,
  labelClassName,
  inputClassName,
  required,
  ...props
}: FieldProps) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy =
    [error ? errorId : undefined, hint ? hintId : undefined]
      .filter(Boolean)
      .join(" ") || undefined

  return (
    <div className={className}>
      <label className={cn(authLabelClasses, labelClassName)} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <div className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--teal)]">
            {icon}
          </div>
        ) : null}
        <Input
          id={id}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            icon ? "pl-11" : undefined,
            error
              ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
              : undefined,
            inputClassName
          )}
          {...props}
        />
      </div>
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-xs text-[var(--slate)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className={authErrorClasses}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

export { Field }
export default Field
