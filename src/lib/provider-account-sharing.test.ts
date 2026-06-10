import { describe, expect, it } from "vitest"
import {
  areProviderAccountSharingSettingsEqual,
  normalizeProviderAccountSharingSettings,
  pruneProviderAccountSharing,
  updateProviderAccountSharing,
} from "@/lib/provider-account-sharing"

describe("provider account sharing", () => {
  it("normalizes stored shared fingerprints", () => {
    expect(
      normalizeProviderAccountSharingSettings({
        sharedLocalAccountFingerprints: [" fp-work ", "", "fp-work", 42, "fp-side"],
      })
    ).toEqual({
      sharedLocalAccountFingerprints: ["fp-work", "fp-side"],
    })
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
})

function never(): never {
  throw new Error("Expected provider account sharing update to succeed.")
}
