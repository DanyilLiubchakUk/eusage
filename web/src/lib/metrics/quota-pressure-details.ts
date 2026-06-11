import { isMetricSampleInWindow } from "./date-ranges"
import type { MetricRangeWindow, UsageMetricSampleSourceRow, UsageSnapshotSourceRow } from "./types"

export const QUOTA_WARNING_THRESHOLD = 80
export const QUOTA_CRITICAL_THRESHOLD = 95

export type QuotaPressureStatus = "normal" | "warning" | "critical"

export type QuotaPressureDetail = {
  developerId: string
  developerName: string | null
  providerId: string
  providerAccountFingerprint?: string
  label: string
  percent: number
  status: QuotaPressureStatus
  updatedAt: number
}

export function quotaDetails(
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
    const key = [
      detail.developerId,
      detail.providerId,
      detail.providerAccountFingerprint ?? "",
      detail.label,
    ].join("\u0000")
    const current = byIdentity.get(key)
    if (!current || detail.updatedAt > current.updatedAt) byIdentity.set(key, detail)
  }

  const values = [...byIdentity.values()]
  const pairsWithSpecificDetails = new Set(
    values
      .filter((detail) => detail.label !== "Quota")
      .map(detailPairKey)
  )

  return values.filter((detail) => {
    if (detail.label !== "Quota") return true
    return !pairsWithSpecificDetails.has(detailPairKey(detail))
  }).sort(
    (left, right) =>
      right.percent - left.percent ||
      left.providerId.localeCompare(right.providerId) ||
      left.label.localeCompare(right.label) ||
      left.developerId.localeCompare(right.developerId)
  )
}

export function quotaStatus(percent: number): QuotaPressureStatus {
  if (percent >= QUOTA_CRITICAL_THRESHOLD) return "critical"
  if (percent >= QUOTA_WARNING_THRESHOLD) return "warning"
  return "normal"
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

  const normalized = details
    .map(({ label, percent }) => {
      if (typeof percent !== "number" || !Number.isFinite(percent)) return null
      return quotaDetail({
        developerId: row.developerId,
        developerName: row.developerName ?? null,
        providerId: row.providerId,
        providerAccountFingerprint: row.providerAccountFingerprint,
        label,
        percent,
        updatedAt: row.updatedAt,
      })
    })
    .filter((detail): detail is QuotaPressureDetail => detail !== null)

  if (normalized.length > 0) return normalized

  if (typeof row.summary.quotaPercent === "number" && Number.isFinite(row.summary.quotaPercent)) {
    return [
      quotaDetail({
        developerId: row.developerId,
        developerName: row.developerName ?? null,
        providerId: row.providerId,
        providerAccountFingerprint: row.providerAccountFingerprint,
        label: "Quota",
        percent: row.summary.quotaPercent,
        updatedAt: row.updatedAt,
      }),
    ]
  }

  return []
}

function sampleQuotaDetails(
  samples: UsageMetricSampleSourceRow[],
  window: MetricRangeWindow,
  rows: UsageSnapshotSourceRow[],
  developerIds: Set<string>,
  providerIds: Set<string>
): QuotaPressureDetail[] {
  const names = new Map(
    rows.map((row) => [accountSnapshotKey(row), row.developerName ?? null])
  )

  return samples
    .filter((sample) => sample.unit === "percent")
    .filter((sample) => isMetricSampleInWindow(sample, window))
    .filter((sample) => {
      if (!sample.developerId) return false
      return developerIds.has(sample.developerId) && providerIds.has(sample.providerId)
    })
    .map((sample) => {
      const label = quotaSampleLabel(sample.metricKey)
      if (!label) return null
      return quotaDetail({
        developerId: sample.developerId ?? "",
        developerName: names.get(accountSampleKey(sample)) ?? null,
        providerId: sample.providerId,
        providerAccountFingerprint: sample.providerAccountFingerprint,
        label,
        percent: sample.value,
        updatedAt: sample.updatedAt,
      })
    })
    .filter((detail): detail is QuotaPressureDetail => detail !== null)
}

function quotaDetail(args: {
  developerId: string
  developerName: string | null
  providerId: string
  providerAccountFingerprint?: string
  label: string
  percent: number
  updatedAt: number
}): QuotaPressureDetail {
  return {
    ...args,
    status: quotaStatus(args.percent),
  }
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

function accountSnapshotKey(row: UsageSnapshotSourceRow) {
  return [
    row.developerId,
    row.providerId,
    row.providerAccountFingerprint ?? "",
  ].join("\u0000")
}

function accountSampleKey(sample: UsageMetricSampleSourceRow) {
  return [
    sample.developerId ?? "",
    sample.providerId,
    sample.providerAccountFingerprint ?? "",
  ].join("\u0000")
}

function detailPairKey(detail: QuotaPressureDetail) {
  return [
    detail.developerId,
    detail.providerId,
    detail.providerAccountFingerprint ?? "",
  ].join("\u0000")
}
