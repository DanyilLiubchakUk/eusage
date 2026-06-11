import {
  DEFAULT_REPORTING_TIME_ZONE,
  resolveVisibleMetricSource,
  type MetricDateRangeInput,
  type ProviderAccountSourceRow,
  type UsageMetricSampleSourceRow,
  type UsageSnapshotSourceRow,
} from "../../lib/metrics"
import type { DashboardSourceState } from "./dashboard"

export type ReadyDashboardState = Extract<DashboardSourceState, { status: "ready" }>

type DashboardViewSettings = {
  defaultDateRange: unknown
  visibleProviderIds: string[] | null
  hiddenDeveloperIds: string[]
  includeInactiveDevelopers: boolean
}

type TvViewSettings = {
  dateRange: unknown
  visibleProviderIds: string[] | null
  visibleDeveloperIds: string[] | null
  slides?: unknown
  theme?: string
}

export function dashboardSource(state: ReadyDashboardState, view: "admin" | "tv") {
  const snapshots = state.snapshots as UsageSnapshotSourceRow[]
  const metricSamples = state.metricSamples as UsageMetricSampleSourceRow[]
  const providerAccounts = ((state as { providerAccounts?: unknown }).providerAccounts ??
    []) as ProviderAccountSourceRow[]
  const disabledProviderIds = (state.providers ?? [])
    .filter((provider) => provider.status === "disabled")
    .map((provider) => provider.providerId)
  const providerIds = (state.providers ?? []).map((provider) => provider.providerId)
  const settings =
    view === "admin"
      ? state.dashboardSettings ?? defaultDashboardSettings()
      : state.tvSettings ?? defaultTvSettings()
  const visibleSource = resolveVisibleMetricSource({
    developers: state.developers,
    snapshots,
    metricSamples,
    providerIds,
    disabledProviderIds,
    selectedProviderIds: settings.visibleProviderIds,
    hiddenDeveloperIds:
      view === "admin" ? state.dashboardSettings?.hiddenDeveloperIds ?? [] : [],
    selectedDeveloperIds:
      view === "tv" ? state.tvSettings?.visibleDeveloperIds ?? null : null,
    includeInactiveDevelopers:
      view === "admin"
        ? Boolean(state.dashboardSettings?.includeInactiveDevelopers)
        : false,
  })
  const visibleDeveloperIdSet = new Set(visibleSource.visibleDeveloperIds)
  const visibleProviderIdSet = new Set(visibleSource.visibleProviderIds)

  return {
    ...visibleSource,
    providerAccounts: providerAccounts.filter(
      (account) =>
        visibleDeveloperIdSet.has(account.developerId) &&
        visibleProviderIdSet.has(account.providerId)
    ),
    dateRange: settingsDateRange(settings),
    reportingTimeZone: teamReportingTimeZone(state.team),
  }
}

function defaultDashboardSettings() {
  return {
    defaultDateRange: { preset: "last7" as const },
    visibleProviderIds: null,
    hiddenDeveloperIds: [] as string[],
    includeInactiveDevelopers: false,
  } satisfies DashboardViewSettings
}

function defaultTvSettings() {
  return {
    dateRange: { preset: "last7" as const },
    visibleProviderIds: null,
    visibleDeveloperIds: null,
    slides: [],
    theme: "dark",
  } satisfies TvViewSettings
}

function settingsDateRange(settings: DashboardViewSettings | TvViewSettings): MetricDateRangeInput {
  const value = "defaultDateRange" in settings ? settings.defaultDateRange : settings.dateRange
  if (isMetricDateRangeInput(value)) return value
  throw new Error("Dashboard date range setting is invalid.")
}

function isMetricDateRangeInput(value: unknown): value is MetricDateRangeInput {
  if (!value || typeof value !== "object") return false
  const preset = (value as { preset?: unknown }).preset
  if (preset === "last7" || preset === "last30" || preset === "last90" || preset === "allTime") {
    return true
  }
  return (
    preset === "custom" &&
    typeof (value as { startDay?: unknown }).startDay === "string" &&
    typeof (value as { endDay?: unknown }).endDay === "string"
  )
}

function teamReportingTimeZone(team: ReadyDashboardState["team"]) {
  const reportingTimeZone = (team as { reportingTimeZone?: unknown }).reportingTimeZone
  if (reportingTimeZone === undefined) return DEFAULT_REPORTING_TIME_ZONE
  if (typeof reportingTimeZone === "string") return reportingTimeZone
  throw new Error("Team reporting time zone setting is invalid.")
}
