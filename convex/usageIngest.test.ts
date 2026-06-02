import { describe, expect, it } from "vitest"
import {
  RAW_PAYLOAD_RETENTION_MS,
  SYNC_ERROR_RETENTION_MS,
  ingestUsageBatch,
} from "./usageIngest"
import {
  createUsageIngestTestStore,
  mockUsageProvider,
  usageBatch,
  usageIngestTestNow as now,
} from "../test/convex/usageIngestHelpers"

describe("usage ingest", () => {
  it("writes raw payload, usage snapshot, and metric samples for valid mock usage", async () => {
    const fake = await createUsageIngestTestStore()

    const result = await ingestUsageBatch({
      input: {
        tokenHash: fake.tokenHash,
        batch: usageBatch([mockUsageProvider()]),
      },
      now,
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: true,
      acceptedCount: 1,
      rejectedProviderIds: [],
      serverTime: new Date(now).toISOString(),
    })
    expect(fake.rawPayloads).toHaveLength(1)
    expect(fake.rawPayloads[0]).toMatchObject({
      providerId: "mock",
      payloadVersion: "1.0.0",
      redactionVersion: "1.0.0",
      expiresAt: now + RAW_PAYLOAD_RETENTION_MS,
    })
    expect(fake.usageSnapshots).toHaveLength(1)
    expect(fake.usageSnapshots[0]).toMatchObject({
      developerId: "developer-1",
      deviceId: "device-1",
      providerId: "mock",
      periodKey: "2026-06-01",
      dataIdentity: "mock:developer-1:2026-06-01",
      summaryVersion: "1.0.0",
      extractorVersion: { mock: "1.0.0" },
      metricFamilies: ["tokens", "estimatedCost"],
      rawPayloadId: "raw-1",
    })
    expect(fake.metricSamples).toHaveLength(2)
    expect(fake.devices[0].lastSyncAt).toBe(now)
  })

  it("requires upload, summary, and extractor versions", async () => {
    const fake = await createUsageIngestTestStore()

    const missingUploadVersion = await ingestUsageBatch({
      input: {
        tokenHash: fake.tokenHash,
        batch: { deviceId: "device-1", providers: [mockUsageProvider()] },
      },
      now,
      store: fake.store,
    })

    expect(missingUploadVersion).toMatchObject({
      ok: false,
      code: "upload-schema-version-required",
    })

    const missingProviderVersions = await ingestUsageBatch({
      input: {
        tokenHash: fake.tokenHash,
        batch: usageBatch([
          mockUsageProvider({ providerId: "missing-summary", summaryVersion: "" }),
          mockUsageProvider({
            providerId: "missing-extractor",
            extractorVersion: { other: "1.0.0" },
          }),
        ]),
      },
      now,
      store: fake.store,
    })

    expect(missingProviderVersions).toMatchObject({
      ok: true,
      acceptedCount: 0,
      rejectedProviderIds: ["missing-summary", "missing-extractor"],
    })
    expect(fake.syncErrors.map((error) => error.errorCode)).toEqual([
      "summary-version-required",
      "extractor-version-required",
    ])
    expect(fake.rawPayloads).toHaveLength(0)
  })

  it("upserts snapshots and metric samples by provider, device, period, and data identity", async () => {
    const fake = await createUsageIngestTestStore()
    const second = mockUsageProvider({
      summary: {
        tokensTotal: 250,
        estimatedCostUsd: 2.5,
      },
      metricSamples: [
        {
          metricKey: "mock.tokens.total",
          value: 250,
          unit: "tokens",
          sampleDay: "2026-06-01",
          source: "providerReported",
        },
        {
          metricKey: "mock.cost.estimated",
          value: 2.5,
          unit: "usd",
          sampleDay: "2026-06-01",
          source: "estimated",
        },
      ],
    })

    await ingestUsageBatch({
      input: { tokenHash: fake.tokenHash, batch: usageBatch([mockUsageProvider()]) },
      now,
      store: fake.store,
    })
    await ingestUsageBatch({
      input: { tokenHash: fake.tokenHash, batch: usageBatch([second]) },
      now: now + 1_000,
      store: fake.store,
    })

    expect(fake.rawPayloads).toHaveLength(2)
    expect(fake.usageSnapshots).toHaveLength(1)
    expect(fake.usageSnapshots[0]).toMatchObject({
      rawPayloadId: "raw-2",
      summary: {
        tokensTotal: 250,
        estimatedCostUsd: 2.5,
      },
      updatedAt: now + 1_000,
    })
    expect(fake.metricSamples).toHaveLength(2)
    expect(fake.metricSamples.find((sample) => sample.metricKey === "mock.tokens.total"))
      .toMatchObject({
        value: 250,
        updatedAt: now + 1_000,
      })
  })

  it("keeps local consumed metric samples separate by device", async () => {
    const fake = await createUsageIngestTestStore()
    fake.devices.push({
      _id: "device-row-2",
      teamId: "team-1",
      developerId: "developer-1",
      deviceId: "device-2",
      deviceName: "Alex Windows",
      os: "windows",
      appVersion: "0.6.24",
      status: "connected",
      lastSeenAt: now - 5_000,
      createdAt: now - 5_000,
      updatedAt: now - 5_000,
    })

    await ingestUsageBatch({
      input: {
        tokenHash: fake.tokenHash,
        batch: usageBatch([
          mockUsageProvider({
            providerId: "codex",
            extractorVersion: { codex: "1.0.0" },
            metricSamples: [
              {
                metricKey: "codex.tokens.total",
                value: 19_000_000,
                unit: "tokens",
                sampleDay: "2026-06-01",
                source: "providerReported",
              },
              {
                metricKey: "codex.cost.estimated",
                value: 23.2,
                unit: "usd",
                sampleDay: "2026-06-01",
                source: "estimated",
              },
            ],
          }),
        ]),
      },
      now,
      store: fake.store,
    })
    await ingestUsageBatch({
      input: {
        tokenHash: fake.tokenHash,
        batch: {
          ...usageBatch([
            mockUsageProvider({
              providerId: "codex",
              extractorVersion: { codex: "1.0.0" },
              metricSamples: [
                {
                  metricKey: "codex.tokens.total",
                  value: 4_000_000,
                  unit: "tokens",
                  sampleDay: "2026-06-01",
                  source: "providerReported",
                },
                {
                  metricKey: "codex.cost.estimated",
                  value: 5,
                  unit: "usd",
                  sampleDay: "2026-06-01",
                  source: "estimated",
                },
                {
                  metricKey: "codex.api.percentUsed",
                  value: 45,
                  unit: "percent",
                  sampleDay: "2026-06-01",
                  source: "providerReported",
                },
              ],
            }),
          ]),
          deviceId: "device-2",
        },
      },
      now: now + 1_000,
      store: fake.store,
    })

    expect(fake.usageSnapshots).toHaveLength(2)
    expect(
      fake.metricSamples
        .filter((sample) => sample.metricKey === "codex.tokens.total")
        .map((sample) => [sample.deviceId, sample.value])
        .sort()
    ).toEqual([
      ["device-1", 19_000_000],
      ["device-2", 4_000_000],
    ])
    expect(
      fake.metricSamples
        .filter((sample) => sample.metricKey === "codex.cost.estimated")
        .map((sample) => [sample.deviceId, sample.value])
        .sort()
    ).toEqual([
      ["device-1", 23.2],
      ["device-2", 5],
    ])
    const percentSample = fake.metricSamples.find((sample) => sample.metricKey === "codex.api.percentUsed")
    expect(percentSample).toMatchObject({
      value: 45,
      updatedAt: now + 1_000,
    })
    expect(percentSample).not.toHaveProperty("deviceId")
  })

  it("accepts valid providers and rejects invalid source facts without raw-only rows", async () => {
    const fake = await createUsageIngestTestStore()
    const invalidProvider = mockUsageProvider({
      providerId: "broken",
      summary: {},
      extractorVersion: { broken: "1.0.0" },
    })

    const result = await ingestUsageBatch({
      input: {
        tokenHash: fake.tokenHash,
        batch: usageBatch([mockUsageProvider(), invalidProvider]),
      },
      now,
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: true,
      acceptedCount: 1,
      rejectedProviderIds: ["broken"],
    })
    expect(fake.rawPayloads.map((payload) => payload.providerId)).toEqual(["mock"])
    expect(fake.usageSnapshots.map((snapshot) => snapshot.providerId)).toEqual(["mock"])
    expect(fake.syncErrors[0]).toMatchObject({
      providerId: "broken",
      errorCode: "source-facts-required",
      expiresAt: now + SYNC_ERROR_RETENTION_MS,
    })
  })

  it("stores rejected provider details without raw payloads or secrets", async () => {
    const fake = await createUsageIngestTestStore()
    const secretProvider = mockUsageProvider({
      providerId: "secret-provider",
      payload: {
        apiKey: "sk-live-secret",
      },
      extractorVersion: {
        "secret-provider": "1.0.0",
      },
    })

    const result = await ingestUsageBatch({
      input: {
        tokenHash: fake.tokenHash,
        batch: usageBatch([secretProvider]),
      },
      now,
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: true,
      acceptedCount: 0,
      rejectedProviderIds: ["secret-provider"],
    })
    expect(fake.rawPayloads).toHaveLength(0)
    expect(fake.usageSnapshots).toHaveLength(0)
    expect(fake.syncErrors[0]).toMatchObject({
      providerId: "secret-provider",
      errorCode: "secret-not-redacted",
      details: {
        field: "payload.apiKey",
      },
    })
    expect(JSON.stringify(fake.syncErrors)).not.toContain("sk-live-secret")
  })
})
