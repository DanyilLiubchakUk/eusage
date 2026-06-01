import {
  buildMetricSeries,
  calculateCursorPool,
  calculateDashboardUsage,
  calculateQuotaPressure,
  formatOldestUpdateLabel,
  resolveMetricDateRange,
  type UsageMetricSampleSourceRow,
  type UsageSnapshotSourceRow,
} from "../../lib/metrics"
import type { DashboardSourceState } from "./dashboard"

type DashboardPlaceholderProps = {
  state: DashboardSourceState
  now: number
}

export function AdminDashboardPlaceholder({ state, now }: DashboardPlaceholderProps) {
  if (state.status !== "ready") return <DashboardUnavailable state={state} />

  const source = dashboardSource(state)
  const range = resolveMetricDateRange({ preset: "last7" }, now)
  const usage = calculateDashboardUsage({
    snapshots: source.snapshots,
    range: { preset: "last7" },
    now,
  })
  const cursorPool = calculateCursorPool({
    snapshots: source.snapshots,
    window: range.current,
    visibleDeveloperIds: source.activeDeveloperIds,
  })
  const quota = calculateQuotaPressure({
    snapshots: source.snapshots,
    window: range.current,
    visibleDeveloperIds: source.activeDeveloperIds,
  })
  const tokenMetricKey = firstTokenMetricKey(source.metricSamples)
  const tokenSeries = tokenMetricKey
    ? buildMetricSeries({
        samples: source.metricSamples,
        metricKey: tokenMetricKey,
        window: range.current,
      })
    : null

  return (
    <main className="admin-page">
      <section className="setup-hero" aria-labelledby="dashboard-title">
        <p className="setup-eyebrow">Admin Overview</p>
        <h1 id="dashboard-title">{state.team.name}</h1>
        <p className="setup-copy">
          Shared metric layer proof for Admin and TV placeholders.
        </p>
      </section>

      <MetricSummaryGrid
        items={[
          ["Range", usage.range.label],
          ["Tokens", formatCount(usage.comparison.current.tokensTotal)],
          ["Estimated cost", formatUsd(usage.comparison.current.estimatedCostUsd)],
          ["Token delta", formatPercentDelta(usage.comparison.tokensPercentChange)],
          ["Top provider", usage.comparison.current.topProvider?.providerId ?? "No data yet"],
          ["Active developers", String(source.activeDeveloperIds.length)],
          ["Cursor pool", formatCursorPool(cursorPool)],
          ["Quota pressure", formatQuota(quota.teamAveragePercent, quota.teamCoverage.label)],
        ]}
      />

      <section className="setup-card dashboard-card" aria-label="Team usage series">
        <strong>Chart source rows</strong>
        <p>{tokenSeries?.points.length ?? 0} daily token points from metric samples.</p>
        <p>{formatOldestUpdateLabel([usage.comparison.current.oldestUpdatedAt], now)}</p>
      </section>
    </main>
  )
}

export function TvDashboardPlaceholder({ state, now }: DashboardPlaceholderProps) {
  if (state.status !== "ready") return <DashboardUnavailable state={state} />

  const source = dashboardSource(state)
  const range = resolveMetricDateRange({ preset: "last7" }, now)
  const usage = calculateDashboardUsage({
    snapshots: source.snapshots,
    range: { preset: "last7" },
    now,
  })
  const cursorPool = calculateCursorPool({
    snapshots: source.snapshots,
    window: range.current,
    visibleDeveloperIds: source.activeDeveloperIds,
  })
  const quota = calculateQuotaPressure({
    snapshots: source.snapshots,
    window: range.current,
    visibleDeveloperIds: source.activeDeveloperIds,
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
            ["Active developers", String(source.activeDeveloperIds.length)],
          ]}
        />
        <p>{formatOldestUpdateLabel([usage.comparison.current.oldestUpdatedAt], now)}</p>
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

function dashboardSource(state: Extract<DashboardSourceState, { status: "ready" }>) {
  const snapshots = state.snapshots as UsageSnapshotSourceRow[]
  const metricSamples = state.metricSamples as UsageMetricSampleSourceRow[]
  const activeDeveloperIds = state.developers
    .filter((developer) => developer.status === "active")
    .map((developer) => developer.id)

  return {
    snapshots,
    metricSamples,
    activeDeveloperIds,
  }
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercentDelta(value: number | null) {
  if (value === null) return "No comparison"
  const rounded = Math.round(value * 10) / 10
  return `${rounded > 0 ? "+" : ""}${rounded}%`
}

function formatCursorPool(pool: ReturnType<typeof calculateCursorPool>) {
  if (!pool.available) return "No data yet"
  return `${formatUsd(pool.remainingUsd)} remaining (${pool.coverage.label})`
}

function formatQuota(value: number | null, coverage: string) {
  if (value === null) return `No data yet (${coverage})`
  return `${Math.round(value)}% avg (${coverage})`
}

function firstTokenMetricKey(samples: UsageMetricSampleSourceRow[]) {
  return samples.find(
    (sample) => sample.unit === "tokens" || isTokenMetricKey(sample.metricKey)
  )?.metricKey
}

function isTokenMetricKey(metricKey: string) {
  return metricKey.includes(".tokens.") || metricKey.endsWith(".tokens.total")
}
