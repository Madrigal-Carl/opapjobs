import { Eye, EyeOff, LockKeyhole } from "lucide-react"
import * as React from "react"
import { useState } from "react"

import { Input } from "@/components/ui/input"
import { authErrorClasses, authLabelClasses } from "@/lib/auth-form-styles"
import { cn } from "@/lib/utils"

type PasswordFieldProps = Omit<
  React.ComponentProps<"input">,
  "id" | "className" | "type"
> & {
  id: string
  label: string
  error?: string
  hint?: string
  /** Pass `null` to hide the leading icon, or a node to replace the default. */
  icon?: React.ReactNode | null
  className?: string
  labelClassName?: string
  inputClassName?: string
  toggleTestId?: string
}

/**
 * Password input with a keyboard-accessible show/hide toggle.
 *
 * Usage:
 *   <PasswordField
 *     id="signin-password"
 *     label="Password"
 *     name="password"
 *     autoComplete="current-password"
 *     required
 *     error={errors.password}
 *   />
 */
function PasswordField({
  id,
  label,
  error,
  hint,
  icon,
  className,
  labelClassName,
  inputClassName,
  toggleTestId,
  required,
  ...props
}: PasswordFieldProps) {
  const [show, setShow] = useState(false)
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy =
    [error ? errorId : undefined, hint ? hintId : undefined]
      .filter(Boolean)
      .join(" ") || undefined

  const leadingIcon =
    icon === null ? null : (
      icon ?? <LockKeyhole size={17} aria-hidden="true" />
    )

  return (
    <div className={className}>
      <label className={cn(authLabelClasses, labelClassName)} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        {leadingIcon ? (
          <div className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--teal)]">
            {leadingIcon}
          </div>
        ) : null}
        <Input
          id={id}
          type={show ? "text" : "password"}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            "pr-12",
            leadingIcon ? "pl-11" : undefined,
            error
              ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
              : undefined,
            inputClassName
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((current) => !current)}
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-[var(--slate)] transition hover:text-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          data-testid={toggleTestId}
        >
          {show ? (
            <EyeOff size={18} aria-hidden="true" />
          ) : (
            <Eye size={18} aria-hidden="true" />
          )}
        </button>
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

export { PasswordField }
export default PasswordField
