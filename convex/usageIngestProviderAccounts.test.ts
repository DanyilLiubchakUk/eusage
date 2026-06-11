import { describe, expect, it } from "vitest"
import { ingestUsageBatch } from "./usageIngest"
import {
  createUsageIngestTestStore,
  mockUsageProvider,
  usageBatch,
  usageIngestTestNow as now,
} from "../test/convex/usageIngestHelpers"

describe("usage ingest provider account metadata", () => {
  it("stores Provider Account metadata only for shared account uploads", async () => {
    const fake = await createUsageIngestTestStore()

    const result = await ingestUsageBatch({
      input: {
        tokenHash: fake.tokenHash,
        batch: usageBatch([
          mockUsageProvider(),
          sharedProvider({
            providerId: "cursor",
            providerAccountLabel: "Cursor Work",
          }),
        ]),
      },
      now,
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: true,
      acceptedCount: 2,
      rejectedProviderIds: [],
    })
    expect(fake.providerAccounts).toEqual([
      expect.objectContaining({
        teamId: "team-1",
        developerId: "developer-1",
        providerId: "cursor",
        teamAccountFingerprint: "team-account-fingerprint",
        label: "Cursor Work",
        status: "shared",
        firstSharedAt: now,
        lastSharedAt: now,
        updatedAt: now,
      }),
    ])
    expect(fake.usageSnapshots).toHaveLength(2)
    expect(
      fake.usageSnapshots.find((snapshot) => snapshot.providerId === "cursor")
    ).toMatchObject({
      providerAccountFingerprint: "team-account-fingerprint",
    })
    expect(
      fake.metricSamples
        .filter((sample) => sample.providerId === "cursor")
        .every((sample) => sample.providerAccountFingerprint === "team-account-fingerprint")
    ).toBe(true)
  })

  it("keeps shared account metric samples separate for the same provider", async () => {
    const fake = await createUsageIngestTestStore()

    await ingestUsageBatch({
      input: {
        tokenHash: fake.tokenHash,
        batch: usageBatch([
          sharedProvider({
            providerAccountFingerprint: "team-account-work",
            providerAccountLabel: "Cursor Work",
            dataIdentity: "provider-account:team-account-work:cursor:billing-cycle",
          }),
        ]),
      },
      now,
      store: fake.store,
    })
    await ingestUsageBatch({
      input: {
        tokenHash: fake.tokenHash,
        batch: usageBatch([
          sharedProvider({
            providerAccountFingerprint: "team-account-side",
            providerAccountLabel: "Cursor Side",
            dataIdentity: "provider-account:team-account-side:cursor:billing-cycle",
          }),
        ]),
      },
      now: now + 1_000,
      store: fake.store,
    })

    const tokenSamples = fake.metricSamples.filter(
      (sample) => sample.providerId === "cursor" && sample.metricKey === "mock.tokens.total"
    )
    expect(tokenSamples).toHaveLength(2)
    expect(tokenSamples.map((sample) => sample.providerAccountFingerprint).sort()).toEqual([
      "team-account-side",
      "team-account-work",
    ])
  })

  it("updates shared Provider Account label without changing first shared time", async () => {
    const fake = await createUsageIngestTestStore()

    await ingestUsageBatch({
      input: {
        tokenHash: fake.tokenHash,
        batch: usageBatch([sharedProvider({ providerAccountLabel: "Cursor Work" })]),
      },
      now,
      store: fake.store,
    })
    await ingestUsageBatch({
      input: {
        tokenHash: fake.tokenHash,
        batch: usageBatch([sharedProvider({ providerAccountLabel: "Cursor Team" })]),
      },
      now: now + 1_000,
      store: fake.store,
    })

    expect(fake.providerAccounts).toHaveLength(1)
    expect(fake.providerAccounts[0]).toMatchObject({
      label: "Cursor Team",
      status: "shared",
      firstSharedAt: now,
      lastSharedAt: now + 1_000,
      updatedAt: now + 1_000,
    })
  })

  it("rejects incomplete shared Provider Account metadata", async () => {
    const fake = await createUsageIngestTestStore()

    const missingLabel = await ingestUsageBatch({
      input: {
        tokenHash: fake.tokenHash,
        batch: usageBatch([sharedProvider({ providerAccountLabel: undefined })]),
      },
      now,
      store: fake.store,
    })
    const labelWithoutFingerprint = await ingestUsageBatch({
      input: {
        tokenHash: fake.tokenHash,
        batch: usageBatch([
          sharedProvider({
            providerAccountFingerprint: undefined,
            providerAccountLabel: "Cursor Work",
          }),
        ]),
      },
      now,
      store: fake.store,
    })

    expect(missingLabel).toMatchObject({
      ok: true,
      acceptedCount: 0,
      rejectedProviderIds: ["cursor"],
    })
    expect(labelWithoutFingerprint).toMatchObject({
      ok: true,
      acceptedCount: 0,
      rejectedProviderIds: ["cursor"],
    })
    expect(fake.rawPayloads).toHaveLength(0)
    expect(fake.providerAccounts).toHaveLength(0)
    expect(fake.syncErrors.map((error) => error.errorCode)).toEqual([
      "provider-account-label-required",
      "provider-account-fingerprint-required",
    ])
    expect(fake.syncErrors.map((error) => error.details?.field)).toEqual([
      "providerAccountLabel",
      "providerAccountFingerprint",
    ])
  })
})

function sharedProvider(overrides: Record<string, unknown> = {}) {
  return mockUsageProvider({
    providerId: "cursor",
    extractorVersion: { cursor: "1.0.0" },
    dataIdentity: "provider-account:team-account-fingerprint:cursor:billing-cycle",
    providerAccountFingerprint: "team-account-fingerprint",
    ...overrides,
  })
}
