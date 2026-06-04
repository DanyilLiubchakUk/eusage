import type {
  MetricDateRangeInput,
  MetricDateRangeOptions,
  MetricRangeWindow,
  ResolvedMetricDateRange,
  UsageMetricSampleSourceRow,
} from "./types"

const DAY_MS = 24 * 60 * 60 * 1000
export const DEFAULT_REPORTING_TIME_ZONE = "UTC"
const PRESET_DAYS = {
  last7: 7,
  last30: 30,
  last90: 90,
} as const
const timeZoneFormatters = new Map<string, Intl.DateTimeFormat>()

export function resolveMetricDateRange(
  input: MetricDateRangeInput,
  now: number,
  options: MetricDateRangeOptions = {}
): ResolvedMetricDateRange {
  const reportingTimeZone = options.reportingTimeZone ?? DEFAULT_REPORTING_TIME_ZONE

  if (input.preset === "allTime") {
    return {
      preset: input.preset,
      label: "All time",
      current: allTimeWindow(),
      comparison: null,
    }
  }

  if (input.preset === "custom") {
    const lengthDays = daysBetween(input.startDay, input.endDay).length
    if (lengthDays === 0) {
      throw new Error("Custom date range endDay must be on or after startDay.")
    }

    const current = windowFromReportingDays(input.startDay, input.endDay, reportingTimeZone)
    const comparisonEndDay = addReportingDays(input.startDay, -1)
    const comparisonStartDay = addReportingDays(input.startDay, -lengthDays)

    return {
      preset: input.preset,
      label: `${input.startDay} to ${input.endDay}`,
      current,
      comparison: windowFromReportingDays(
        comparisonStartDay,
        comparisonEndDay,
        reportingTimeZone
      ),
    }
  }

  const days = PRESET_DAYS[input.preset]
  const endDay = formatReportingDay(now, reportingTimeZone)
  const startDay = addReportingDays(endDay, 1 - days)
  const comparisonStartDay = addReportingDays(startDay, -days)
  const comparisonEndDay = addReportingDays(startDay, -1)

  return {
    preset: input.preset,
    label: `Last ${days} days`,
    current: windowFromReportingDays(startDay, endDay, reportingTimeZone),
    comparison: windowFromReportingDays(
      comparisonStartDay,
      comparisonEndDay,
      reportingTimeZone
    ),
  }
}

export function isTimestampInWindow(timestamp: number, window: MetricRangeWindow) {
  if (window.startMs !== null && timestamp < window.startMs) return false
  if (window.endMs !== null && timestamp >= window.endMs) return false
  return true
}

export function isSampleDayInWindow(sampleDay: string, window: MetricRangeWindow) {
  parseReportingDay(sampleDay)
  if (window.startDay !== null && sampleDay < window.startDay) return false
  if (window.endDay !== null && sampleDay > window.endDay) return false
  return true
}

export function isMetricSampleInWindow(
  sample: Pick<UsageMetricSampleSourceRow, "sampleDay" | "bucket">,
  window: MetricRangeWindow
) {
  if (!sample.bucket) return isSampleDayInWindow(sample.sampleDay, window)

  if (sample.bucket.day !== sample.sampleDay) {
    throw new Error(`Metric sample bucket day must match sampleDay: ${sample.sampleDay}`)
  }
  if (sample.bucket.endMs <= sample.bucket.startMs) {
    throw new Error(`Invalid metric sample reporting bucket: ${sample.sampleDay}`)
  }
  if (window.startMs !== null && sample.bucket.startMs < window.startMs) return false
  if (window.endMs !== null && sample.bucket.endMs > window.endMs) return false
  return true
}

export function formatUtcDay(timestamp: number) {
  return new Date(startOfUtcDay(timestamp)).toISOString().slice(0, 10)
}

export function formatReportingDay(
  timestamp: number,
  reportingTimeZone = DEFAULT_REPORTING_TIME_ZONE
) {
  if (reportingTimeZone === DEFAULT_REPORTING_TIME_ZONE) return formatUtcDay(timestamp)

  const parts = timeZoneParts(timestamp, reportingTimeZone)
  return formatDayParts(parts.year, parts.month, parts.day)
}

export function reportingDayToUtcBoundary(
  day: string,
  reportingTimeZone = DEFAULT_REPORTING_TIME_ZONE
) {
  const parts = parseReportingDay(day)
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day)
  if (reportingTimeZone === DEFAULT_REPORTING_TIME_ZONE) return utcGuess

  const firstPass = utcGuess - timeZoneOffsetMs(utcGuess, reportingTimeZone)
  return utcGuess - timeZoneOffsetMs(firstPass, reportingTimeZone)
}

export function daysInWindow(window: MetricRangeWindow) {
  if (window.startDay === null || window.endDay === null) return []

  return daysBetween(window.startDay, window.endDay)
}

export function daysBetween(startDay: string, endDay: string) {
  const startMs = parseReportingDayMs(startDay)
  const endMs = parseReportingDayMs(endDay)
  if (endMs < startMs) return []

  const days: string[] = []
  for (let timestamp = startMs; timestamp <= endMs; timestamp += DAY_MS) {
    days.push(formatUtcDay(timestamp))
  }
  return days
}

function windowFromReportingDays(
  startDay: string,
  endDay: string,
  reportingTimeZone: string
): MetricRangeWindow {
  const startMs = reportingDayToUtcBoundary(startDay, reportingTimeZone)
  const endMs = reportingDayToUtcBoundary(addReportingDays(endDay, 1), reportingTimeZone)
  return {
    startMs,
    endMs,
    startDay,
    endDay,
  }
}

function allTimeWindow(): MetricRangeWindow {
  return {
    startMs: null,
    endMs: null,
    startDay: null,
    endDay: null,
  }
}

function startOfUtcDay(timestamp: number) {
  const date = new Date(timestamp)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function addReportingDays(day: string, days: number) {
  return formatUtcDay(parseReportingDayMs(day) + days * DAY_MS)
}

function parseReportingDayMs(day: string) {
  const parts = parseReportingDay(day)
  return Date.UTC(parts.year, parts.month - 1, parts.day)
}

function parseReportingDay(day: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) throw new Error(`Invalid metric day: ${day}`)

  const year = Number(match[1])
  const month = Number(match[2])
  const dayOfMonth = Number(match[3])
  const timestamp = Date.UTC(year, month - 1, dayOfMonth)
  if (formatUtcDay(timestamp) !== day) throw new Error(`Invalid metric day: ${day}`)
  return { year, month, day: dayOfMonth }
}

function timeZoneOffsetMs(timestamp: number, reportingTimeZone: string) {
  const parts = timeZoneParts(timestamp, reportingTimeZone)
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  ) - timestamp
}

function timeZoneParts(timestamp: number, reportingTimeZone: string) {
  const values = Object.fromEntries(
    timeZoneFormatter(reportingTimeZone)
      .formatToParts(new Date(timestamp))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  )

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  }
}

function timeZoneFormatter(reportingTimeZone: string) {
  const cached = timeZoneFormatters.get(reportingTimeZone)
  if (cached) return cached

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: reportingTimeZone,
    calendar: "iso8601",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
  timeZoneFormatters.set(reportingTimeZone, formatter)
  return formatter
}

function formatDayParts(year: number, month: number, day: number) {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-")
}
