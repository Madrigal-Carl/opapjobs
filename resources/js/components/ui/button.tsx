import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm whitespace-nowrap transition outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-60 aria-busy:opacity-60 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--amber)] font-bold text-[var(--navy)] hover:bg-[var(--amber-hover)]",
        secondary:
          "border border-[var(--line)] bg-white font-semibold text-[var(--navy)] hover:border-[var(--teal)]",
        destructive:
          "bg-destructive font-semibold text-white hover:bg-destructive/90",
        ghost: "font-medium text-[var(--navy)] hover:bg-[var(--surface-soft)]",
        link: "font-semibold text-[var(--teal)] underline-offset-4 hover:underline",
        facebook: "bg-[#1877f2] font-semibold text-white hover:brightness-95",
      },
      size: {
        default: "px-5 py-3.5",
        sm: "px-3 py-2",
        lg: "px-6 py-4",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

/**
 * OPAP button.
 *
 * Variants: primary (amber), secondary (outlined white), destructive,
 * ghost, link (teal) and facebook. Sizes: default, sm, lg, icon.
 *
 * Usage:
 *   <Button type="submit" loading={processing}>Save</Button>
 *   <Button variant="secondary" asChild><Link href={...}>Back</Link></Button>
 */
function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Spinner />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
