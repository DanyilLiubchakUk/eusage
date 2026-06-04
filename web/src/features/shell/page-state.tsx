import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type PageStateProps = {
  action?: ReactNode
  children?: ReactNode
  label: string
  tone?: "default" | "error"
  title: string
}

export function PageState({
  action,
  children,
  label,
  tone = "default",
  title,
}: PageStateProps) {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-3.75rem)] w-full max-w-6xl place-items-center px-6 py-10 max-md:px-4 max-md:py-6">
      <Card
        className={cn(
          "w-full max-w-2xl",
          tone === "error" && "border-destructive/30 bg-destructive/10"
        )}
        role={tone === "error" ? "alert" : "region"}
        aria-label={label}
      >
        <CardContent className="grid justify-items-center gap-4 text-center">
          <strong className={cn("text-base text-foreground", tone === "error" && "text-destructive")}>
            {title}
          </strong>
          {children ? (
            <div className={cn("grid gap-2 text-muted-foreground", tone === "error" && "text-destructive")}>
              {children}
            </div>
          ) : null}
          {action ? <div className="grid w-full max-w-sm justify-items-center [&_[data-slot=button]]:w-full">{action}</div> : null}
        </CardContent>
      </Card>
    </main>
  )
}
