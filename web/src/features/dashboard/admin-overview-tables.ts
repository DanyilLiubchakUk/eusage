import {
  calculateCursorPool,
  calculateDashboardUsage,
  calculateQuotaPressure,
  calculateSampledUsage,
  canonicalConsumedSamples,
  dedupeLatestDeviceSnapshots,
  finiteNumber,
  isEstimatedCostSample,
  isTotalTokenSample,
  isTimestampInWindow,
  snapshotRangeTimestamp,
  type MetricRangeWindow,
  type ProviderTotal,
  type UsageMetricSampleSourceRow,
  type UsageSnapshotSourceRow,
} from "../../lib/metrics"
import { formatCount, formatProviderName, formatUsd } from "./dashboard-formatting"
import type { ReadyDashboardState } from "./dashboard-source"

export type DeveloperLeaderboardRow = {
  developerId: string
  developerName: string
  developerStatus: string
  tokensTotal: number
  estimatedCostUsd: number
  creditsUsed: number
  providerCount: number
  latestUpdatedAt: number | null
}

export function buildDeveloperLeaderboardRows(
  developers: ReadyDashboardState["developers"],
  snapshots: UsageSnapshotSourceRow[],
  metricSamples: UsageMetricSampleSourceRow[],
  window: MetricRangeWindow
): DeveloperLeaderboardRow[] {
  const names = new Map<string, string>(
    developers.map((developer) => [String(developer.id), developer.displayName])
  )
  const statuses = new Map<string, string>(
    developers.map((developer) => [String(developer.id), developer.status])
  )
  const rows = new Map<string, DeveloperLeaderboardRow>()

  for (const sample of canonicalConsumedSamples(metricSamples, window)) {
    const developerId = sample.developerId
    if (!developerId) continue
    const row = rows.get(developerId) ?? {
      developerId,
      developerName: names.get(developerId) ?? developerId,
      developerStatus: statuses.get(developerId) ?? "unknown",
      tokensTotal: 0,
      estimatedCostUsd: 0,
      creditsUsed: 0,
      providerCount: 0,
      latestUpdatedAt: null,
    }
    if (isTotalTokenSample(sample)) row.tokensTotal += sample.value
    if (isEstimatedCostSample(sample)) row.estimatedCostUsd += sample.value
    row.latestUpdatedAt =
      row.latestUpdatedAt === null
        ? sample.updatedAt
        : Math.max(row.latestUpdatedAt, sample.updatedAt)
    rows.set(developerId, row)
  }

  for (const snapshot of currentSnapshotRows(snapshots, window)) {
    const row = rows.get(snapshot.developerId) ?? {
      developerId: snapshot.developerId,
      developerName: names.get(snapshot.developerId) ?? snapshot.developerName ?? snapshot.developerId,
      developerStatus: statuses.get(snapshot.developerId) ?? "unknown",
      tokensTotal: 0,
      estimatedCostUsd: 0,
      creditsUsed: 0,
      providerCount: 0,
      latestUpdatedAt: null,
    }
    row.creditsUsed += finiteNumber(snapshot.summary.creditsUsed)
    if (!row.providerCount) row.providerCount = providerCountForDeveloper(snapshot.developerId, snapshots, window)
    row.latestUpdatedAt =
      row.latestUpdatedAt === null
        ? snapshot.updatedAt
        : Math.max(row.latestUpdatedAt, snapshot.updatedAt)
    rows.set(snapshot.developerId, row)
  }

  return [...rows.values()]
    .sort(
      (left, right) =>
        right.estimatedCostUsd - left.estimatedCostUsd ||
        right.tokensTotal - left.tokensTotal ||
        right.creditsUsed - left.creditsUsed ||
        left.developerName.localeCompare(right.developerName)
    )
    .slice(0, 5)
}

export type ProviderStatusRow = {
  providerId: string
  providerName: string
  value: string
  quota: string
  status: string
  lastUpdatedAt: number | null
}

export function buildProviderStatusRows(args: {
  providerIds: string[]
  snapshots: UsageSnapshotSourceRow[]
  providerTotals: ProviderTotal[]
  quotaProviders: ReturnType<typeof calculateQuotaPressure>["perProvider"]
  quotaDetails: ReturnType<typeof calculateQuotaPressure>["details"]
  window: MetricRangeWindow
}): ProviderStatusRow[] {
  const totals = new Map(args.providerTotals.map((provider) => [provider.providerId, provider]))
  const quotaByProvider = new Map(
    args.quotaProviders.map((provider) => [provider.providerId, provider])
  )
  const latestByProvider = new Map<string, UsageSnapshotSourceRow>()
  for (const snapshot of currentSnapshotRows(args.snapshots, args.window)) {
    const current = latestByProvider.get(snapshot.providerId)
    if (!current || snapshot.updatedAt > current.updatedAt) {
      latestByProvider.set(snapshot.providerId, snapshot)
    }
  }
  const latestQuotaByProvider = new Map<string, number>()
  for (const detail of args.quotaDetails) {
    latestQuotaByProvider.set(
      detail.providerId,
      Math.max(latestQuotaByProvider.get(detail.providerId) ?? 0, detail.updatedAt)
    )
  }

  return args.providerIds
    .map((providerId) => {
      const total = totals.get(providerId)
      const quota = quotaByProvider.get(providerId)
      const latest = latestByProvider.get(providerId)
      const latestQuotaAt = latestQuotaByProvider.get(providerId) ?? null
      const lastUpdatedAt =
        latest && latestQuotaAt ? Math.max(latest.updatedAt, latestQuotaAt) : latestQuotaAt ?? latest?.updatedAt ?? null
      return {
        providerId,
        providerName: formatProviderName(providerId),
        value: total ? formatProviderTotal(total) : "No data yet",
        quota:
          quota?.averagePercent === null || !quota
            ? quota?.coverage.label ?? "0 reports"
            : `${Math.round(quota.averagePercent)}% avg · ${quota.coverage.label}`,
        status: lastUpdatedAt ? "Synced" : "No data yet",
        lastUpdatedAt,
      }
    })
    .sort((left, right) => left.providerName.localeCompare(right.providerName))
}

export type RecentSyncRow = {
  developerName: string
  deviceName: string
  status: string
  lastContactAt: number | null
}

export type QuotaPressureRow = {
  providerId: string
  providerName: string
  developerName: string
  label: string
  percent: number
  status: string
  updatedAt: number
}

export function buildRecentSyncRows(developers: ReadyDashboardState["developers"]): RecentSyncRow[] {
  return developers
    .flatMap((developer) =>
      developer.devices.map((device) => ({
        developerName: developer.displayName,
        deviceName: device.deviceName || device.deviceId,
        status: device.status,
        lastContactAt: device.lastSyncAt ?? device.lastSeenAt ?? null,
      }))
    )
    .sort((left, right) => (right.lastContactAt ?? 0) - (left.lastContactAt ?? 0))
    .slice(0, 6)
}

export type AvailableMetricRow = {
  metric: string
  value: string
  source: string
  status: string
  tooltip: string
}

type SyncHealthLike = {
  label: string
  status: string
  totalDevices: number
}

export function buildAvailableMetricRows(args: {
  usage: ReturnType<typeof calculateDashboardUsage>["comparison"]["current"]
  sampledUsage: ReturnType<typeof calculateSampledUsage>
  tokenSamples: UsageMetricSampleSourceRow[]
  cursorPool: ReturnType<typeof calculateCursorPool>
  quota: ReturnType<typeof calculateQuotaPressure>
  syncHealth: SyncHealthLike
  rangeLabel: string
}): AvailableMetricRow[] {
  const tokenSampleCount = args.tokenSamples.length
  const hasTokenSamples = (args.sampledUsage.tokenSampleCount ?? 0) > 0
  const hasCostSamples = (args.sampledUsage.costSampleCount ?? 0) > 0

  return [
    metricRow(
      "Tokens burned",
      hasTokenSamples ? formatCount(args.sampledUsage.tokensTotal) : "No data yet",
      "Metric samples",
      tokenSampleCount > 0 ? `${tokenSampleCount} token samples` : "No token samples",
      metricTooltip({
        meaning: "Total visible token usage.",
        source: "Canonical provider token samples ending in .tokens.total.",
        unit: "tokens",
        coverage: `${tokenSampleCount} token samples in ${args.rangeLabel}.`,
        status: tokenSampleCount > 0 ? "Provider-reported where available." : "No sample data yet.",
      })
    ),
    metricRow(
      "Estimated cost",
      hasCostSamples ? formatUsd(args.sampledUsage.estimatedCostUsd) : "No data yet",
      "Metric samples",
      hasCostSamples ? `${args.sampledUsage.costSampleCount} cost samples` : "No cost samples",
      metricTooltip({
        meaning: "Estimated visible API cost.",
        source: "Canonical provider cost samples ending in .cost.estimated.",
        unit: "USD.",
        coverage: `${args.sampledUsage.costSampleCount ?? 0} visible cost samples in ${args.rangeLabel}.`,
        status: hasCostSamples ? "Estimated when providers do not report exact cost." : "No sample data yet.",
      })
    ),
    metricRow(
      "Provider budget/spend",
      args.usage.budgetUsedUsd > 0 ? formatUsd(args.usage.budgetUsedUsd) : "No data yet",
      "Provider summaries",
      args.usage.budgetUsedUsd > 0 ? "Reported spend" : "No budget data",
      metricTooltip({
        meaning: "Visible provider budget or spend values.",
        source: "Provider-reported budget fields normalized by each plugin.",
        unit: "USD.",
        coverage: `${args.usage.snapshotCount} visible snapshots in ${args.rangeLabel}.`,
        status: "Provider-reported when the provider exposes budget fields.",
      })
    ),
    metricRow(
      "Quota pressure",
      args.quota.teamAveragePercent === null
        ? "No data yet"
        : `${Math.round(args.quota.teamAveragePercent)}% avg · ${formatWorstQuota(args.quota)}`,
      "Metric samples",
      `${args.quota.teamCoverage.label} · ${args.quota.highPressureCount} high`,
      metricTooltip({
        meaning: "Average and worst visible quota pressure.",
        source: "Provider-reported quota metric samples, with snapshot fields only when samples are missing.",
        unit: "percent.",
        coverage: `${args.quota.teamCoverage.label} in ${args.rangeLabel}. ${args.quota.perProvider.length} visible providers.`,
        status: `Worst active pressure: ${formatWorstQuota(args.quota)}. Missing reports are excluded.`,
      })
    ),
    metricRow(
      "Credits",
      args.usage.creditsUsed > 0 ? formatCount(args.usage.creditsUsed) : "No data yet",
      "Provider summaries",
      args.usage.creditsUsed > 0 ? "Reported credits" : "No credit data",
      metricTooltip({
        meaning: "Visible provider credits used.",
        source: "Provider-reported credit fields normalized by each plugin.",
        unit: "credits.",
        coverage: `${args.usage.snapshotCount} visible snapshots in ${args.rangeLabel}.`,
        status: "Provider-reported when credit units are available.",
      })
    ),
    metricRow(
      "Requests",
      args.usage.requestsUsed > 0 ? formatCount(args.usage.requestsUsed) : "No data yet",
      "Provider summaries",
      args.usage.requestsUsed > 0 ? "Reported requests" : "No request data",
      metricTooltip({
        meaning: "Visible provider request counts.",
        source: "Provider-reported request fields normalized by each plugin.",
        unit: "requests.",
        coverage: `${args.usage.snapshotCount} visible snapshots in ${args.rangeLabel}.`,
        status: "Provider-reported when request counts are available.",
      })
    ),
    metricRow(
      "Cursor pool",
      args.cursorPool.available ? formatUsd(args.cursorPool.remainingUsd) : "No data yet",
      "Cursor",
      args.cursorPool.available ? args.cursorPool.coverage.label : "No Cursor pool data",
      metricTooltip({
        meaning: "Remaining Cursor shared pool or summed Team On-Demand budget.",
        source: "Cursor pooled fields first, then per-developer fallback.",
        unit: "USD.",
        coverage: args.cursorPool.coverage.label,
        status: args.cursorPool.available ? "Provider-reported or fallback from visible Cursor rows." : "No visible Cursor budget rows.",
      })
    ),
    metricRow(
      "Sync health",
      args.syncHealth.label,
      "Device status",
      args.syncHealth.status,
      metricTooltip({
        meaning: "Latest visible desktop device sync state.",
        source: "Device lastSyncAt or lastSeenAt rows.",
        unit: "devices.",
        coverage: `${args.syncHealth.totalDevices} visible devices.`,
        status: args.syncHealth.status,
      })
    ),
  ]
}

function formatWorstQuota(quota: ReturnType<typeof calculateQuotaPressure>) {
  if (!quota.worstSingle) return "No worst"
  return `${Math.round(quota.worstSingle.percent)}% worst`
}

function providerCountForDeveloper(
  developerId: string,
  snapshots: UsageSnapshotSourceRow[],
  window: MetricRangeWindow
) {
  return new Set(
    currentSnapshotRows(snapshots, window)
      .filter((snapshot) => snapshot.developerId === developerId)
      .map((snapshot) => snapshot.providerId)
  ).size
}

function currentSnapshotRows(snapshots: UsageSnapshotSourceRow[], window: MetricRangeWindow) {
  return dedupeLatestDeviceSnapshots(snapshots).filter((snapshot) =>
    isTimestampInWindow(snapshotRangeTimestamp(snapshot), window)
  )
}

function metricRow(
  metric: string,
  value: string,
  source: string,
  status: string,
  tooltip: string
): AvailableMetricRow {
  return {
    metric,
    value,
    source,
    status,
    tooltip,
  }
}

function formatProviderTotal(provider: Pick<ProviderTotal, "tokensTotal" | "creditsUsed">) {
  if (provider.tokensTotal > 0) return `${formatCount(provider.tokensTotal)} tokens`
  if (provider.creditsUsed > 0) return `${formatCount(provider.creditsUsed)} credits`
  return "Synced"
}

function metricTooltip(args: {
  meaning: string
  source: string
  unit: string
  coverage: string
  status: string
}) {
  return `${args.meaning} Source: ${args.source} Unit: ${args.unit} Coverage: ${args.coverage} Status: ${args.status}`
}
