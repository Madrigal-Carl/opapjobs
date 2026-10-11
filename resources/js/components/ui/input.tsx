import * as React from "react"

import { authInputClasses } from "@/lib/auth-form-styles"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        authInputClasses,
        "file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50 read-only:bg-[var(--surface-soft)] read-only:text-[var(--slate)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
