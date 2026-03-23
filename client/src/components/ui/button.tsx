import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] border text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/[0.72] focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-[#8a3140] bg-[linear-gradient(180deg,rgba(183,45,70,0.96),rgba(131,28,47,0.98))] text-primary-foreground shadow-[0_14px_30px_rgba(131,28,47,0.2)] hover:border-[#ab4d5d] hover:-translate-y-0.5 hover:brightness-105",
        destructive:
          "border-rose-500/[0.28] bg-[linear-gradient(180deg,rgba(220,38,38,0.94),rgba(127,29,29,0.96))] text-white shadow-[0_14px_28px_rgba(220,38,38,0.18)] hover:-translate-y-0.5 hover:brightness-105",
        outline:
          "border-white/10 bg-[linear-gradient(180deg,rgba(18,20,24,0.96),rgba(12,14,18,0.98))] text-white/[0.88] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:-translate-y-0.5 hover:border-white/16 hover:bg-[#15181d]",
        secondary:
          "border-white/[0.08] bg-[linear-gradient(180deg,rgba(28,31,36,0.94),rgba(17,19,24,0.98))] text-white/[0.9] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.05]",
        ghost:
          "border-transparent bg-transparent text-white/[0.72] hover:border-white/10 hover:bg-white/[0.05] hover:text-white",
      },
      size: {
        default: "min-h-11 px-4 py-2.5",
        sm: "min-h-9 rounded-[12px] px-3 text-xs",
        lg: "min-h-12 rounded-[16px] px-6",
        icon: "h-10 w-10 rounded-[14px] p-0",
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

