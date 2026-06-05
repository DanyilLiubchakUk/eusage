import * as React from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type InputWithActionProps = React.ComponentProps<typeof Input> & {
  action: React.ReactNode
  actionClassName?: string
  wrapperClassName?: string
}

function InputWithAction({
  action,
  actionClassName,
  className,
  wrapperClassName,
  ...props
}: InputWithActionProps) {
  return (
    <div
      className={cn(
        "flex h-9 min-w-0 items-center rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-3 has-[[aria-invalid=true]]:ring-destructive/20 dark:bg-input/30 dark:has-[[aria-invalid=true]]:border-destructive/50 dark:has-[[aria-invalid=true]]:ring-destructive/40",
        wrapperClassName
      )}
    >
      <Input
        className={cn(
          "h-full flex-1 rounded-r-none border-0 bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0",
          className
        )}
        {...props}
      />
      <div className={cn("flex h-full shrink-0 items-stretch", actionClassName)}>
        {action}
      </div>
    </div>
  )
}

export { InputWithAction }
