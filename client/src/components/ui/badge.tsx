import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.08em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
  {
    variants: {
      variant: {
        default:
          "border-primary/18 bg-primary/14 text-white shadow-[0_10px_24px_rgba(177,18,38,0.12)]",
        secondary: "border-white/10 bg-white/[0.04] text-white/78",
        destructive:
          "border-rose-500/20 bg-rose-500/12 text-rose-100 shadow-[0_10px_24px_rgba(225,29,72,0.12)]",
        outline: "border-white/10 bg-transparent text-white/74",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants }

