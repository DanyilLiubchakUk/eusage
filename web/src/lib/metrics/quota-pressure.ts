import { isSampleDayInWindow, isTimestampInWindow } from "./date-ranges"
import { dedupeLatestDeviceSnapshots, snapshotRangeTimestamp } from "./usage-metrics"
import type { MetricRangeWindow, UsageMetricSampleSourceRow, UsageSnapshotSourceRow } from "./types"

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
  details: QuotaPressureDetail[]
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

export type QuotaPressureDetail = {
  developerId: string
  developerName: string | null
  providerId: string
  label: string
  percent: number
  status: "normal" | "warning" | "critical"
  updatedAt: number
}

export function calculateQuotaPressure(args: {
  snapshots: UsageSnapshotSourceRow[]
  metricSamples?: UsageMetricSampleSourceRow[]
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
    details: quotaDetails(rows, args.metricSamples ?? [], args.window, developerIds, providerIds),
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

function quotaDetails(
  rows: UsageSnapshotSourceRow[],
  samples: UsageMetricSampleSourceRow[],
  window: MetricRangeWindow,
  developerIds: Set<string>,
  providerIds: Set<string>
): QuotaPressureDetail[] {
  const details = [
    ...rows
    .filter((row) => developerIds.has(row.developerId) && providerIds.has(row.providerId))
    .flatMap((row) => providerQuotaDetails(row)),
    ...sampleQuotaDetails(samples, window, rows, developerIds, providerIds),
  ]
  const byIdentity = new Map<string, QuotaPressureDetail>()

  for (const detail of details) {
    const key = `${detail.developerId}\u0000${detail.providerId}\u0000${detail.label}`
    const current = byIdentity.get(key)
    if (!current || detail.updatedAt > current.updatedAt) byIdentity.set(key, detail)
  }

  return [...byIdentity.values()].sort(
    (left, right) =>
      right.percent - left.percent ||
      left.providerId.localeCompare(right.providerId) ||
      left.label.localeCompare(right.label) ||
      left.developerId.localeCompare(right.developerId)
  )
}

function providerQuotaDetails(row: UsageSnapshotSourceRow): QuotaPressureDetail[] {
  const details: Array<{ label: string; percent: unknown }> = []
  const provider = row.summary.provider

  if (row.providerId === "cursor") {
    const cursor = provider?.cursor
    details.push(
      { label: "Total usage", percent: cursor?.planTotalPercentUsed ?? row.summary.quotaPercent },
      { label: "Auto + composer", percent: cursor?.autoPercentUsed },
      { label: "API usage", percent: cursor?.apiPercentUsed }
    )
  } else if (row.providerId === "codex") {
    const codex = provider?.codex
    details.push(
      { label: "Session", percent: codex?.sessionUsedPercent },
      { label: "Weekly", percent: codex?.weeklyUsedPercent },
      { label: "Reviews", percent: codex?.reviewUsedPercent }
    )
  } else if (row.providerId === "claude") {
    const claude = provider?.claude
    details.push(
      { label: "Session", percent: claude?.sessionUsedPercent },
      { label: "Weekly", percent: claude?.weeklyUsedPercent }
    )
    for (const model of claude?.modelWindows ?? []) {
      details.push({ label: model.name ?? model.key ?? "Model window", percent: model.usedPercent })
    }
  } else if (row.providerId === "jetbrains-ai-assistant") {
    details.push({
      label: "Quota",
      percent: provider?.["jetbrains-ai-assistant"]?.quotaUsedPercent ?? row.summary.quotaPercent,
    })
  } else {
    details.push({ label: "Quota", percent: row.summary.quotaPercent })
  }

  return details
    .map(({ label, percent }) => {
      if (typeof percent !== "number" || !Number.isFinite(percent)) return null
      return quotaDetail({
        developerId: row.developerId,
        developerName: row.developerName ?? null,
        providerId: row.providerId,
        label,
        percent,
        updatedAt: row.updatedAt,
      })
    })
    .filter((detail): detail is QuotaPressureDetail => detail !== null)
}

function quotaDetail(args: {
  developerId: string
  developerName: string | null
  providerId: string
  label: string
  percent: number
  updatedAt: number
}): QuotaPressureDetail {
  return {
    ...args,
    status: quotaStatus(args.percent),
  }
}

function sampleQuotaDetails(
  samples: UsageMetricSampleSourceRow[],
  window: MetricRangeWindow,
  rows: UsageSnapshotSourceRow[],
  developerIds: Set<string>,
  providerIds: Set<string>
): QuotaPressureDetail[] {
  const names = new Map(
    rows.map((row) => [`${row.developerId}\u0000${row.providerId}`, row.developerName ?? null])
  )

  return samples
    .filter((sample) => sample.unit === "percent")
    .filter((sample) => isSampleDayInWindow(sample.sampleDay, window))
    .filter((sample) => {
      if (!sample.developerId) return false
      return developerIds.has(sample.developerId) && providerIds.has(sample.providerId)
    })
    .map((sample) => {
      const label = quotaSampleLabel(sample.metricKey)
      if (!label) return null
      return quotaDetail({
        developerId: sample.developerId ?? "",
        developerName: names.get(`${sample.developerId}\u0000${sample.providerId}`) ?? null,
        providerId: sample.providerId,
        label,
        percent: sample.value,
        updatedAt: sample.updatedAt,
      })
    })
    .filter((detail): detail is QuotaPressureDetail => detail !== null)
}

function quotaSampleLabel(metricKey: string) {
  if (metricKey === "cursor.plan.percentUsed") return "Total usage"
  if (metricKey === "cursor.auto.percentUsed") return "Auto + composer"
  if (metricKey === "cursor.api.percentUsed") return "API usage"
  if (metricKey === "codex.session.percentUsed") return "Session"
  if (metricKey === "codex.weekly.percentUsed") return "Weekly"
  if (metricKey === "codex.reviews.percentUsed") return "Reviews"
  if (metricKey === "claude.session.percentUsed") return "Session"
  if (metricKey === "claude.weekly.percentUsed") return "Weekly"
  if (metricKey === "jetbrains-ai-assistant.quota.percentUsed") return "Quota"

  const codexWindow = metricKey.match(/^codex\.rateLimit\.(.+)\.(session|weekly)\.percentUsed$/)
  if (codexWindow) return `${humanizeSegment(codexWindow[1])} ${codexWindow[2]}`

  const claudeModel = metricKey.match(/^claude\.model\.(.+)\.percentUsed$/)
  if (claudeModel) return humanizeSegment(claudeModel[1])

  return null
}

function humanizeSegment(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_.]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
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
