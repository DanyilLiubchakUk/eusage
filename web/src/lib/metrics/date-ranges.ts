import type {
  MetricDateRangeInput,
  MetricRangeWindow,
  ResolvedMetricDateRange,
} from "./types"

const DAY_MS = 24 * 60 * 60 * 1000
const PRESET_DAYS = {
  last7: 7,
  last30: 30,
  last90: 90,
} as const

export function resolveMetricDateRange(
  input: MetricDateRangeInput,
  now: number
): ResolvedMetricDateRange {
  if (input.preset === "allTime") {
    return {
      preset: input.preset,
      label: "All time",
      current: allTimeWindow(),
      comparison: null,
    }
  }

  if (input.preset === "custom") {
    const startMs = parseUtcDay(input.startDay)
    const endMs = parseUtcDay(input.endDay) + DAY_MS
    if (endMs <= startMs) {
      throw new Error("Custom date range endDay must be on or after startDay.")
    }

    const lengthMs = endMs - startMs
    return {
      preset: input.preset,
      label: `${input.startDay} to ${input.endDay}`,
      current: windowFromBounds(startMs, endMs),
      comparison: windowFromBounds(startMs - lengthMs, startMs),
    }
  }

  const days = PRESET_DAYS[input.preset]
  const endMs = startOfUtcDay(now) + DAY_MS
  const startMs = endMs - days * DAY_MS

  return {
    preset: input.preset,
    label: `Last ${days} days`,
    current: windowFromBounds(startMs, endMs),
    comparison: windowFromBounds(startMs - days * DAY_MS, startMs),
  }
}

export function isTimestampInWindow(timestamp: number, window: MetricRangeWindow) {
  if (window.startMs !== null && timestamp < window.startMs) return false
  if (window.endMs !== null && timestamp >= window.endMs) return false
  return true
}

export function isSampleDayInWindow(sampleDay: string, window: MetricRangeWindow) {
  const dayMs = parseUtcDay(sampleDay)
  return isTimestampInWindow(dayMs, window)
}

export function formatUtcDay(timestamp: number) {
  return new Date(startOfUtcDay(timestamp)).toISOString().slice(0, 10)
}

export function daysInWindow(window: MetricRangeWindow) {
  if (window.startMs === null || window.endMs === null) return []

  return daysBetween(formatUtcDay(window.startMs), formatUtcDay(window.endMs - DAY_MS))
}

export function daysBetween(startDay: string, endDay: string) {
  const startMs = parseUtcDay(startDay)
  const endMs = parseUtcDay(endDay)
  if (endMs < startMs) return []

  const days: string[] = []
  for (let timestamp = startMs; timestamp <= endMs; timestamp += DAY_MS) {
    days.push(formatUtcDay(timestamp))
  }
  return days
}

function windowFromBounds(startMs: number, endMs: number): MetricRangeWindow {
  return {
    startMs,
    endMs,
    startDay: formatUtcDay(startMs),
    endDay: formatUtcDay(endMs - DAY_MS),
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

function parseUtcDay(day: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) throw new Error(`Invalid metric day: ${day}`)

  const year = Number(match[1])
  const month = Number(match[2])
  const date = Number(match[3])
  const timestamp = Date.UTC(year, month - 1, date)
  if (formatUtcDay(timestamp) !== day) throw new Error(`Invalid metric day: ${day}`)
  return timestamp
}
