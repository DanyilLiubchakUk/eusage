import { describe, expect, it } from "vitest"
import type { Id } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"
import { dashboardSourceRowsForTeam } from "./dashboardSourceRows"

const now = Date.UTC(2026, 5, 3, 9, 10)
const teamId = "team-1" as Id<"teams">
const developerId = "developer-1" as Id<"developers">
const deviceId = "device-1" as Id<"devices">
const team = {
  _id: teamId,
  name: "eUsage Team",
  slug: "eusage-team",
  reportingTimeZone: "America/New_York",
}
const developer = {
  _id: developerId,
  teamId,
  displayName: "Danyil",
  status: "active",
  createdAt: now,
  updatedAt: now,
}
const codexSnapshot = {
  _id: "snapshot-codex",
  teamId,
  developerId,
  deviceId,
  providerId: "codex",
  providerAccountFingerprint: "team-account-codex",
  periodKey: "codex:2026-06-03",
  dataIdentity: "codex:daily:2026-06-03",
  summary: { tokensTotal: 100 },
  metricFamilies: ["tokens"],
  capturedAt: now,
  updatedAt: now,
}
const codexSample = {
  _id: "metric-codex",
  teamId,
  providerId: "codex",
  providerAccountFingerprint: "team-account-codex",
  developerId,
  deviceId,
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
const device = {
  _id: deviceId,
  teamId,
  developerId,
  deviceId: "device-1",
  deviceName: "Unknown device",
  os: "windows",
  appVersion: "0.6.24",
  status: "connected",
  lastSeenAt: now,
  createdAt: now,
  updatedAt: now,
}
const providerAccount = {
  _id: "provider-account-codex",
  teamId,
  developerId,
  providerId: "codex",
  teamAccountFingerprint: "team-account-codex",
  label: "Codex Work",
  status: "shared",
  firstSharedAt: now - 1_000,
  lastSharedAt: now,
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
    expect(result.team.reportingTimeZone).toBe("America/New_York")
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
            teamId,
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

  it("uses OS fallback for legacy Unknown device labels", async () => {
    const result = await dashboardSourceRowsForTeam(
      fakeCtx({
        developers: [developer],
        devices: [device],
      }),
      team,
      { includeDeveloperTokens: false }
    )

    expect(result.status).toBe("ready")
    if (result.status === "ready") {
      expect(result.developers[0].devices[0].deviceName).toBe("Windows desktop")
    }
  })

  it("returns shared Provider Account labels with account-scoped source rows", async () => {
    const result = await dashboardSourceRowsForTeam(
      fakeCtx({
        developers: [developer],
        usageSnapshots: [codexSnapshot],
        metricSamples: [codexSample],
        providerAccounts: [providerAccount],
      }),
      team,
      { includeDeveloperTokens: false }
    )

    expect(result.providerAccounts).toEqual([
      {
        id: "provider-account-codex",
        developerId,
        providerId: "codex",
        teamAccountFingerprint: "team-account-codex",
        label: "Codex Work",
        status: "shared",
        firstSharedAt: now - 1_000,
        lastSharedAt: now,
        updatedAt: now,
      },
    ])
    expect(result.snapshots[0].providerAccountFingerprint).toBe("team-account-codex")
    expect(result.metricSamples[0].providerAccountFingerprint).toBe("team-account-codex")
  })
})

function provider(providerId: string, status: "enabled" | "disabled") {
  return {
    _id: `provider-${providerId}`,
    teamId,
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
