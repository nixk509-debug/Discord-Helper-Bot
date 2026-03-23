import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-[14px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,20,24,0.98),rgba(12,14,18,1))] px-4 py-3 text-base text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] placeholder:text-white/34 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:border-[#9d3f50] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }

