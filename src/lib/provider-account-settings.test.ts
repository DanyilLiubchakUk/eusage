import { describe, expect, it } from "vitest"
import {
  buildProviderAccountSettingsGroups,
  providerAccountNeedsSharingConfirmation,
} from "@/lib/provider-account-settings"
import type { LocalProviderAccount } from "@/lib/provider-account-registry"

function account(
  overrides: Partial<LocalProviderAccount> = {}
): LocalProviderAccount {
  return {
    providerId: "claude",
    localAccountFingerprint: "fp-work",
    label: "Work Claude",
    visibility: "visible",
    identityConfidence: "high",
    confirmationState: "unconfirmed",
    firstSeenAt: "2026-06-01T00:00:00.000Z",
    lastSeenAt: "2026-06-02T00:00:00.000Z",
    detectionState: "detected",
    ...overrides,
  }
}

describe("provider account settings groups", () => {
  it("groups accounts by provider and separates visible, hidden, and not detected", () => {
    const groups = buildProviderAccountSettingsGroups({
      providers: [
        { id: "codex", name: "Codex", iconUrl: "codex.svg" },
        { id: "claude", name: "Claude", iconUrl: "claude.svg" },
      ],
      accounts: [
        account({
          providerId: "claude",
          localAccountFingerprint: "fp-hidden",
          label: "Hidden Claude",
          visibility: "hidden",
          firstSeenAt: "2026-06-02T00:00:00.000Z",
        }),
        account({
          providerId: "claude",
          localAccountFingerprint: "fp-visible",
          label: "Work Claude",
          visibility: "visible",
          firstSeenAt: "2026-06-01T00:00:00.000Z",
        }),
        account({
          providerId: "codex",
          localAccountFingerprint: "fp-old",
          label: "Old Codex",
          detectionState: "notDetected",
        }),
      ],
    })

    expect(groups.map((group) => group.providerName)).toEqual(["Codex", "Claude"])
    expect(groups[0].notDetectedAccounts.map((row) => row.label)).toEqual(["Old Codex"])
    expect(groups[1].visibleAccounts.map((row) => row.label)).toEqual(["Work Claude"])
    expect(groups[1].hiddenAccounts.map((row) => row.label)).toEqual(["Hidden Claude"])
  })

  it("requires sharing confirmation for lower-confidence or fallback-label accounts", () => {
    expect(
      providerAccountNeedsSharingConfirmation(
        account({ label: "Work Claude", identityConfidence: "high" }),
        "Claude"
      )
    ).toBe(false)
    expect(
      providerAccountNeedsSharingConfirmation(
        account({ label: "Work Claude", identityConfidence: "medium" }),
        "Claude"
      )
    ).toBe(true)
    expect(
      providerAccountNeedsSharingConfirmation(
        account({ label: "Work Claude", identityConfidence: "low" }),
        "Claude"
      )
    ).toBe(true)
    expect(
      providerAccountNeedsSharingConfirmation(
        account({ label: "Claude account 1", identityConfidence: "high" }),
        "Claude"
      )
    ).toBe(true)
    expect(
      providerAccountNeedsSharingConfirmation(
        account({
          label: "Claude account 1",
          identityConfidence: "medium",
          confirmationState: "confirmed",
        }),
        "Claude"
      )
    ).toBe(false)
  })
})
