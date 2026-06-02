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
type ReadyDashboardState = Extract<DashboardSourceState, { status: "ready" }>

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
          ["Provider breakdown", formatProviderBreakdown(usage.comparison.current.providerTotals)],
          ["Active developers", String(source.activeDeveloperIds.length)],
          ["Cursor pool", formatCursorPool(cursorPool)],
          ["Quota pressure", formatQuota(quota.teamAveragePercent, quota.teamCoverage.label)],
        ]}
      />

      <DeveloperProviderTable developers={state.developers} snapshots={source.snapshots} />

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
            ["Provider breakdown", formatProviderBreakdown(usage.comparison.current.providerTotals)],
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

function DeveloperProviderTable({
  developers,
  snapshots,
}: {
  developers: ReadyDashboardState["developers"]
  snapshots: UsageSnapshotSourceRow[]
}) {
  const providerRows = latestProviderRowsByDeveloper(snapshots)

  return (
    <section className="setup-card developer-table-card" aria-label="Developer provider sync">
      <div className="developer-table-toolbar">
        <strong>Developer provider sync</strong>
      </div>
      <table className="developer-table">
        <thead>
          <tr>
            <th>Developer</th>
            <th>Provider data</th>
            <th>Token</th>
            <th>Device sync</th>
          </tr>
        </thead>
        <tbody>
          {developers.map((developer) => {
            const rows = providerRows.get(developer.id) ?? []
            const device = latestDevice(developer.devices)
            return (
              <tr key={developer.id}>
                <td>
                  <strong>{developer.displayName}</strong>
                  <span>{developer.status}</span>
                </td>
                <td>{formatProviderRows(rows)}</td>
                <td>
                  <strong>{developer.token?.fingerprint ?? "Missing"}</strong>
                  <span>
                    {developer.token
                      ? `${developer.token.label} (${developer.token.status})`
                      : "No token"}
                  </span>
                </td>
                <td>
                  <strong>{device?.status ?? "No device"}</strong>
                  <span>Last sync {formatTimestamp(device?.lastSyncAt)}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

function dashboardSource(state: ReadyDashboardState) {
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
  return `${pool.label}: ${formatUsd(pool.remainingUsd)} remaining (${pool.coverage.label})`
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

function latestProviderRowsByDeveloper(snapshots: UsageSnapshotSourceRow[]) {
  const rows = new Map<string, Map<string, UsageSnapshotSourceRow>>()
  for (const snapshot of snapshots) {
    const developerRows = rows.get(snapshot.developerId) ?? new Map<string, UsageSnapshotSourceRow>()
    const current = developerRows.get(snapshot.providerId)
    if (!current || snapshot.updatedAt > current.updatedAt) {
      developerRows.set(snapshot.providerId, snapshot)
      rows.set(snapshot.developerId, developerRows)
    }
  }
  return new Map(
    [...rows.entries()].map(([developerId, providerRows]) => [
      developerId,
      [...providerRows.values()].sort((left, right) =>
        left.providerId.localeCompare(right.providerId)
      ),
    ])
  )
}

function latestDevice(devices: ReadyDashboardState["developers"][number]["devices"][number][]) {
  return [...devices].sort(
    (left, right) =>
      (right.lastSyncAt ?? right.lastSeenAt) - (left.lastSyncAt ?? left.lastSeenAt)
  )[0]
}

function formatProviderRows(rows: UsageSnapshotSourceRow[]) {
  if (rows.length === 0) return "No data yet"
  return rows.map(formatProviderRow).join(" | ")
}

function formatProviderRow(row: UsageSnapshotSourceRow) {
  if (row.providerId === "cursor") {
    return `Cursor: ${formatCursorDeveloperBudget(row)}`
  }
  if (row.providerId === "codex") {
    return `Codex: ${formatCodexDeveloperUsage(row)}`
  }
  return `${formatProviderName(row.providerId)}: ${formatGenericProviderUsage(row)}`
}

function formatCursorDeveloperBudget(row: UsageSnapshotSourceRow | undefined) {
  const cursor = row?.summary.provider?.cursor
  if (!cursor) return "No data yet"

  const pooledLimit = numberOrNull(cursor.pooledLimitUsd)
  if (pooledLimit !== null && pooledLimit > 0) {
    const used = numberOrNull(cursor.pooledUsedUsd) ?? 0
    const remaining = numberOrNull(cursor.pooledRemainingUsd) ?? pooledLimit - used
    return `Shared ${formatUsd(remaining)} remaining`
  }

  const individualLimit = numberOrNull(cursor.individualLimitUsd)
  if (individualLimit !== null && individualLimit > 0) {
    const used = numberOrNull(cursor.individualUsedUsd)
    const remaining =
      numberOrNull(cursor.individualRemainingUsd) ??
      (used === null ? null : individualLimit - used)
    return `Individual ${formatUsd(remaining ?? 0)} remaining`
  }

  return "No budget data"
}

function formatCodexDeveloperUsage(row: UsageSnapshotSourceRow) {
  const codex = row.summary.provider?.codex
  if (!codex) return "No data yet"

  const parts = []
  const session = numberOrNull(codex.sessionUsedPercent)
  const weekly = numberOrNull(codex.weeklyUsedPercent)
  const tokens = numberOrNull(row.summary.tokensTotal ?? codex.todayTokens)
  const credits = numberOrNull(row.summary.creditsRemaining ?? codex.creditsRemaining)
  if (session !== null) parts.push(`Session ${Math.round(session)}%`)
  if (weekly !== null) parts.push(`Weekly ${Math.round(weekly)}%`)
  if (tokens !== null) parts.push(`${formatCount(tokens)} tokens today`)
  if (credits !== null) parts.push(`${formatCount(credits)} credits`)
  return parts.length > 0 ? parts.join(", ") : "No usage data"
}

function formatGenericProviderUsage(row: UsageSnapshotSourceRow) {
  const tokens = numberOrNull(row.summary.tokensTotal)
  const cost = numberOrNull(row.summary.estimatedCostUsd)
  const quota = numberOrNull(row.summary.quotaPercent)
  if (tokens !== null) return `${formatCount(tokens)} tokens`
  if (cost !== null) return `${formatUsd(cost)} estimated cost`
  if (quota !== null) return `${Math.round(quota)}% quota`
  return "Synced"
}

function formatProviderBreakdown(
  providers: ReturnType<typeof calculateDashboardUsage>["comparison"]["current"]["providerTotals"]
) {
  if (providers.length === 0) return "No data yet"
  return providers
    .map((provider) => `${formatProviderName(provider.providerId)} ${formatCount(provider.tokensTotal)}`)
    .join(", ")
}

function formatProviderName(providerId: string) {
  if (providerId === "codex") return "Codex"
  if (providerId === "cursor") return "Cursor"
  return providerId
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function formatTimestamp(value: number | null | undefined) {
  if (!value) return "Never"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value)
}
