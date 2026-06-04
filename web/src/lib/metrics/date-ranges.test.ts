import { describe, expect, it } from "vitest"
import {
  daysInWindow,
  formatReportingDay,
  isSampleDayInWindow,
  reportingDayToUtcBoundary,
  resolveMetricDateRange,
} from "./date-ranges"
import type { MetricRangeWindow } from "./types"

describe("metric reporting days", () => {
  it("keeps UTC boundaries as the default date range behavior", () => {
    const range = resolveMetricDateRange(
      { preset: "last7" },
      Date.UTC(2026, 5, 1, 12)
    )

    expect(range.current).toEqual({
      startMs: Date.UTC(2026, 4, 26),
      endMs: Date.UTC(2026, 5, 2),
      startDay: "2026-05-26",
      endDay: "2026-06-01",
    })
    expect(range.comparison).toEqual({
      startMs: Date.UTC(2026, 4, 19),
      endMs: Date.UTC(2026, 4, 26),
      startDay: "2026-05-19",
      endDay: "2026-05-25",
    })
  })

  it("uses the team timezone to resolve late-night reporting days", () => {
    const range = resolveMetricDateRange(
      { preset: "last7" },
      Date.UTC(2026, 5, 1, 2),
      { reportingTimeZone: "America/New_York" }
    )

    expect(formatReportingDay(Date.UTC(2026, 5, 1, 2), "America/New_York"))
      .toBe("2026-05-31")
    expect(range.current).toEqual({
      startMs: Date.UTC(2026, 4, 25, 4),
      endMs: Date.UTC(2026, 5, 1, 4),
      startDay: "2026-05-25",
      endDay: "2026-05-31",
    })
    expect(isSampleDayInWindow("2026-05-31", range.current)).toBe(true)
    expect(isSampleDayInWindow("2026-06-01", range.current)).toBe(false)
  })

  it("turns custom reporting days into timezone UTC boundaries", () => {
    const range = resolveMetricDateRange(
      { preset: "custom", startDay: "2026-01-02", endDay: "2026-01-03" },
      Date.UTC(2026, 0, 3, 12),
      { reportingTimeZone: "America/Los_Angeles" }
    )

    expect(range.current).toEqual({
      startMs: Date.UTC(2026, 0, 2, 8),
      endMs: Date.UTC(2026, 0, 4, 8),
      startDay: "2026-01-02",
      endDay: "2026-01-03",
    })
    expect(range.comparison).toEqual({
      startMs: Date.UTC(2025, 11, 31, 8),
      endMs: Date.UTC(2026, 0, 2, 8),
      startDay: "2025-12-31",
      endDay: "2026-01-01",
    })
  })

  it("keeps a DST start reporting day as one calendar day with 23 UTC hours", () => {
    const range = resolveMetricDateRange(
      { preset: "custom", startDay: "2026-03-08", endDay: "2026-03-08" },
      Date.UTC(2026, 2, 8, 12),
      { reportingTimeZone: "America/New_York" }
    )

    expect(range.current).toEqual({
      startMs: Date.UTC(2026, 2, 8, 5),
      endMs: Date.UTC(2026, 2, 9, 4),
      startDay: "2026-03-08",
      endDay: "2026-03-08",
    })
    expect(windowLengthMs(range.current)).toBe(23 * 60 * 60 * 1000)
    expect(daysInWindow(range.current)).toEqual(["2026-03-08"])
  })

  it("keeps a DST end reporting day as one calendar day with 25 UTC hours", () => {
    const range = resolveMetricDateRange(
      { preset: "custom", startDay: "2026-11-01", endDay: "2026-11-01" },
      Date.UTC(2026, 10, 1, 12),
      { reportingTimeZone: "America/New_York" }
    )

    expect(range.current).toEqual({
      startMs: Date.UTC(2026, 10, 1, 4),
      endMs: Date.UTC(2026, 10, 2, 5),
      startDay: "2026-11-01",
      endDay: "2026-11-01",
    })
    expect(windowLengthMs(range.current)).toBe(25 * 60 * 60 * 1000)
    expect(daysInWindow(range.current)).toEqual(["2026-11-01"])
  })

  it("rejects invalid reporting days and timezones", () => {
    expect(() =>
      reportingDayToUtcBoundary("2026-02-30", "America/New_York")
    ).toThrow("Invalid metric day: 2026-02-30")
    expect(() =>
      reportingDayToUtcBoundary("2026-06-01", "Mars/Base")
    ).toThrow("Invalid time zone specified: Mars/Base")
  })
})

function windowLengthMs(window: MetricRangeWindow) {
  if (window.startMs === null || window.endMs === null) {
    throw new Error("Expected a bounded metric range window.")
  }
  return window.endMs - window.startMs
}
