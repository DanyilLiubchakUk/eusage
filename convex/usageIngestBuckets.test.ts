import { describe, expect, it } from "vitest"
import { ingestUsageBatch } from "./usageIngest"
import {
  createUsageIngestTestStore,
  mockReportingBucket,
  mockUsageProvider,
  usageBatch,
  usageIngestTestNow as now,
} from "../test/convex/usageIngestHelpers"

describe("usage ingest reporting buckets", () => {
  it("rejects missing or malformed bucket metadata for daily consumed usage", async () => {
    const fake = await createUsageIngestTestStore()
    const missingBucket = mockUsageProvider({
      providerId: "missing-bucket",
      extractorVersion: { "missing-bucket": "1.0.0" },
      metricSamples: [
        {
          metricKey: "missing-bucket.tokens.total",
          value: 100,
          unit: "tokens",
          sampleDay: "2026-06-01",
          source: "providerReported",
        },
      ],
    })
    const malformedBucket = mockUsageProvider({
      providerId: "malformed-bucket",
      extractorVersion: { "malformed-bucket": "1.0.0" },
      metricSamples: [
        {
          metricKey: "malformed-bucket.cost.estimated",
          value: 1.25,
          unit: "usd",
          sampleDay: "2026-06-01",
          source: "estimated",
          bucket: {
            ...mockReportingBucket(),
            endMs: Date.parse("2026-06-03T00:00:00.000Z"),
          },
        },
      ],
    })

    const result = await ingestUsageBatch({
      input: {
        tokenHash: fake.tokenHash,
        batch: usageBatch([mockUsageProvider(), missingBucket, malformedBucket]),
      },
      now,
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: true,
      acceptedCount: 1,
      rejectedProviderIds: ["missing-bucket", "malformed-bucket"],
    })
    expect(fake.rawPayloads.map((payload) => payload.providerId)).toEqual(["mock"])
    expect(fake.syncErrors.map((error) => error.errorCode)).toEqual([
      "metric-bucket-required",
      "metric-bucket-invalid",
    ])
    expect(fake.syncErrors.map((error) => error.details?.field)).toEqual([
      "metricSamples.0.bucket",
      "metricSamples.0.bucket",
    ])
  })
})
