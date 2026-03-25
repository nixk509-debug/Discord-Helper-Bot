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
          "border-[var(--border-brand)] bg-[linear-gradient(180deg,rgba(157,140,255,0.94),rgba(110,123,255,0.98))] text-primary-foreground shadow-[0_18px_36px_rgba(37,48,96,0.28)] hover:-translate-y-0.5 hover:border-[rgba(157,140,255,0.55)] hover:brightness-105",
        destructive:
          "border-[rgba(220,84,103,0.34)] bg-[linear-gradient(180deg,rgba(220,84,103,0.94),rgba(121,32,47,0.96))] text-white shadow-[0_18px_34px_rgba(121,32,47,0.24)] hover:-translate-y-0.5 hover:brightness-105",
        outline:
          "border-[var(--border-default)] bg-[linear-gradient(180deg,rgba(24,30,44,0.96),rgba(14,18,29,0.98))] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[linear-gradient(180deg,rgba(30,37,55,0.98),rgba(17,22,34,1))]",
        secondary:
          "border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(26,33,49,0.94),rgba(17,22,34,0.98))] text-[var(--text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:bg-[linear-gradient(180deg,rgba(31,39,58,0.98),rgba(19,24,37,1))]",
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

