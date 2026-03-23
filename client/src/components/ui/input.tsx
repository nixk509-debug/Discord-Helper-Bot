import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex min-h-12 w-full rounded-[14px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,20,24,0.98),rgba(12,14,18,1))] px-4 py-2.5 text-base text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-white/34 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:border-[#9d3f50] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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

