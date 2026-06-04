import { describe, expect, it } from "vitest"
import {
  isValidReportingTimeZone,
  normalizeReportingTimeZone,
  reportingTimeZoneOrDefault,
} from "./reportingTimeZone"

describe("reporting time zone", () => {
  it("validates and normalizes team reporting timezones", () => {
    expect(normalizeReportingTimeZone(" America/New_York ")).toBe("America/New_York")
    expect(isValidReportingTimeZone("America/New_York")).toBe(true)
    expect(isValidReportingTimeZone("Mars/Base")).toBe(false)
    expect(reportingTimeZoneOrDefault(undefined)).toBe("UTC")
  })
})
