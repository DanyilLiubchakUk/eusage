import {
  calculateCursorPool,
  calculateDashboardUsage,
  calculateQuotaPressure,
  formatUpdateFreshnessLabel,
  isSampleDayInWindow,
  resolveMetricDateRange,
  type MetricDateRangeInput,
  type MetricRangeWindow,
} from "../../lib/metrics"
import { AdminOverview } from "./admin-overview"
import type { DashboardSourceState } from "./dashboard"
import {
  formatCount,
  formatPercentDelta,
  formatProviderBreakdown,
  formatUsd,
} from "./dashboard-formatting"
import { dashboardSource } from "./dashboard-source"

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

  const source = dashboardSource(state, "tv")
  const range = resolveMetricDateRange(source.dateRange, now)
  const usage = calculateDashboardUsage({
    snapshots: source.snapshots,
    range: source.dateRange,
    now,
  })
  const cursorPool = calculateCursorPool({
    snapshots: source.snapshots,
    window: range.current,
    visibleDeveloperIds: source.visibleDeveloperIds,
  })
  const quota = calculateQuotaPressure({
    snapshots: source.snapshots,
    metricSamples: source.metricSamples,
    window: range.current,
    visibleDeveloperIds: source.visibleDeveloperIds,
    visibleProviderIds: source.visibleProviderIds,
  })

  return (
    <main className="tv-page">
      <section className="tv-slide" aria-labelledby="tv-title">
        <p className="setup-eyebrow">TV Team Overview</p>
        <h1 id="tv-title">{formatCount(usage.comparison.current.tokensTotal)} tokens</h1>
        <p className="tv-subtitle">
          {formatUsd(usage.comparison.current.estimatedCostUsd)} estimated cost ·{" "}
          {formatPercentDelta(usage.comparison.tokensPercentChange)}
        </p>
        <MetricSummaryGrid
          items={[
            ["Cursor pool", formatCursorPool(cursorPool)],
            ["Quota pressure", formatQuota(quota.teamAveragePercent, quota.teamCoverage.label)],
            ["Top provider", usage.comparison.current.topProvider?.providerId ?? "No data yet"],
            ["Provider breakdown", formatProviderBreakdown(usage.comparison.current.providerTotals)],
            ["Active developers", String(source.visibleDeveloperIds.length)],
          ]}
        />
        <p>
          {formatUpdateFreshnessLabel(
            visibleUpdateTimestamps(source, range.current, usage.comparison.current),
            now
          )}
        </p>
      </section>
    </main>
  )
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

function MetricSummaryGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <section className="setup-panel dashboard-metric-grid" aria-label="Metrics">
      {items.map(([label, value]) => (
        <div key={label}>
          <span className="setup-label">{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  )
}

function formatCursorPool(pool: ReturnType<typeof calculateCursorPool>) {
  if (!pool.available) return "No data yet"
  return `${pool.label}: ${formatUsd(pool.remainingUsd)} remaining (${pool.coverage.label})`
}

function formatQuota(value: number | null, coverage: string) {
  if (value === null) return `No data yet (${coverage})`
  return `${Math.round(value)}% avg (${coverage})`
}

function visibleUpdateTimestamps(
  source: ReturnType<typeof dashboardSource>,
  window: MetricRangeWindow,
  totals: ReturnType<typeof calculateDashboardUsage>["comparison"]["current"]
) {
  const snapshotTimestamps = [totals.oldestUpdatedAt, totals.newestUpdatedAt].filter(
    (timestamp): timestamp is number => timestamp !== null
  )
  const sampleTimestamps = source.metricSamples
    .filter((sample) => isSampleDayInWindow(sample.sampleDay, window))
    .map((sample) => sample.updatedAt)

  return [...snapshotTimestamps, ...sampleTimestamps]
}
