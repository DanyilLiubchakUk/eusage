import { isTimestampInWindow } from "./date-ranges"
import { dedupeLatestDeviceSnapshots, snapshotRangeTimestamp } from "./usage-metrics"
import type { MetricRangeWindow, UsageSnapshotSourceRow } from "./types"

const WARNING_THRESHOLD = 80
const CRITICAL_THRESHOLD = 95

export type QuotaPressureMetrics = {
  teamAveragePercent: number | null
  teamCoverage: Coverage
  highPressureCount: number
  worstSingle: QuotaPressurePoint | null
  worstDeveloperAverage: DeveloperQuotaAverage | null
  perDeveloper: DeveloperQuotaAverage[]
  perProvider: ProviderQuotaAverage[]
}

export type Coverage = {
  reportingCount: number
  totalCount: number
  missingCount: number
  label: string
}

export type QuotaPressurePoint = {
  developerId: string
  developerName: string | null
  providerId: string
  percent: number
  status: "normal" | "warning" | "critical"
}

export type DeveloperQuotaAverage = {
  developerId: string
  developerName: string | null
  averagePercent: number | null
  coverage: Coverage
}

export type ProviderQuotaAverage = {
  providerId: string
  averagePercent: number | null
  coverage: Coverage
}

export function calculateQuotaPressure(args: {
  snapshots: UsageSnapshotSourceRow[]
  window: MetricRangeWindow
  visibleDeveloperIds?: string[]
  visibleProviderIds?: string[]
}): QuotaPressureMetrics {
  const rows = latestRowsByDeveloperProvider(args.snapshots, args.window)
  const developerIds = new Set(args.visibleDeveloperIds ?? rows.map((row) => row.developerId))
  const providerIds = new Set(args.visibleProviderIds ?? rows.map((row) => row.providerId))
  const points = quotaPoints(rows, developerIds, providerIds)
  const totalCount = developerIds.size * providerIds.size
  const teamAveragePercent = average(points.map((point) => point.percent))
  const perDeveloper = [...developerIds].map((developerId) =>
    developerAverage(developerId, providerIds, points)
  )
  const perProvider = [...providerIds].map((providerId) =>
    providerAverage(providerId, developerIds, points)
  )

  return {
    teamAveragePercent,
    teamCoverage: coverage(points.length, totalCount, "reporting"),
    highPressureCount: points.filter((point) => point.percent >= WARNING_THRESHOLD).length,
    worstSingle: sortPoints(points)[0] ?? null,
    worstDeveloperAverage: [...perDeveloper]
      .filter((row) => row.averagePercent !== null)
      .sort(
        (left, right) =>
          (right.averagePercent ?? 0) - (left.averagePercent ?? 0) ||
          left.developerId.localeCompare(right.developerId)
      )[0] ?? null,
    perDeveloper,
    perProvider,
  }
}

function latestRowsByDeveloperProvider(
  snapshots: UsageSnapshotSourceRow[],
  window: MetricRangeWindow
) {
  const rowsByPair = new Map<string, UsageSnapshotSourceRow>()

  for (const row of dedupeLatestDeviceSnapshots(snapshots)) {
    if (!isTimestampInWindow(snapshotRangeTimestamp(row), window)) continue

    const key = `${row.developerId}\u0000${row.providerId}`
    const current = rowsByPair.get(key)
    if (!current || row.updatedAt > current.updatedAt) rowsByPair.set(key, row)
  }

  return [...rowsByPair.values()]
}

function quotaPoints(
  rows: UsageSnapshotSourceRow[],
  developerIds: Set<string>,
  providerIds: Set<string>
): QuotaPressurePoint[] {
  return rows
    .filter((row) => developerIds.has(row.developerId) && providerIds.has(row.providerId))
    .map((row) => {
      const percent = row.summary.quotaPercent
      if (typeof percent !== "number" || !Number.isFinite(percent)) return null

      return {
        developerId: row.developerId,
        developerName: row.developerName ?? null,
        providerId: row.providerId,
        percent,
        status: quotaStatus(percent),
      }
    })
    .filter((point): point is QuotaPressurePoint => point !== null)
}

function developerAverage(
  developerId: string,
  providerIds: Set<string>,
  points: QuotaPressurePoint[]
): DeveloperQuotaAverage {
  const developerPoints = points.filter((point) => point.developerId === developerId)

  return {
    developerId,
    developerName: developerPoints[0]?.developerName ?? null,
    averagePercent: average(developerPoints.map((point) => point.percent)),
    coverage: coverage(developerPoints.length, providerIds.size, "providers"),
  }
}

function providerAverage(
  providerId: string,
  developerIds: Set<string>,
  points: QuotaPressurePoint[]
): ProviderQuotaAverage {
  const providerPoints = points.filter((point) => point.providerId === providerId)

  return {
    providerId,
    averagePercent: average(providerPoints.map((point) => point.percent)),
    coverage: coverage(providerPoints.length, developerIds.size, "developers"),
  }
}

function coverage(reportingCount: number, totalCount: number, noun: string): Coverage {
  return {
    reportingCount,
    totalCount,
    missingCount: totalCount - reportingCount,
    label: `${reportingCount}/${totalCount} ${noun}`,
  }
}

function average(values: number[]) {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function sortPoints(points: QuotaPressurePoint[]) {
  return [...points].sort(
    (left, right) =>
      right.percent - left.percent ||
      left.providerId.localeCompare(right.providerId) ||
      left.developerId.localeCompare(right.developerId)
  )
}

function quotaStatus(percent: number): QuotaPressurePoint["status"] {
  if (percent >= CRITICAL_THRESHOLD) return "critical"
  if (percent >= WARNING_THRESHOLD) return "warning"
  return "normal"
}
