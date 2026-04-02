import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[16px] border text-sm font-semibold tracking-[0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/[0.72] focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-[rgba(224,0,26,0.38)] bg-[linear-gradient(180deg,rgba(224,0,26,0.92),rgba(180,0,20,0.98))] text-white shadow-[0_12px_32px_rgba(224,0,26,0.22)] hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(224,0,26,0.32)] hover:brightness-110",
        destructive:
          "border-[rgba(224,0,26,0.4)] bg-[linear-gradient(180deg,rgba(224,0,26,0.94),rgba(160,0,18,0.98))] text-white shadow-[0_12px_28px_rgba(224,0,26,0.2)] hover:-translate-y-0.5 hover:brightness-110",
        outline:
          "border-[var(--border-default)] bg-[linear-gradient(180deg,rgba(18,18,22,0.96),rgba(11,11,14,0.98))] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[linear-gradient(180deg,rgba(22,22,26,0.98),rgba(14,14,17,1))]",
        secondary:
          "border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(20,20,24,0.94),rgba(13,13,16,0.98))] text-[var(--text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:bg-[linear-gradient(180deg,rgba(24,24,28,0.98),rgba(15,15,18,1))]",
        ghost:
          "border-transparent bg-transparent text-[var(--text-muted)] hover:border-[var(--border-subtle)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]",
      },
      size: {
        default: "min-h-11 px-4 py-2.5",
        sm: "min-h-9 rounded-[13px] px-3 text-xs",
        lg: "min-h-12 rounded-[18px] px-6",
        icon: "h-10 w-10 rounded-[16px] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }

