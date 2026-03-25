import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-[16px] border border-[var(--border-default)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)_22%),linear-gradient(180deg,rgba(18,22,29,0.98),rgba(11,14,19,1))] px-4 py-3 text-base text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] placeholder:text-[var(--text-faint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-[rgba(209,43,71,0.58)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }

