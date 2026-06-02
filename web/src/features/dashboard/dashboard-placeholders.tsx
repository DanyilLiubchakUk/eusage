import type { MetricDateRangeInput } from "../../lib/metrics"
import { AdminOverview } from "./admin-overview"
import type { DashboardSourceState } from "./dashboard"
import { TvDashboard } from "./tv-dashboard"

type DashboardPlaceholderProps = {
  state: DashboardSourceState
  now: number
}

type AdminDashboardPlaceholderProps = DashboardPlaceholderProps & {
  onDateRangeChange?: (value: MetricDateRangeInput) => Promise<void> | void
  onProviderVisibilityChange?: (visibleProviderIds: string[] | null) => Promise<void> | void
}

export function AdminDashboardPlaceholder({
  state,
  now,
  onDateRangeChange,
  onProviderVisibilityChange,
}: AdminDashboardPlaceholderProps) {
  if (state.status !== "ready") return <DashboardUnavailable state={state} />
  return (
    <AdminOverview
      state={state}
      now={now}
      onDateRangeChange={onDateRangeChange}
      onProviderVisibilityChange={onProviderVisibilityChange}
    />
  )
}

export function TvDashboardPlaceholder({ state, now }: DashboardPlaceholderProps) {
  if (state.status !== "ready") return <DashboardUnavailable state={state} />
  return <TvDashboard state={state} now={now} />
}

function DashboardUnavailable({ state }: { state: DashboardSourceState }) {
  return (
    <main className="setup-page">
      <section className="setup-card" aria-label="Dashboard unavailable">
        <strong>Dashboard unavailable</strong>
        <p>{state.status}</p>
      </section>
    </main>
  )
}
