import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "mobile-entry-safe flex min-h-12 w-full rounded-[16px] border border-[var(--border-default)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)_22%),linear-gradient(180deg,rgba(14,14,17,0.98),rgba(9,9,12,1))] px-4 py-2.5 text-base text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--text-faint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-[rgba(224,0,26,0.5)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
