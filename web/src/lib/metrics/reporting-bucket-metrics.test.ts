import { describe, expect, it } from "vitest"
import {
  buildTotalEstimatedCostSeries,
  buildTotalTokenSeries,
  calculateSampledUsage,
  resolveMetricDateRange,
  type UsageMetricSampleSourceRow,
} from "."

const now = Date.UTC(2026, 5, 1, 2)
const updatedAt = Date.UTC(2026, 5, 1, 1)

describe("reporting bucket metrics", () => {
  it("includes consumed samples by Reporting Day UTC boundaries", () => {
    const range = resolveMetricDateRange(
      { preset: "custom", startDay: "2026-05-31", endDay: "2026-05-31" },
      now,
      { reportingTimeZone: "America/New_York" }
    )
    const samples = [
      sample({
        value: 100,
        bucket: reportingBucket({
          reportingTimeZone: "America/New_York",
          startMs: Date.UTC(2026, 4, 31, 4),
          endMs: Date.UTC(2026, 5, 1, 4),
        }),
      }),
      sample({
        id: "partial-token",
        value: 900,
        bucket: reportingBucket({
          reportingTimeZone: "America/Los_Angeles",
          startMs: Date.UTC(2026, 4, 31, 7),
          endMs: Date.UTC(2026, 5, 1, 7),
        }),
      }),
      sample({
        id: "inside-cost",
        metricKey: "codex.cost.estimated",
        unit: "usd",
        value: 1.25,
        source: "estimated",
        bucket: reportingBucket({
          reportingTimeZone: "America/New_York",
          startMs: Date.UTC(2026, 4, 31, 4),
          endMs: Date.UTC(2026, 5, 1, 4),
        }),
      }),
    ]

    const usage = calculateSampledUsage({ samples, window: range.current })
    const tokenSeries = buildTotalTokenSeries({ samples, window: range.current })
    const costSeries = buildTotalEstimatedCostSeries({ samples, window: range.current })

    expect(usage.tokensTotal).toBe(100)
    expect(usage.estimatedCostUsd).toBe(1.25)
    expect(tokenSeries.points).toEqual([{ day: "2026-05-31", value: 100 }])
    expect(costSeries.points).toEqual([{ day: "2026-05-31", value: 1.25 }])
  })
})

function sample(overrides: Partial<UsageMetricSampleSourceRow> = {}): UsageMetricSampleSourceRow {
  return {
    id: "inside-token",
    providerId: "codex",
    developerId: "developer-1",
    deviceId: "device-1",
    metricKey: "codex.tokens.total",
    value: 100,
    unit: "tokens",
    sampleDay: "2026-05-31",
    source: "providerReported",
    capturedAt: updatedAt,
    updatedAt,
    ...overrides,
  }
}

function reportingBucket(args: {
  reportingTimeZone: string
  startMs: number
  endMs: number
}) {
  return {
    kind: "reportingDay" as const,
    day: "2026-05-31",
    reportingTimeZone: args.reportingTimeZone,
    startMs: args.startMs,
    endMs: args.endMs,
  }
}
