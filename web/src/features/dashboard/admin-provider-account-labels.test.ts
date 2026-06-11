import { describe, expect, it } from "vitest"
import type { ProviderAccountSourceRow } from "../../lib/metrics"
import {
  buildProviderAccountLabelMap,
  buildProviderAccountSummaries,
  providerAccountLabelForDetail,
} from "./admin-provider-account-labels"

const now = Date.UTC(2026, 5, 1, 12)

describe("Admin Provider Account labels", () => {
  it("matches labels only by shared backend account identity", () => {
    const labels = buildProviderAccountLabelMap([providerAccount()])

    expect(
      providerAccountLabelForDetail(
        {
          developerId: "alex",
          providerId: "claude",
          providerAccountFingerprint: "team-claude-work",
        },
        labels
      )
    ).toBe("Claude Work")
    expect(
      providerAccountLabelForDetail(
        {
          developerId: "alex",
          providerId: "claude",
        },
        labels
      )
    ).toBeNull()
    expect(
      providerAccountLabelForDetail(
        {
          developerId: "sam",
          providerId: "claude",
          providerAccountFingerprint: "team-claude-work",
        },
        labels
      )
    ).toBeNull()
    expect(
      providerAccountLabelForDetail(
        {
          developerId: "alex",
          providerId: "cursor",
          providerAccountFingerprint: "team-claude-work",
        },
        labels
      )
    ).toBeNull()
    expect(
      providerAccountLabelForDetail(
        {
          developerId: "alex",
          providerId: "claude",
          providerAccountFingerprint: "work@example.com",
        },
        labels
      )
    ).toBeNull()
  })

  it("builds provider summaries from shared labels, not fingerprints", () => {
    const summaries = buildProviderAccountSummaries(
      [
        providerAccount(),
        providerAccount({
          id: "provider-account-side",
          teamAccountFingerprint: "work@example.com",
          label: "Claude Side",
        }),
      ],
      [{ id: "alex", displayName: "Alex" }]
    )

    expect(summaries.get("claude")).toBe("Alex: Claude Work, Claude Side")
    expect(summaries.get("claude")).not.toContain("work@example.com")
  })
})

function providerAccount(
  overrides: Partial<ProviderAccountSourceRow> = {}
): ProviderAccountSourceRow {
  return {
    id: "provider-account-work",
    developerId: "alex",
    providerId: "claude",
    teamAccountFingerprint: "team-claude-work",
    label: "Claude Work",
    status: "shared",
    firstSharedAt: now - 1_000,
    lastSharedAt: now,
    updatedAt: now,
    ...overrides,
  }
}
