import type { ReactNode } from "react"
import { PageState } from "../shell/page-state"
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
  onSeedMockData?: () => Promise<{ seeded: Record<string, number> }> | void
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
  onSeedMockData,
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
      onSeedMockData={onSeedMockData}
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
    <PageState label="Dashboard loading" title="Loading dashboard...">
      <p className="m-0">Checking sign-in.</p>
    </PageState>
  )
}

export function DashboardSignInRequired({ signInSlot }: { signInSlot?: ReactNode }) {
  return (
    <PageState action={signInSlot} label="Sign in" title="Sign in required">
      <p className="m-0">Sign in with Clerk to open the dashboard.</p>
    </PageState>
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
    <PageState label="Dashboard unavailable" title="Dashboard unavailable">
      <p className="m-0">{state.status}</p>
    </PageState>
  )
}
