import { isTimestampInWindow } from "./date-ranges"
import {
  dedupeLatestDeviceSnapshots,
  finiteNumber,
  snapshotRangeTimestamp,
} from "./usage-metrics"
import type { MetricRangeWindow, UsageSnapshotSourceRow } from "./types"

export type CursorPoolMetrics = {
  available: boolean
  label: string
  source: "providerReportedPooled" | "teamOnDemandFallback"
  usedUsd: number
  limitUsd: number
  remainingUsd: number
  coverage: {
    reportingDevelopers: number
    totalDevelopers: number
    missingDevelopers: number
    label: string
  }
}

export function calculateCursorPool(args: {
  snapshots: UsageSnapshotSourceRow[]
  window: MetricRangeWindow
  visibleDeveloperIds?: string[]
}): CursorPoolMetrics {
  const cursorRows = dedupeLatestDeviceSnapshots(args.snapshots)
    .filter((row) => row.providerId === "cursor")
    .filter((row) => isTimestampInWindow(snapshotRangeTimestamp(row), args.window))

  const pooled = latestPooledCursorRow(cursorRows)
  if (pooled) return pooled

  return calculateFallbackPool(cursorRows, args.visibleDeveloperIds)
}

function latestPooledCursorRow(rows: UsageSnapshotSourceRow[]): CursorPoolMetrics | null {
  const pooledRows = rows
    .map((row) => ({ row, fields: pooledFields(row) }))
    .filter((entry): entry is { row: UsageSnapshotSourceRow; fields: PoolFields } =>
      Boolean(entry.fields)
    )
    .sort((left, right) => right.row.updatedAt - left.row.updatedAt)

  const latest = pooledRows[0]
  if (!latest) return null

  return {
    available: true,
    label: "Cursor Shared Pool",
    source: "providerReportedPooled",
    usedUsd: latest.fields.usedUsd,
    limitUsd: latest.fields.limitUsd,
    remainingUsd: latest.fields.remainingUsd,
    coverage: {
      reportingDevelopers: 1,
      totalDevelopers: 1,
      missingDevelopers: 0,
      label: "Provider-reported pool",
    },
  }
}

function calculateFallbackPool(
  rows: UsageSnapshotSourceRow[],
  visibleDeveloperIds: string[] | undefined
): CursorPoolMetrics {
  const latestRowsByDeveloper = latestRowsForDevelopers(rows)
  const expectedDeveloperIds = new Set(visibleDeveloperIds ?? latestRowsByDeveloper.keys())
  let usedUsd = 0
  let limitUsd = 0
  let reportingDevelopers = 0

  for (const developerId of expectedDeveloperIds) {
    const row = latestRowsByDeveloper.get(developerId)
    if (!row) continue

    const fields = individualFields(row)
    if (!fields) continue

    usedUsd += fields.usedUsd
    limitUsd += fields.limitUsd
    reportingDevelopers += 1
  }

  const totalDevelopers = expectedDeveloperIds.size
  const missingDevelopers = totalDevelopers - reportingDevelopers

  return {
    available: reportingDevelopers > 0,
    label: "Team On-Demand Budget",
    source: "teamOnDemandFallback",
    usedUsd,
    limitUsd,
    remainingUsd: limitUsd - usedUsd,
    coverage: {
      reportingDevelopers,
      totalDevelopers,
      missingDevelopers,
      label: `${reportingDevelopers}/${totalDevelopers} developers reporting budget data`,
    },
  }
}

function latestRowsForDevelopers(rows: UsageSnapshotSourceRow[]) {
  const latestRows = new Map<string, UsageSnapshotSourceRow>()

  for (const row of rows) {
    const current = latestRows.get(row.developerId)
    if (!current || row.updatedAt > current.updatedAt) {
      latestRows.set(row.developerId, row)
    }
  }

  return latestRows
}

type PoolFields = {
  usedUsd: number
  limitUsd: number
  remainingUsd: number
}

function pooledFields(row: UsageSnapshotSourceRow): PoolFields | null {
  const cursor = row.summary.provider?.cursor
  if (!cursor) return null

  const usedUsd = finiteNumber(cursor.pooledUsedUsd ?? cursor.pooledUsed)
  const limitUsd = finiteNumber(cursor.pooledLimitUsd ?? cursor.pooledLimit)
  const remainingValue = cursor.pooledRemainingUsd ?? cursor.pooledRemaining
  const remainingUsd =
    typeof remainingValue === "number" && Number.isFinite(remainingValue)
      ? remainingValue
      : limitUsd - usedUsd

  return limitUsd > 0 ? { usedUsd, limitUsd, remainingUsd } : null
}

function individualFields(row: UsageSnapshotSourceRow): PoolFields | null {
  const cursor = row.summary.provider?.cursor
  if (!cursor) return null

  const limitUsd = finiteNumber(cursor.individualLimitUsd ?? cursor.individualLimit)
  if (limitUsd <= 0) return null

  const explicitUsed = cursor.individualUsedUsd ?? cursor.individualUsed
  const remaining = cursor.individualRemainingUsd ?? cursor.individualRemaining
  const usedUsd =
    typeof explicitUsed === "number" && Number.isFinite(explicitUsed)
      ? explicitUsed
      : typeof remaining === "number" && Number.isFinite(remaining)
        ? limitUsd - remaining
        : null

  return usedUsd === null ? null : { usedUsd, limitUsd, remainingUsd: limitUsd - usedUsd }
}
