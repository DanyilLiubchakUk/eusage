import {
  addReportingDays,
  normalizeReportingTimeZone,
  reportingDayToUtcBoundary,
} from "./reportingTimeZone"
import type { JsonObject, MetricReportingBucket } from "./usageIngestTypes"

type BucketValidationResult =
  | {
      ok: true
      bucket?: MetricReportingBucket
      periodStart?: number
      periodEnd?: number
    }
  | {
      ok: false
      code: string
      message: string
      field: string
    }

export function normalizeMetricSampleBucket(args: {
  sample: JsonObject
  metricKey: string
  unit: string
  sampleDay: string
  periodStart?: number
  periodEnd?: number
  field: string
}): BucketValidationResult {
  const bucketInput = args.sample.bucket
  if (bucketInput === undefined) {
    if (!isDailyConsumedUsageSample(args.metricKey, args.unit)) return { ok: true }

    return {
      ok: false,
      code: "metric-bucket-required",
      message: "Reporting bucket metadata is required for daily consumed usage.",
      field: `${args.field}.bucket`,
    }
  }

  if (!isRecord(bucketInput)) {
    return invalidBucket(args.field)
  }

  const kind = trimString(bucketInput.kind)
  const day = trimString(bucketInput.day)
  const reportingTimeZone = normalizeReportingTimeZone(bucketInput.reportingTimeZone)
  const startMs = finiteNumber(bucketInput.startMs)
  const endMs = finiteNumber(bucketInput.endMs)

  if (
    kind !== "reportingDay" ||
    !day ||
    day !== args.sampleDay ||
    !reportingTimeZone ||
    startMs === null ||
    endMs === null
  ) {
    return invalidBucket(args.field)
  }

  let expectedStart: number
  let expectedEnd: number
  try {
    expectedStart = reportingDayToUtcBoundary(day, reportingTimeZone)
    expectedEnd = reportingDayToUtcBoundary(addReportingDays(day, 1), reportingTimeZone)
  } catch {
    return invalidBucket(args.field)
  }

  if (
    startMs !== expectedStart ||
    endMs !== expectedEnd ||
    endMs <= startMs ||
    (args.periodStart !== undefined && args.periodStart !== startMs) ||
    (args.periodEnd !== undefined && args.periodEnd !== endMs)
  ) {
    return invalidBucket(args.field)
  }

  return {
    ok: true,
    bucket: {
      kind: "reportingDay",
      day,
      reportingTimeZone,
      startMs,
      endMs,
    },
    periodStart: startMs,
    periodEnd: endMs,
  }
}

function isDailyConsumedUsageSample(metricKey: string, unit: string) {
  return (
    (unit === "tokens" && /\.tokens\.[a-zA-Z0-9]+$/.test(metricKey)) ||
    (unit === "usd" && metricKey.endsWith(".cost.estimated"))
  )
}

function invalidBucket(field: string) {
  return {
    ok: false as const,
    code: "metric-bucket-invalid",
    message: "Reporting bucket metadata is invalid.",
    field: `${field}.bucket`,
  }
}

function trimString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function isRecord(value: unknown): value is JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value)
}
