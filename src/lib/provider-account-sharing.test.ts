import { describe, expect, it } from "vitest"
import {
  areProviderAccountSharingSettingsEqual,
  normalizeProviderAccountSharingSettings,
  pruneProviderAccountSharing,
  updateProviderAccountSharing,
  withProviderAccountSharingTeamFingerprint,
} from "@/lib/provider-account-sharing"

describe("provider account sharing", () => {
  it("normalizes stored shared fingerprints", () => {
    expect(
      normalizeProviderAccountSharingSettings({
        teamFingerprint: "team-a",
        sharedLocalAccountFingerprints: [" fp-work ", "", "fp-work", 42, "fp-side"],
      }, "team-a")
    ).toEqual({
      sharedLocalAccountFingerprints: ["fp-work", "fp-side"],
    })
  })

  it("ignores sharing settings for another team", () => {
    expect(
      normalizeProviderAccountSharingSettings({
        teamFingerprint: "team-a",
        sharedLocalAccountFingerprints: ["fp-work"],
      }, "team-b")
    ).toBeNull()
  })

  it("adds and removes shared account fingerprints", () => {
    const added = updateProviderAccountSharing(
      { sharedLocalAccountFingerprints: [] },
      "fp-work",
      true
    )
    expect(added).toEqual({
      ok: true,
      value: { sharedLocalAccountFingerprints: ["fp-work"] },
    })

    expect(
      updateProviderAccountSharing(added.ok ? added.value : never(), "fp-work", false)
    ).toEqual({
      ok: true,
      value: { sharedLocalAccountFingerprints: [] },
    })
  })

  it("prunes accounts that are not shareable anymore", () => {
    expect(
      pruneProviderAccountSharing(
        { sharedLocalAccountFingerprints: ["fp-work", "fp-hidden", "fp-old"] },
        ["fp-work"]
      )
    ).toEqual({
      sharedLocalAccountFingerprints: ["fp-work"],
    })
  })

  it("compares settings by fingerprint order", () => {
    expect(
      areProviderAccountSharingSettingsEqual(
        { sharedLocalAccountFingerprints: ["fp-work"] },
        { sharedLocalAccountFingerprints: ["fp-work"] }
      )
    ).toBe(true)
    expect(
      areProviderAccountSharingSettingsEqual(
        { sharedLocalAccountFingerprints: ["fp-work"] },
        { sharedLocalAccountFingerprints: ["fp-side"] }
      )
    ).toBe(false)
  })

  it("stores sharing settings with the active team fingerprint", () => {
    expect(
      withProviderAccountSharingTeamFingerprint(
        { sharedLocalAccountFingerprints: ["fp-work"] },
        " team-a "
      )
    ).toEqual({
      teamFingerprint: "team-a",
      sharedLocalAccountFingerprints: ["fp-work"],
    })
  })
})

function never(): never {
  throw new Error("Expected provider account sharing update to succeed.")
}
