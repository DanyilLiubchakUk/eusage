import type { ReactNode } from "react"
import { AppNav } from "./app-nav"

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppNav />
      {children}
    </div>
  )
}
