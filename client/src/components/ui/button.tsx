import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[18px] border text-sm font-semibold tracking-[0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/[0.70] focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-primary/[0.35] bg-[linear-gradient(135deg,rgba(177,18,38,0.96),rgba(121,8,22,0.94))] text-primary-foreground shadow-[0_18px_40px_rgba(177,18,38,0.22)] hover:-translate-y-0.5 hover:brightness-110",
        destructive:
          "border-rose-500/[0.35] bg-[linear-gradient(135deg,rgba(225,29,72,0.95),rgba(127,29,29,0.94))] text-white shadow-[0_18px_40px_rgba(225,29,72,0.18)] hover:-translate-y-0.5 hover:brightness-105",
        outline:
          "border-white/10 bg-white/[0.03] text-white/[0.88] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.06]",
        secondary:
          "border-white/[0.08] bg-[linear-gradient(180deg,rgba(26,29,34,0.94),rgba(11,13,16,0.96))] text-white/[0.88] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.05]",
        ghost:
          "border-transparent bg-transparent text-white/[0.72] hover:border-white/10 hover:bg-white/[0.05] hover:text-white",
      },
      size: {
        default: "min-h-10 px-4 py-2.5",
        sm: "min-h-9 rounded-[14px] px-3 text-xs",
        lg: "min-h-11 rounded-[20px] px-6",
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

