import { describe, expect, it } from "vitest"
import {
  buildMetricSeries,
  calculateCursorPool,
  calculateDashboardUsage,
  calculateQuotaPressure,
  calculateUsageTotals,
  formatUpdateFreshnessLabel,
  resolveVisibleMetricSource,
  resolveMetricDateRange,
  type UsageMetricSampleSourceRow,
  type UsageSnapshotSourceRow,
} from "."

const now = Date.UTC(2026, 5, 1, 12)
const currentDay = Date.UTC(2026, 5, 1, 8)
const previousWeekDay = Date.UTC(2026, 4, 25, 8)

describe("dashboard metrics", () => {
  it("calculates totals, percent changes, and chart series from source rows", () => {
    const range = resolveMetricDateRange({ preset: "last7" }, now)
    const snapshots: UsageSnapshotSourceRow[] = [
      snapshot({ tokensTotal: 200, estimatedCostUsd: 4, capturedAt: currentDay }),
      snapshot({
        tokensTotal: 100,
        estimatedCostUsd: 2,
        capturedAt: previousWeekDay,
        periodKey: "2026-05-25",
        dataIdentity: "mock:developer-1:2026-05-25",
      }),
      snapshot({
        tokensTotal: 50,
        estimatedCostUsd: 1,
        deviceId: "new-device",
        updatedAt: currentDay + 1,
        capturedAt: currentDay,
      }),
    ]
    const samples: UsageMetricSampleSourceRow[] = [
      sample({ sampleDay: "2026-05-30", value: 30 }),
      sample({ sampleDay: "2026-06-01", value: 70 }),
      sample({ sampleDay: "2026-05-20", value: 999 }),
    ]

    const metrics = calculateDashboardUsage({
      snapshots,
      range: { preset: "last7" },
      now,
    })
    const series = buildMetricSeries({
      samples,
      metricKey: "mock.tokens.total",
      window: range.current,
    })

    expect(metrics.comparison.current.tokensTotal).toBe(50)
    expect(metrics.comparison.previous?.tokensTotal).toBe(100)
    expect(metrics.comparison.tokensPercentChange).toBe(-50)
    expect(series.points).toEqual([
      { day: "2026-05-30", value: 30 },
      { day: "2026-06-01", value: 70 },
    ])
  })

  it("omits comparison deltas for all-time ranges", () => {
    const metrics = calculateDashboardUsage({
      snapshots: [snapshot({ tokensTotal: 200, capturedAt: currentDay })],
      range: { preset: "allTime" },
      now,
    })

    expect(metrics.range.comparison).toBeNull()
    expect(metrics.comparison.previous).toBeNull()
    expect(metrics.comparison.tokensPercentChange).toBeNull()
  })

  it("uses provider Cursor pool rows before fallback rows", () => {
    const range = resolveMetricDateRange({ preset: "last7" }, now)

    const pool = calculateCursorPool({
      snapshots: [
        cursorSnapshot("alex", {
          pooledLimitUsd: 500,
          pooledUsedUsd: 120,
          individualLimitUsd: 100,
          individualUsedUsd: 40,
        }),
        cursorSnapshot("sam", {
          individualLimitUsd: 100,
          individualUsedUsd: 50,
        }),
      ],
      window: range.current,
    })

    expect(pool).toMatchObject({
      source: "providerReportedPooled",
      label: "Cursor Shared Pool",
      limitUsd: 500,
      usedUsd: 120,
      remainingUsd: 380,
    })
  })

  it("falls back to summed Cursor on-demand rows and reports coverage", () => {
    const range = resolveMetricDateRange({ preset: "last7" }, now)

    const pool = calculateCursorPool({
      snapshots: [
        cursorSnapshot("alex", {
          individualLimitUsd: 100,
          individualUsedUsd: 40,
        }),
        cursorSnapshot("sam", {
          individualLimitUsd: 120,
          individualRemainingUsd: 90,
        }),
        cursorSnapshot("lee", {}),
      ],
      window: range.current,
      visibleDeveloperIds: ["alex", "sam", "lee"],
    })

    expect(pool).toMatchObject({
      source: "teamOnDemandFallback",
      label: "Team On-Demand Budget",
      limitUsd: 220,
      usedUsd: 70,
      remainingUsd: 150,
      coverage: {
        reportingDevelopers: 2,
        totalDevelopers: 3,
        missingDevelopers: 1,
        label: "2/3 developers reporting budget data",
      },
    })
  })

  it("calculates quota averages from reported values and keeps coverage", () => {
    const range = resolveMetricDateRange({ preset: "last7" }, now)

    const quota = calculateQuotaPressure({
      snapshots: [
        snapshot({
          developerId: "alex",
          developerName: "Alex",
          providerId: "claude",
          quotaPercent: 96,
        }),
        snapshot({
          developerId: "alex",
          developerName: "Alex",
          providerId: "cursor",
          quotaPercent: 68,
        }),
        snapshot({ developerId: "sam", providerId: "cursor" }),
      ],
      window: range.current,
      visibleDeveloperIds: ["alex", "sam"],
      visibleProviderIds: ["claude", "cursor"],
    })

    expect(quota.teamAveragePercent).toBe(82)
    expect(quota.teamCoverage).toMatchObject({
      reportingCount: 2,
      totalCount: 4,
      label: "2/4 reporting",
    })
    expect(quota.worstSingle).toMatchObject({
      developerId: "alex",
      providerId: "claude",
      percent: 96,
      status: "critical",
    })
    expect(quota.worstDeveloperAverage).toMatchObject({
      developerId: "alex",
      averagePercent: 82,
    })
    expect(quota.perProvider.find((row) => row.providerId === "claude")?.coverage)
      .toMatchObject({
        reportingCount: 1,
        totalCount: 2,
        label: "1/2 developers",
      })
  })

  it("resolves provider, developer, and inactive visibility before metrics", () => {
    const visible = resolveVisibleMetricSource({
      developers: [
        { id: "alex", status: "active" },
        { id: "sam", status: "active" },
        { id: "lee", status: "inactive" },
      ],
      snapshots: [
        snapshot({ developerId: "alex", providerId: "cursor", quotaPercent: 80 }),
        snapshot({ developerId: "sam", providerId: "cursor", quotaPercent: 90 }),
        snapshot({ developerId: "lee", providerId: "cursor", quotaPercent: 95 }),
        snapshot({ developerId: "alex", providerId: "claude", quotaPercent: 70 }),
      ],
      metricSamples: [
        sample({ developerId: "alex", providerId: "cursor" }),
        sample({ developerId: "lee", providerId: "cursor" }),
        sample({ developerId: "alex", providerId: "claude" }),
      ],
      disabledProviderIds: ["claude"],
      hiddenDeveloperIds: ["sam"],
    })
    const range = resolveMetricDateRange({ preset: "last7" }, now)
    const quota = calculateQuotaPressure({
      snapshots: visible.snapshots,
      window: range.current,
      visibleDeveloperIds: visible.visibleDeveloperIds,
      visibleProviderIds: visible.visibleProviderIds,
    })

    expect(visible.snapshots.map((row) => `${row.developerId}:${row.providerId}`))
      .toEqual(["alex:cursor"])
    expect(visible.metricSamples.map((row) => `${row.developerId}:${row.providerId}`))
      .toEqual(["alex:cursor"])
    expect(quota.teamCoverage.label).toBe("1/1 reporting")
  })

  it("can include inactive developers when admin review selects them", () => {
    const visible = resolveVisibleMetricSource({
      developers: [
        { id: "alex", status: "active" },
        { id: "lee", status: "inactive" },
      ],
      snapshots: [
        snapshot({ developerId: "alex", providerId: "cursor", quotaPercent: 80 }),
        snapshot({ developerId: "lee", providerId: "cursor", quotaPercent: 95 }),
      ],
      metricSamples: [],
      includeInactiveDevelopers: true,
    })

    expect(visible.visibleDeveloperIds).toEqual(["alex", "lee"])
    expect(visible.snapshots.map((row) => row.developerId)).toEqual(["alex", "lee"])
  })

  it("formats update freshness labels without leading zero units", () => {
    expect(formatUpdateFreshnessLabel([], now)).toBe("Updates: No data yet")
    expect(formatUpdateFreshnessLabel([now - 12_000], now)).toBe(
      "Updates: 12s ago"
    )
    expect(
      formatUpdateFreshnessLabel([now - 4 * 60_000 - 12_000, now - 12_000], now)
    ).toBe("Updates: oldest 4m 12s ago · newest 12s ago")
    expect(formatUpdateFreshnessLabel([now - 4 * 60_000 - 12_000], now)).toBe(
      "Updates: 4m 12s ago"
    )
    expect(
      formatUpdateFreshnessLabel([now - 9 * 86_400_000 - 3 * 3_600_000 - 4 * 60_000 - 12_000], now)
    ).toBe("Updates: 9d 3h 4m 12s ago")
  })
})

function snapshot(
  overrides: Partial<UsageSnapshotSourceRow["summary"] & UsageSnapshotSourceRow> = {}
): UsageSnapshotSourceRow {
  const summary = {
    tokensTotal: overrides.tokensTotal,
    estimatedCostUsd: overrides.estimatedCostUsd,
    quotaPercent: overrides.quotaPercent,
    provider: overrides.provider,
  }

  return {
    id: "snapshot-1",
    developerId: overrides.developerId ?? "developer-1",
    developerName: overrides.developerName,
    deviceId: overrides.deviceId ?? "device-1",
    providerId: overrides.providerId ?? "mock",
    periodStart: overrides.periodStart,
    periodEnd: overrides.periodEnd,
    periodKey: overrides.periodKey ?? "2026-06-01",
    dataIdentity: overrides.dataIdentity ?? "mock:developer-1:2026-06-01",
    summary,
    capturedAt: overrides.capturedAt ?? currentDay,
    updatedAt: overrides.updatedAt ?? currentDay,
  }
}

function cursorSnapshot(
  developerId: string,
  cursor: NonNullable<UsageSnapshotSourceRow["summary"]["provider"]>["cursor"]
) {
  return snapshot({
    developerId,
    providerId: "cursor",
    dataIdentity: `cursor:${developerId}:2026-06-01`,
    provider: { cursor },
  })
}

function sample(overrides: Partial<UsageMetricSampleSourceRow> = {}) {
  return {
    id: "sample-1",
    providerId: "mock",
    developerId: "developer-1",
    metricKey: "mock.tokens.total",
    value: 100,
    unit: "tokens",
    sampleDay: "2026-06-01",
    source: "providerReported" as const,
    capturedAt: currentDay,
    updatedAt: currentDay,
    ...overrides,
  }
}
