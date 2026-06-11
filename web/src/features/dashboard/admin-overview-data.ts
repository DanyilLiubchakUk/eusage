import {
  buildTotalTokenSeries,
  buildTotalEstimatedCostSeries,
  calculateCursorPool,
  calculateDashboardUsage,
  calculateQuotaPressure,
  calculateSampledUsage,
  formatUpdateFreshnessLabel,
  isMetricSampleInWindow,
  resolveMetricDateRange,
  type MetricRangeWindow,
  type ProviderTotal,
} from "../../lib/metrics"
import {
  formatCount,
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
import { buildDashboardDateRangeBounds } from "./dashboard-date-range-bounds"
import type { AdminProviderFilter } from "./admin-provider-visibility-controls"
import {
  buildProviderAccountLabelMap,
  buildProviderAccountSummaries,
  providerAccountLabelForDetail,
} from "./admin-provider-account-labels"

export type {
  AvailableMetricRow,
  DeveloperLeaderboardRow,
  ProviderStatusRow,
  RecentSyncRow,
  QuotaPressureRow,
} from "./admin-overview-tables"

export function buildAdminOverviewModel(state: ReadyDashboardState, now: number) {
  const source = dashboardSource(state, "admin")
  const rangeOptions = { reportingTimeZone: source.reportingTimeZone }
  const range = resolveMetricDateRange(source.dateRange, now, rangeOptions)
  const usage = calculateDashboardUsage({
    snapshots: source.snapshots,
    range: source.dateRange,
    now,
    options: rangeOptions,
  })
  const sampledUsage = calculateSampledUsage({
    samples: source.metricSamples,
    window: range.current,
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
  const tokenSeries = buildTotalTokenSeries({
    samples: source.metricSamples,
    window: range.current,
  })
  const estimatedCostSeries = buildTotalEstimatedCostSeries({
    samples: source.metricSamples,
    window: range.current,
  })
  const syncHealth = buildSyncHealth(source.developers)
  const providerAccountLabels = buildProviderAccountLabelMap(source.providerAccounts)
  const providerAccountSummaries = buildProviderAccountSummaries(
    source.providerAccounts,
    source.developers
  )
  const freshnessLabel = formatUpdateFreshnessLabel(
    visibleUpdateTimestamps(source, range.current, usage.comparison.current),
    now
  )
  const developerSummary = buildDeveloperSummary(source.developers)

  return {
    teamName: state.team.name,
    teamMetaLabel: `${freshnessLabel} · ${formatCount(
      developerSummary.totalDevelopers
    )} visible ${pluralize(developerSummary.totalDevelopers, "developer")}`,
    reportingTimeZone: source.reportingTimeZone,
    dateRange: source.dateRange,
    dateBounds: buildDashboardDateRangeBounds(source.metricSamples, now, source.reportingTimeZone),
    providerFilters: buildProviderFilters(state, source.visibleProviderIds),
    rangeLabel: usage.range.label,
    freshnessLabel,
    kpis: buildKpis({
      developerSummary,
      sampledUsage,
      cursorPool,
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
      providerAccountSummaries,
      window: range.current,
    }),
    recentSyncRows: buildRecentSyncRows(source.developers),
    quotaPressureRows: quota.details.map((detail) => ({
      providerId: detail.providerId,
      providerName: formatProviderName(detail.providerId),
      providerAccountLabel: providerAccountLabelForDetail(detail, providerAccountLabels),
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
    estimatedCostSeries,
  }
}

type DashboardSource = ReturnType<typeof dashboardSource>

function buildDeveloperSummary(developers: DashboardSource["developers"]) {
  let connectedDevelopers = 0
  let connectedDevices = 0

  for (const developer of developers) {
    const developerConnectedDevices = developer.devices.filter(
      (device) => device.status === "connected"
    ).length

    if (developerConnectedDevices > 0) connectedDevelopers += 1
    connectedDevices += developerConnectedDevices
  }

  return {
    totalDevelopers: developers.length,
    connectedDevelopers,
    connectedDevices,
  }
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
  developerSummary: ReturnType<typeof buildDeveloperSummary>
  sampledUsage: ReturnType<typeof calculateSampledUsage>
  cursorPool: ReturnType<typeof calculateCursorPool>
}) {
  const topProvider = args.sampledUsage.providerTotals[0] ?? null
  const nextProvider = args.sampledUsage.providerTotals[1] ?? null

  return [
    {
      label: "Team usage",
      value: `${formatCount(args.sampledUsage.tokensTotal)} tokens`,
      secondary: formatUsd(args.sampledUsage.estimatedCostUsd),
    },
    {
      label: "Developers",
      value: `${args.developerSummary.connectedDevelopers}/${args.developerSummary.totalDevelopers} connected`,
      secondary: formatConnectedDevices(args.developerSummary.connectedDevices),
    },
    {
      label: "Top providers",
      value: topProvider
        ? `${formatProviderName(topProvider.providerId)} - ${formatProviderWinReason(topProvider)}`
        : "No data yet",
      secondary: nextProvider
        ? `Next: ${formatProviderName(nextProvider.providerId)} - ${formatProviderTotal(nextProvider)}`
        : topProvider
          ? "Only provider with usage"
          : "No second provider",
    },
    {
      label: "Cursor budget",
      value: args.cursorPool.available
        ? `${formatCursorBudgetUsd(args.cursorPool.usedUsd)} / ${formatCursorBudgetUsd(
            args.cursorPool.limitUsd
          )}`
        : "No data yet",
      secondary: formatCursorBudgetPercent(args.cursorPool),
    },
  ]
}

function formatConnectedDevices(value: number) {
  return `${formatCount(value)} connected ${pluralize(value, "device")}`
}

function formatCursorBudgetPercent(pool: ReturnType<typeof calculateCursorPool>) {
  if (!pool.available) return "No Cursor budget data"
  if (pool.limitUsd <= 0) return "No budget limit"
  return `${Math.round((pool.usedUsd / pool.limitUsd) * 100)}% used`
}

function formatCursorBudgetUsd(value: number) {
  const wholeDollar = Math.abs(value - Math.round(value)) < 0.005
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: wholeDollar ? 0 : 2,
    maximumFractionDigits: wholeDollar ? 0 : 2,
  }).format(value)
}

function pluralize(value: number, singular: string) {
  return value === 1 ? singular : `${singular}s`
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
    .filter((sample) => isMetricSampleInWindow(sample, window))
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

function formatProviderWinReason(provider: ProviderTotal) {
  if (provider.tokensTotal > 0) return `${formatCount(provider.tokensTotal)} tokens`
  if (provider.creditsUsed > 0) return `${formatCount(provider.creditsUsed)} credits`
  return "latest synced"
}
