import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,15,18,0.96),rgba(8,9,12,0.98))] px-4 py-3 text-base text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] placeholder:text-white/32 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:border-primary/30 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }

