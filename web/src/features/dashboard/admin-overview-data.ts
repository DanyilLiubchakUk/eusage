import {
  buildTotalTokenSeries,
  calculateCursorPool,
  calculateDashboardUsage,
  calculateQuotaPressure,
  calculateSampledUsage,
  formatUpdateFreshnessLabel,
  isSampleDayInWindow,
  percentChange,
  resolveMetricDateRange,
  type MetricRangeWindow,
  type ProviderTotal,
} from "../../lib/metrics"
import {
  formatCount,
  formatPercentDelta,
  formatProviderName,
  formatUsd,
} from "./dashboard-formatting"
import { dashboardSource, type ReadyDashboardState } from "./dashboard-source"
import {
  buildAvailableMetricRows,
  buildDeveloperLeaderboardRows,
  buildProviderStatusRows,
  buildRecentSyncRows,
  type QuotaPressureRow,
} from "./admin-overview-tables"
import type { AdminProviderFilter } from "./admin-provider-visibility-controls"

export type {
  AvailableMetricRow,
  DeveloperLeaderboardRow,
  ProviderStatusRow,
  RecentSyncRow,
  QuotaPressureRow,
} from "./admin-overview-tables"

export function buildAdminOverviewModel(state: ReadyDashboardState, now: number) {
  const source = dashboardSource(state, "admin")
  const range = resolveMetricDateRange(source.dateRange, now)
  const usage = calculateDashboardUsage({
    snapshots: source.snapshots,
    range: source.dateRange,
    now,
  })
  const sampledUsage = calculateSampledUsage({
    samples: source.metricSamples,
    window: range.current,
  })
  const previousSampledUsage = range.comparison
    ? calculateSampledUsage({
        samples: source.metricSamples,
        window: range.comparison,
      })
    : null
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
  const tokenSeries = buildTotalTokenSeries({
    samples: source.metricSamples,
    window: range.current,
  })
  const syncHealth = buildSyncHealth(source.developers)
  const freshnessLabel = formatUpdateFreshnessLabel(
    visibleUpdateTimestamps(source, range.current, usage.comparison.current),
    now
  )

  return {
    teamName: state.team.name,
    dateRange: source.dateRange,
    providerFilters: buildProviderFilters(state, source.visibleProviderIds),
    rangeLabel: usage.range.label,
    freshnessLabel,
    filterSummary: buildFilterSummary(source.visibleDeveloperIds, source.visibleProviderIds),
    kpis: buildKpis({
      activeDeveloperCount: source.developers.filter((developer) => developer.status === "active")
        .length,
      visibleDeveloperCount: source.visibleDeveloperIds.length,
      tokensPercentChange: previousSampledUsage
        ? percentChange(sampledUsage.tokensTotal, previousSampledUsage.tokensTotal)
        : null,
      sampledUsage,
      cursorPool,
      syncHealth,
    }),
    tokenSeries,
    providerBreakdownRows: buildProviderBreakdownRows(sampledUsage.providerTotals),
    developerLeaderboardRows: buildDeveloperLeaderboardRows(
      source.developers,
      source.snapshots,
      source.metricSamples,
      range.current
    ),
    providerStatusRows: buildProviderStatusRows({
      providerIds: source.visibleProviderIds,
      snapshots: source.snapshots,
      providerTotals: sampledUsage.providerTotals,
      quotaProviders: quota.perProvider,
      quotaDetails: quota.details,
      window: range.current,
    }),
    recentSyncRows: buildRecentSyncRows(source.developers),
    quotaPressureRows: quota.details.map((detail) => ({
      providerId: detail.providerId,
      providerName: formatProviderName(detail.providerId),
      developerName: detail.developerName ?? detail.developerId,
      label: detail.label,
      percent: detail.percent,
      status: detail.status,
      updatedAt: detail.updatedAt,
    } satisfies QuotaPressureRow)),
    availableMetricRows: buildAvailableMetricRows({
      usage: usage.comparison.current,
      sampledUsage,
      tokenSamples: source.metricSamples.filter((sample) => sample.metricKey.endsWith(".tokens.total")),
      cursorPool,
      quota,
      syncHealth,
      rangeLabel: usage.range.label,
    }),
    cursorPool,
    quota,
    syncHealth,
  }
}

type DashboardSource = ReturnType<typeof dashboardSource>

function buildFilterSummary(visibleDeveloperIds: string[], visibleProviderIds: string[]) {
  const providerText =
    visibleProviderIds.length > 0
      ? visibleProviderIds.map(formatProviderName).join(", ")
      : "No providers visible"
  return `${visibleDeveloperIds.length} developers · ${providerText}`
}

function buildProviderFilters(
  state: ReadyDashboardState,
  visibleProviderIds: string[]
): AdminProviderFilter[] {
  const disabledProviderIds = new Set(
    (state.providers ?? [])
      .filter((provider) => provider.status === "disabled")
      .map((provider) => provider.providerId)
  )
  const names = new Map(
    (state.providers ?? []).map((provider) => [
      provider.providerId,
      provider.name || formatProviderName(provider.providerId),
    ])
  )
  const visible = new Set(visibleProviderIds)
  const ids = uniqueStable([
    ...(state.providers ?? []).map((provider) => provider.providerId),
    ...state.snapshots.map((snapshot) => snapshot.providerId),
    ...state.metricSamples.map((sample) => sample.providerId),
  ]).filter((providerId) => !disabledProviderIds.has(providerId))

  return ids.map((providerId) => ({
    providerId,
    providerName: names.get(providerId) ?? formatProviderName(providerId),
    visible: visible.has(providerId),
  }))
}

function uniqueStable(values: string[]) {
  return [...new Set(values)]
}

function buildKpis(args: {
  activeDeveloperCount: number
  visibleDeveloperCount: number
  tokensPercentChange: number | null
  sampledUsage: ReturnType<typeof calculateSampledUsage>
  cursorPool: ReturnType<typeof calculateCursorPool>
  syncHealth: SyncHealth
}) {
  const topProvider = args.sampledUsage.topProvider

  return [
    {
      label: "Team usage",
      value: `${formatCount(args.sampledUsage.tokensTotal)} tokens`,
      meta: `${formatUsd(args.sampledUsage.estimatedCostUsd)} · ${formatPercentDelta(args.tokensPercentChange)}`,
    },
    {
      label: "Active developers",
      value: String(args.activeDeveloperCount),
      meta: `${args.visibleDeveloperCount} visible`,
    },
    {
      label: "Top provider",
      value: topProvider ? formatProviderName(topProvider.providerId) : "No data yet",
      meta: topProvider ? formatProviderTotal(topProvider) : "Waiting for usage rows",
    },
    {
      label: "Sync health",
      value: args.syncHealth.label,
      meta: args.syncHealth.status,
    },
    {
      label: "Cursor pool remaining",
      value: args.cursorPool.available ? formatUsd(args.cursorPool.remainingUsd) : "No data yet",
      meta: args.cursorPool.available ? args.cursorPool.coverage.label : "No Cursor pool data",
    },
  ]
}

export type ProviderBreakdownRow = {
  providerId: string
  providerName: string
  value: number
  unit: string
  label: string
}

function buildProviderBreakdownRows(providerTotals: ProviderTotal[]): ProviderBreakdownRow[] {
  return providerTotals.map((provider) => {
    const value = provider.tokensTotal > 0 ? provider.tokensTotal : provider.creditsUsed
    const unit = provider.tokensTotal > 0 ? "tokens" : "credits"
    return {
      providerId: provider.providerId,
      providerName: formatProviderName(provider.providerId),
      value,
      unit,
      label: formatProviderTotal(provider),
    }
  })
}

function visibleUpdateTimestamps(
  source: DashboardSource,
  window: MetricRangeWindow,
  totals: ReturnType<typeof calculateSampledUsage>
) {
  const snapshotTimestamps = [totals.oldestUpdatedAt, totals.newestUpdatedAt].filter(
    (timestamp): timestamp is number => timestamp !== null
  )
  const sampleTimestamps = source.metricSamples
    .filter((sample) => isSampleDayInWindow(sample.sampleDay, window))
    .map((sample) => sample.updatedAt)

  return [...snapshotTimestamps, ...sampleTimestamps]
}

type SyncHealth = {
  connectedDevices: number
  totalDevices: number
  label: string
  status: string
  latestContactAt: number | null
}

function buildSyncHealth(developers: ReadyDashboardState["developers"]): SyncHealth {
  const devices = developers.flatMap((developer) => developer.devices)
  const connectedDevices = devices.filter((device) => device.status === "connected").length
  const latestContactAt = devices.reduce<number | null>((latest, device) => {
    const contactAt = device.lastSyncAt ?? device.lastSeenAt ?? null
    if (contactAt === null) return latest
    return latest === null ? contactAt : Math.max(latest, contactAt)
  }, null)

  if (devices.length === 0) {
    return {
      connectedDevices: 0,
      totalDevices: 0,
      label: "No devices",
      status: "No sync data yet",
      latestContactAt: null,
    }
  }

  return {
    connectedDevices,
    totalDevices: devices.length,
    label: `${connectedDevices}/${devices.length} connected`,
    status: `Latest ${formatTimestamp(latestContactAt)}`,
    latestContactAt,
  }
}

export function formatTimestamp(value: number | null | undefined) {
  if (!value) return "Never"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value)
}

function formatProviderTotal(provider: Pick<ProviderTotal, "tokensTotal" | "creditsUsed">) {
  if (provider.tokensTotal > 0) return `${formatCount(provider.tokensTotal)} tokens`
  if (provider.creditsUsed > 0) return `${formatCount(provider.creditsUsed)} credits`
  return "Synced"
}
