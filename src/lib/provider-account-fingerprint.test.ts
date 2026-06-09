import { describe, expect, it } from "vitest"
import {
  PROVIDER_ACCOUNT_IDENTITY_KINDS,
  fingerprintProviderAccount,
  type ProviderAccountIdentityKind,
} from "@/lib/provider-account-fingerprint"

const baseInput = {
  providerId: "claude",
  identityKind: "providerAccountId" as ProviderAccountIdentityKind,
  identityValue: "acct_work_123",
  localSalt: "desktop-local-salt",
}

describe("provider account fingerprint", () => {
  it("supports every fixed provider account identity kind", async () => {
    for (const identityKind of PROVIDER_ACCOUNT_IDENTITY_KINDS) {
      await expect(
        fingerprintProviderAccount({
          ...baseInput,
          identityKind,
          identityValue: `${identityKind}:value`,
        })
      ).resolves.toMatchObject({
        ok: true,
        value: {
          scope: "local",
        },
      })
    }
  })

  it("builds stable local fingerprints from provider identity and local salt", async () => {
    const first = await fingerprintProviderAccount(baseInput)
    const second = await fingerprintProviderAccount({ ...baseInput })
    const changedSalt = await fingerprintProviderAccount({
      ...baseInput,
      localSalt: "other-desktop-local-salt",
    })

    expect(first).toMatchObject({
      ok: true,
      value: {
        scope: "local",
        fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    })
    expect(second).toEqual(first)
    expect(changedSalt).toMatchObject({ ok: true })
    if (first.ok && changedSalt.ok) {
      expect(changedSalt.value.fingerprint).not.toBe(first.value.fingerprint)
    }
  })

  it("builds team-scoped fingerprints from team fingerprint", async () => {
    const local = await fingerprintProviderAccount(baseInput)
    const teamA = await fingerprintProviderAccount({
      ...baseInput,
      teamFingerprint: "team-a-fingerprint",
    })
    const teamB = await fingerprintProviderAccount({
      ...baseInput,
      teamFingerprint: "team-b-fingerprint",
    })

    expect(teamA).toMatchObject({
      ok: true,
      value: {
        scope: "team",
        fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    })
    expect(teamB).toMatchObject({ ok: true })
    if (local.ok && teamA.ok && teamB.ok) {
      expect(teamA.value.fingerprint).not.toBe(local.value.fingerprint)
      expect(teamB.value.fingerprint).not.toBe(teamA.value.fingerprint)
    }
  })

  it("keeps team fingerprints stable across desktop local salts", async () => {
    const firstDevice = await fingerprintProviderAccount({
      ...baseInput,
      localSalt: "first-desktop-local-salt",
      teamFingerprint: "team-a-fingerprint",
    })
    const secondDevice = await fingerprintProviderAccount({
      ...baseInput,
      localSalt: "second-desktop-local-salt",
      teamFingerprint: "team-a-fingerprint",
    })

    expect(firstDevice).toMatchObject({ ok: true })
    expect(secondDevice).toEqual(firstDevice)
  })

  it("does not expose raw provider account identity values", async () => {
    const result = await fingerprintProviderAccount({
      providerId: "claude",
      identityKind: "providerEmail",
      identityValue: "private@example.com",
      localSalt: "desktop-local-salt",
      teamFingerprint: "team-fingerprint",
    })

    expect(result).toMatchObject({ ok: true })
    if (result.ok) {
      expect(result.value.fingerprint).not.toContain("private")
      expect(result.value.fingerprint).not.toContain("example")
      expect(result.value.fingerprint).not.toContain("claude")
      expect(result.value.fingerprint).not.toContain("team")
    }
  })

  it("returns explicit errors for invalid expected inputs", async () => {
    await expect(fingerprintProviderAccount({ ...baseInput, providerId: " " })).resolves
      .toMatchObject({ ok: false, code: "provider-id-required" })
    await expect(
      fingerprintProviderAccount({
        ...baseInput,
        identityKind: "bad-kind" as ProviderAccountIdentityKind,
      })
    ).resolves.toMatchObject({ ok: false, code: "identity-kind-invalid" })
    await expect(fingerprintProviderAccount({ ...baseInput, identityValue: " " })).resolves
      .toMatchObject({ ok: false, code: "identity-value-required" })
    await expect(fingerprintProviderAccount({ ...baseInput, localSalt: " " })).resolves
      .toMatchObject({ ok: false, code: "local-salt-required" })
  })
})
