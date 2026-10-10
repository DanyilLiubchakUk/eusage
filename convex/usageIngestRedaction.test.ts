import { describe, expect, it } from "vitest"
import { findUnredactedSecretPath } from "./usageIngestRedaction"
import { normalizeProvider } from "./usageIngestValidation"
import { mockUsageProvider } from "../test/convex/usageIngestHelpers"

describe("usage secret redaction", () => {
  it("accepts only complete redaction markers", () => {
    for (const value of [null, "[REDACTED]", { redacted: true }]) {
      expect(findUnredactedSecretPath({ apiKey: value })).toBeNull()
    }
    for (const value of ["unredacted-secret", "[REDACTED] secret", { redacted: true, value: "secret" }]) {
      expect(findUnredactedSecretPath({ apiKey: value })).toBe("payload.apiKey")
    }
  })

  it("rejects cookie collections, CSRF values, and credential objects", () => {
    for (const field of ["cookies", "csrf", "credentials"]) {
      expect(findUnredactedSecretPath({ [field]: { value: "synthetic-secret" } })).toBe(`payload.${field}`)
      expect(findUnredactedSecretPath({ [field]: "[REDACTED]" })).toBeNull()
    }
  })

  it("rejects secrets in summaries and metric coverage before storage", () => {
    const provider = mockUsageProvider()
    for (const [input, field] of [
      [{ ...provider, summary: { ...provider.summary, provider: { accessToken: "secret" } } }, "summary.provider.accessToken"],
      [{ ...provider, metricSamples: provider.metricSamples.map((sample) => ({ ...sample, coverage: { apiKey: "secret" } })) }, "metricSamples.0.coverage.apiKey"],
    ] as const) {
      expect(normalizeProvider(input)).toMatchObject({
        ok: false,
        error: { code: "secret-not-redacted", field },
      })
    }
  })
})
