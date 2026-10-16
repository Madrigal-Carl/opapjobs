import * as React from "react"

import { authInputClasses } from "@/lib/auth-form-styles"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(authInputClasses, "resize-none", className)}
      {...props}
    />
  )
}

export { Textarea }
