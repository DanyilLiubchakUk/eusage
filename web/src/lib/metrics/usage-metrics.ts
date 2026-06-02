import {
  isSampleDayInWindow,
  isTimestampInWindow,
  resolveMetricDateRange,
} from "./date-ranges"
import type {
  MetricDateRangeInput,
  MetricRangeWindow,
  ResolvedMetricDateRange,
  UsageMetricSampleSourceRow,
  UsageSnapshotSourceRow,
} from "./types"

export type UsageTotals = {
  snapshotCount: number
  tokensTotal: number
  estimatedCostUsd: number
  budgetUsedUsd: number
  creditsUsed: number
  requestsUsed: number
  oldestUpdatedAt: number | null
  newestUpdatedAt: number | null
  topProvider: ProviderTotal | null
  providerTotals: ProviderTotal[]
}

export type ProviderTotal = {
  providerId: string
  tokensTotal: number
  estimatedCostUsd: number
  creditsUsed: number
  snapshotCount: number
}

export type UsageComparison = {
  tokensPercentChange: number | null
  estimatedCostPercentChange: number | null
  current: UsageTotals
  previous: UsageTotals | null
}

export type MetricSeriesPoint = {
  day: string
  value: number
}

export type MetricSeries = {
  metricKey: string
  unit: string | null
  points: MetricSeriesPoint[]
}

export function calculateDashboardUsage(args: {
  snapshots: UsageSnapshotSourceRow[]
  range: MetricDateRangeInput
  now: number
}): {
  range: ResolvedMetricDateRange
  comparison: UsageComparison
} {
  const range = resolveMetricDateRange(args.range, args.now)
  const current = calculateUsageTotals(args.snapshots, range.current)
  const previous = range.comparison
    ? calculateUsageTotals(args.snapshots, range.comparison)
    : null

  return {
    range,
    comparison: {
      tokensPercentChange: previous
        ? percentChange(current.tokensTotal, previous.tokensTotal)
        : null,
      estimatedCostPercentChange: previous
        ? percentChange(current.estimatedCostUsd, previous.estimatedCostUsd)
        : null,
      current,
      previous,
    },
  }
}

export function calculateUsageTotals(
  snapshots: UsageSnapshotSourceRow[],
  window: MetricRangeWindow
): UsageTotals {
  const rows = dedupeLatestDeviceSnapshots(snapshots).filter((row) =>
    isTimestampInWindow(snapshotRangeTimestamp(row), window)
  )
  const providerTotals = new Map<string, ProviderTotal>()
  let tokensTotal = 0
  let estimatedCostUsd = 0
  let budgetUsedUsd = 0
  let creditsUsed = 0
  let requestsUsed = 0
  let oldestUpdatedAt: number | null = null
  let newestUpdatedAt: number | null = null

  for (const row of rows) {
    const tokens = finiteNumber(row.summary.tokensTotal)
    const cost = finiteNumber(row.summary.estimatedCostUsd)
    tokensTotal += tokens
    estimatedCostUsd += cost
    budgetUsedUsd += finiteNumber(row.summary.budgetUsedUsd)
    creditsUsed += finiteNumber(row.summary.creditsUsed)
    requestsUsed += finiteNumber(row.summary.requestsUsed)
    oldestUpdatedAt =
      oldestUpdatedAt === null ? row.updatedAt : Math.min(oldestUpdatedAt, row.updatedAt)
    newestUpdatedAt =
      newestUpdatedAt === null ? row.updatedAt : Math.max(newestUpdatedAt, row.updatedAt)

    const provider = providerTotals.get(row.providerId) ?? {
      providerId: row.providerId,
      tokensTotal: 0,
      estimatedCostUsd: 0,
      creditsUsed: 0,
      snapshotCount: 0,
    }
    provider.tokensTotal += tokens
    provider.estimatedCostUsd += cost
    provider.creditsUsed += finiteNumber(row.summary.creditsUsed)
    provider.snapshotCount += 1
    providerTotals.set(row.providerId, provider)
  }

  const sortedProviderTotals = [...providerTotals.values()].sort(
    (left, right) =>
      right.estimatedCostUsd - left.estimatedCostUsd ||
      right.tokensTotal - left.tokensTotal ||
      left.providerId.localeCompare(right.providerId)
  )

  return {
    snapshotCount: rows.length,
    tokensTotal,
    estimatedCostUsd,
    budgetUsedUsd,
    creditsUsed,
    requestsUsed,
    oldestUpdatedAt,
    newestUpdatedAt,
    topProvider: sortedProviderTotals[0] ?? null,
    providerTotals: sortedProviderTotals,
  }
}

export function buildMetricSeries(args: {
  samples: UsageMetricSampleSourceRow[]
  metricKey: string
  window: MetricRangeWindow
}): MetricSeries {
  const valuesByDay = new Map<string, number>()
  let unit: string | null = null

  for (const sample of args.samples) {
    if (sample.metricKey !== args.metricKey) continue
    if (!isSampleDayInWindow(sample.sampleDay, args.window)) continue

    unit ??= sample.unit
    valuesByDay.set(sample.sampleDay, (valuesByDay.get(sample.sampleDay) ?? 0) + sample.value)
  }

  return {
    metricKey: args.metricKey,
    unit,
    points: [...valuesByDay.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([day, value]) => ({ day, value })),
  }
}

export function dedupeLatestDeviceSnapshots(rows: UsageSnapshotSourceRow[]) {
  const rowsByIdentity = new Map<string, UsageSnapshotSourceRow>()

  for (const row of rows) {
    const key = [
      row.developerId,
      row.providerId,
      row.periodKey,
      row.dataIdentity,
    ].join("\u0000")
    const current = rowsByIdentity.get(key)
    if (!current || row.updatedAt > current.updatedAt) {
      rowsByIdentity.set(key, row)
    }
  }

  return [...rowsByIdentity.values()]
}

export function percentChange(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return null
  }
  return ((current - previous) / Math.abs(previous)) * 100
}

export function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export function snapshotRangeTimestamp(row: UsageSnapshotSourceRow) {
  return row.periodEnd ?? row.periodStart ?? row.capturedAt
}
