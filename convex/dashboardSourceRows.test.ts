import { describe, expect, it } from "vitest"
import type { QueryCtx } from "./_generated/server"
import { dashboardSourceRowsForTeam } from "./dashboardSourceRows"

const now = Date.UTC(2026, 5, 3, 9, 10)
const team = {
  _id: "team-1",
  name: "eUsage Team",
  slug: "eusage-team",
}
const developer = {
  _id: "developer-1",
  teamId: "team-1",
  displayName: "Danyil",
  status: "active",
  createdAt: now,
  updatedAt: now,
}
const codexSnapshot = {
  _id: "snapshot-codex",
  teamId: "team-1",
  developerId: "developer-1",
  deviceId: "device-1",
  providerId: "codex",
  periodKey: "codex:2026-06-03",
  dataIdentity: "codex:daily:2026-06-03",
  summary: { tokensTotal: 100 },
  metricFamilies: ["tokens"],
  capturedAt: now,
  updatedAt: now,
}
const codexSample = {
  _id: "metric-codex",
  teamId: "team-1",
  providerId: "codex",
  developerId: "developer-1",
  deviceId: "device-1",
  metricKey: "codex.tokens.total",
  value: 100,
  unit: "tokens",
  sampleDay: "2026-06-03",
  source: "providerReported",
  summaryVersion: "1",
  extractorVersion: { codex: "1" },
  capturedAt: now,
  updatedAt: now,
}

describe("dashboard source rows", () => {
  it("keeps public TV usage when provider registry rows are missing", async () => {
    const result = await dashboardSourceRowsForTeam(
      fakeCtx({
        developers: [developer],
        usageSnapshots: [codexSnapshot],
        metricSamples: [codexSample],
        providers: [],
      }),
      team,
      { includeDeveloperTokens: false, tvSafeOnly: true }
    )

    expect(result.snapshots).toHaveLength(1)
    expect(result.metricSamples).toHaveLength(1)
    expect(result.providers).toEqual([])
  })

  it("hides disabled providers from public TV usage", async () => {
    const result = await dashboardSourceRowsForTeam(
      fakeCtx({
        developers: [developer],
        usageSnapshots: [codexSnapshot],
        metricSamples: [codexSample],
        providers: [provider("codex", "disabled")],
      }),
      team,
      { includeDeveloperTokens: false, tvSafeOnly: true }
    )

    expect(result.snapshots).toHaveLength(0)
    expect(result.metricSamples).toHaveLength(0)
    expect(result.providers).toEqual([])
  })

  it("applies TV provider selections without provider registry rows", async () => {
    const result = await dashboardSourceRowsForTeam(
      fakeCtx({
        developers: [developer],
        usageSnapshots: [codexSnapshot],
        metricSamples: [codexSample],
        providers: [],
        tvSettings: [
          {
            teamId: "team-1",
            dateRange: { preset: "last7" },
            visibleProviderIds: ["cursor"],
            visibleDeveloperIds: undefined,
            slides: [],
            theme: "dark",
            createdAt: now,
            updatedAt: now,
          },
        ],
      }),
      team,
      { includeDeveloperTokens: false, tvSafeOnly: true }
    )

    expect(result.snapshots).toHaveLength(0)
    expect(result.metricSamples).toHaveLength(0)
  })
})

function provider(providerId: string, status: "enabled" | "disabled") {
  return {
    _id: `provider-${providerId}`,
    teamId: "team-1",
    providerId,
    name: providerId,
    status,
    brandColor: "#000000",
    createdAt: now,
    updatedAt: now,
  }
}

function fakeCtx(rows: Record<string, unknown[]>) {
  return {
    db: {
      query: (table: string) => ({
        withIndex: () => {
          const q = {
            collect: async () => rows[table] ?? [],
            first: async () => rows[table]?.[0] ?? null,
          }
          return q
        },
      }),
    },
  } as unknown as QueryCtx
}
