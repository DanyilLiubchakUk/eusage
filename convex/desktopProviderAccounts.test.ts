import { describe, expect, it } from "vitest"
import { updateProviderAccountMetadata } from "./desktopApi"
import { createDesktopApiTestStore } from "../test/convex/desktopApiHelpers"

describe("desktop Provider Account metadata", () => {
  it("creates shared Provider Account metadata from a desktop update", async () => {
    const fake = await createDesktopApiTestStore()

    const result = await updateProviderAccountMetadata({
      input: {
        tokenHash: fake.tokenHash,
        providerId: "cursor",
        providerAccountFingerprint: "team-account-fingerprint",
        providerAccountLabel: "Cursor Work",
        status: "shared",
      },
      now: 1780340000000,
      store: fake.providerAccountStore,
    })

    expect(result).toMatchObject({
      ok: true,
      providerId: "cursor",
      serverTime: "2026-06-01T18:53:20.000Z",
    })
    expect(fake.providerAccounts).toEqual([
      expect.objectContaining({
        teamId: "team-1",
        developerId: "developer-1",
        providerId: "cursor",
        teamAccountFingerprint: "team-account-fingerprint",
        label: "Cursor Work",
        status: "shared",
        firstSharedAt: 1780340000000,
        lastSharedAt: 1780340000000,
        updatedAt: 1780340000000,
      }),
    ])
    expect(fake.developers[0].lastSeenAt).toBe(1780340000000)
    expect(fake.tokens[0].lastUsedAt).toBe(1780340000000)
  })

  it("updates shared Provider Account label without changing share times", async () => {
    const fake = await createDesktopApiTestStore({
      providerAccounts: [
        {
          _id: "provider-account-1",
          teamId: "team-1",
          developerId: "developer-1",
          providerId: "cursor",
          teamAccountFingerprint: "team-account-fingerprint",
          label: "Cursor Work",
          status: "shared",
          firstSharedAt: 1780330000000,
          lastSharedAt: 1780335000000,
          updatedAt: 1780335000000,
        },
      ],
    })

    await updateProviderAccountMetadata({
      input: {
        tokenHash: fake.tokenHash,
        providerId: "cursor",
        providerAccountFingerprint: "team-account-fingerprint",
        providerAccountLabel: "Cursor Team",
        status: "shared",
      },
      now: 1780340000000,
      store: fake.providerAccountStore,
    })

    expect(fake.providerAccounts).toEqual([
      expect.objectContaining({
        label: "Cursor Team",
        firstSharedAt: 1780330000000,
        lastSharedAt: 1780335000000,
        updatedAt: 1780340000000,
      }),
    ])
  })

  it("rejects incomplete Provider Account metadata updates", async () => {
    const fake = await createDesktopApiTestStore()

    const result = await updateProviderAccountMetadata({
      input: {
        tokenHash: fake.tokenHash,
        providerId: "cursor",
        providerAccountFingerprint: "",
        providerAccountLabel: "Cursor Work",
        status: "shared",
      },
      now: 1780340000000,
      store: fake.providerAccountStore,
    })

    expect(result).toMatchObject({
      ok: false,
      code: "invalid-body",
    })
    expect(fake.providerAccounts).toHaveLength(0)
  })
})
