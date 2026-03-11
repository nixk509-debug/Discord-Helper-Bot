import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex min-h-11 w-full rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,15,18,0.96),rgba(8,9,12,0.98))] px-4 py-2 text-base text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-white/32 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:border-primary/30 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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

