import { describe, expect, it } from "vitest"
import {
  addReportingDays,
  isValidReportingTimeZone,
  normalizeReportingTimeZone,
  reportingDayToUtcBoundary,
  reportingTimeZoneOrDefault,
} from "./reportingTimeZone"

describe("reporting time zone", () => {
  it("validates and normalizes team reporting timezones", () => {
    expect(normalizeReportingTimeZone(" America/New_York ")).toBe("America/New_York")
    expect(isValidReportingTimeZone("America/New_York")).toBe(true)
    expect(isValidReportingTimeZone("Mars/Base")).toBe(false)
    expect(reportingTimeZoneOrDefault(undefined)).toBe("UTC")
  })

  it("resolves reporting day UTC boundaries including DST", () => {
    expect(reportingDayToUtcBoundary("2026-06-01")).toBe(Date.UTC(2026, 5, 1))
    expect(reportingDayToUtcBoundary("2026-03-08", "America/New_York")).toBe(
      Date.UTC(2026, 2, 8, 5)
    )
    expect(reportingDayToUtcBoundary("2026-03-09", "America/New_York")).toBe(
      Date.UTC(2026, 2, 9, 4)
    )
    expect(addReportingDays("2026-03-08", 1)).toBe("2026-03-09")
    expect(() => reportingDayToUtcBoundary("2026-02-30")).toThrow(
      "Invalid reporting day: 2026-02-30"
    )
  })
})
