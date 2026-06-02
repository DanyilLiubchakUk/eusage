import {
  buildMetricSeries,
  calculateCursorPool,
  calculateDashboardUsage,
  calculateQuotaPressure,
  formatUpdateFreshnessLabel,
  isSampleDayInWindow,
  resolveMetricDateRange,
  resolveVisibleMetricSource,
  type MetricDateRangeInput,
  type MetricRangeWindow,
  type UsageMetricSampleSourceRow,
  type UsageSnapshotSourceRow,
} from "../../lib/metrics"
import type { DashboardSourceState } from "./dashboard"
import {
  formatCount,
  formatPercentDelta,
  formatProviderBreakdown,
  formatProviderRows,
  formatUsd,
} from "./dashboard-formatting"

type DashboardPlaceholderProps = {
  state: DashboardSourceState
  now: number
}
type ReadyDashboardState = Extract<DashboardSourceState, { status: "ready" }>
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
}

export function AdminDashboardPlaceholder({ state, now }: DashboardPlaceholderProps) {
  if (state.status !== "ready") return <DashboardUnavailable state={state} />

  const source = dashboardSource(state, "admin")
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
    window: range.current,
    visibleDeveloperIds: source.visibleDeveloperIds,
    visibleProviderIds: source.visibleProviderIds,
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
          ["Visible developers", String(source.visibleDeveloperIds.length)],
          ["Cursor pool", formatCursorPool(cursorPool)],
          ["Quota pressure", formatQuota(quota.teamAveragePercent, quota.teamCoverage.label)],
        ]}
      />

      <DeveloperProviderTable developers={source.developers} snapshots={source.snapshots} />

      <section className="setup-card dashboard-card" aria-label="Team usage series">
        <strong>Chart source rows</strong>
        <p>{tokenSeries?.points.length ?? 0} daily token points from metric samples.</p>
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

function dashboardSource(state: ReadyDashboardState, view: "admin" | "tv") {
  const snapshots = state.snapshots as UsageSnapshotSourceRow[]
  const metricSamples = state.metricSamples as UsageMetricSampleSourceRow[]
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

  return {
    ...visibleSource,
    dateRange: settingsDateRange(settings),
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

function formatTimestamp(value: number | null | undefined) {
  if (!value) return "Never"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value)
}
