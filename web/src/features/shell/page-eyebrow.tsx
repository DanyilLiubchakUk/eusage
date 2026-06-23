import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type PageEyebrowProps = {
  children: ReactNode
  className?: string
}

export function PageEyebrow({ children, className }: PageEyebrowProps) {
  return (
    <p
      className={cn(
        "page-eyebrow mb-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wide",
        className
      )}
    >
      {children}
    </p>
  )
}
