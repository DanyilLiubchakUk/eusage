import { useState } from "react"
import { AdminOverview } from "../../web/src/features/dashboard/admin-overview"
import { AppNav } from "./AppNav"
import { now, readyState } from "../../web/src/features/dashboard/dashboard-test-fixtures"
import type { DashboardSourceState } from "../../web/src/features/dashboard/dashboard"

export function PreviewFrame() {
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const state = readyState as Extract<DashboardSourceState, { status: "ready" }>

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    document.documentElement.dataset.theme = next
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav />
      <button
        type="button"
        onClick={toggleTheme}
        style={{
          position: "fixed",
          bottom: "1rem",
          left: "1rem",
          zIndex: 100,
          padding: "0.4rem 0.8rem",
          fontSize: "0.75rem",
          fontFamily: "Geist Mono, monospace",
          background: "var(--card)",
          border: "1px solid var(--surface-hairline)",
          color: "var(--foreground)",
          borderRadius: "0.5rem",
          cursor: "pointer",
        }}
      >
        {theme === "dark" ? "light" : "dark"}
      </button>
      <AdminOverview
        state={state}
        now={now}
        onDateRangeChange={async () => {}}
        onReportingTimeZoneChange={async () => {}}
        onProviderVisibilityChange={async () => {}}
        onClearTeamData={async () => ({ deleted: {} })}
        onSeedMockData={async () => ({ seeded: {} })}
      />
    </div>
  )
}
