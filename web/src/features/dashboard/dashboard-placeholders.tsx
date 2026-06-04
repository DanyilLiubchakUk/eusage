import type { ReactNode } from "react"
import type { MetricDateRangeInput } from "../../lib/metrics"
import { AdminOverview } from "./admin-overview"
import type { DashboardSourceState } from "./dashboard"
import { TvDashboard } from "./tv-dashboard"

export type DashboardAuthState = {
  isLoaded: boolean
  isSignedIn: boolean
}

type DashboardPlaceholderProps = {
  state: DashboardSourceState
  now: number
  auth?: DashboardAuthState
  signInSlot?: ReactNode
}

type AdminDashboardPlaceholderProps = DashboardPlaceholderProps & {
  onDateRangeChange?: (value: MetricDateRangeInput) => Promise<void> | void
  onReportingTimeZoneChange?: (value: string) => Promise<void> | void
  onProviderVisibilityChange?: (visibleProviderIds: string[] | null) => Promise<void> | void
  onClearTeamData?: () => Promise<{ deleted: Record<string, number> }> | void
}

export function AdminDashboardPlaceholder({
  state,
  now,
  auth,
  signInSlot,
  onDateRangeChange,
  onReportingTimeZoneChange,
  onProviderVisibilityChange,
  onClearTeamData,
}: AdminDashboardPlaceholderProps) {
  if (state.status !== "ready") {
    return <DashboardUnavailable state={state} auth={auth} signInSlot={signInSlot} />
  }
  return (
    <AdminOverview
      state={state}
      now={now}
      onDateRangeChange={onDateRangeChange}
      onReportingTimeZoneChange={onReportingTimeZoneChange}
      onProviderVisibilityChange={onProviderVisibilityChange}
      onClearTeamData={onClearTeamData}
    />
  )
}

export function TvDashboardPlaceholder({
  state,
  now,
  auth,
  signInSlot,
}: DashboardPlaceholderProps) {
  if (state.status !== "ready") {
    return <DashboardUnavailable state={state} auth={auth} signInSlot={signInSlot} />
  }
  return <TvDashboard state={state} now={now} />
}

export function DashboardLoading() {
  return (
    <main className="setup-page">
      <section className="setup-card" aria-label="Dashboard loading">
        <strong>Loading dashboard...</strong>
        <p>Checking sign-in.</p>
      </section>
    </main>
  )
}

export function DashboardSignInRequired({ signInSlot }: { signInSlot?: ReactNode }) {
  return (
    <main className="setup-page">
      <section className="setup-card" aria-label="Sign in">
        <strong>Sign in required</strong>
        <p>Sign in with Clerk to open the dashboard.</p>
        {signInSlot}
      </section>
    </main>
  )
}

export function DashboardUnavailable({
  state,
  auth,
  signInSlot,
}: {
  state: DashboardSourceState
  auth?: DashboardAuthState
  signInSlot?: ReactNode
}) {
  if (state.status === "not-authenticated" && auth) {
    if (!auth.isLoaded || auth.isSignedIn) return <DashboardLoading />
    return <DashboardSignInRequired signInSlot={signInSlot} />
  }

  return (
    <main className="setup-page">
      <section className="setup-card" aria-label="Dashboard unavailable">
        <strong>Dashboard unavailable</strong>
        <p>{state.status}</p>
      </section>
    </main>
  )
}
