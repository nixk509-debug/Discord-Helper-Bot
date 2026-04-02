import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
  {
    variants: {
      variant: {
        default:
          "border-[var(--border-brand)] bg-[rgba(224,0,26,0.12)] text-[var(--text-primary)] shadow-[0_8px_24px_rgba(224,0,26,0.12)]",
        secondary: "border-[var(--border-default)] bg-white/[0.04] text-[var(--text-secondary)]",
        destructive:
          "border-[rgba(220,84,103,0.24)] bg-[rgba(220,84,103,0.12)] text-[rgba(255,221,227,0.95)] shadow-[0_12px_24px_rgba(121,32,47,0.12)]",
        outline: "border-[var(--border-default)] bg-transparent text-[var(--text-secondary)]",
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

