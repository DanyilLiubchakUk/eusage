import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  clearProviderAccountSharingSettings,
  loadProviderAccountSharingSettings,
  saveProviderAccountSharingSettings,
} from "@/lib/provider-account-sharing-store"

const storeState = new Map<string, unknown>()
const storeDeleteMock = vi.fn()
const storeSaveMock = vi.fn()

vi.mock("@tauri-apps/plugin-store", () => ({
  LazyStore: class {
    async get<T>(key: string): Promise<T | null> {
      if (!storeState.has(key)) return undefined as T | null
      return storeState.get(key) as T | null
    }
    async set<T>(key: string, value: T): Promise<void> {
      storeState.set(key, value)
    }
    async delete(key: string): Promise<void> {
      storeDeleteMock(key)
      storeState.delete(key)
    }
    async save(): Promise<void> {
      storeSaveMock()
    }
  },
}))

describe("provider account sharing store", () => {
  beforeEach(() => {
    storeState.clear()
    storeDeleteMock.mockReset()
    storeSaveMock.mockReset()
  })

  it("loads default sharing settings when missing", async () => {
    saveTeamConnection("team-a")
    await expect(loadProviderAccountSharingSettings()).resolves.toEqual({
      sharedLocalAccountFingerprints: [],
    })
  })

  it("normalizes stored sharing settings", async () => {
    saveTeamConnection("team-a")
    storeState.set("providerAccountSharing", {
      teamFingerprint: "team-a",
      sharedLocalAccountFingerprints: [" fp-work ", "fp-work", "fp-side"],
    })

    await expect(loadProviderAccountSharingSettings()).resolves.toEqual({
      sharedLocalAccountFingerprints: ["fp-work", "fp-side"],
    })
  })

  it("starts private when stored sharing belongs to another team", async () => {
    saveTeamConnection("team-b")
    storeState.set("providerAccountSharing", {
      teamFingerprint: "team-a",
      sharedLocalAccountFingerprints: ["fp-work"],
    })

    await expect(loadProviderAccountSharingSettings()).resolves.toEqual({
      sharedLocalAccountFingerprints: [],
    })
  })

  it("saves and clears sharing settings", async () => {
    saveTeamConnection("team-a")
    await saveProviderAccountSharingSettings({
      sharedLocalAccountFingerprints: ["fp-work"],
    })
    expect(storeState.get("providerAccountSharing")).toEqual({
      teamFingerprint: "team-a",
      sharedLocalAccountFingerprints: ["fp-work"],
    })

    await clearProviderAccountSharingSettings()

    expect(storeDeleteMock).toHaveBeenCalledWith("providerAccountSharing")
    expect(storeState.has("providerAccountSharing")).toBe(false)
    expect(storeSaveMock).toHaveBeenCalled()
  })

  it("does not save sharing without a current team fingerprint", async () => {
    await expect(
      saveProviderAccountSharingSettings({
        sharedLocalAccountFingerprints: ["fp-work"],
      })
    ).rejects.toThrow("Team fingerprint is required")
    expect(storeState.has("providerAccountSharing")).toBe(false)
  })
})

function saveTeamConnection(teamFingerprint: string) {
  storeState.set("teamConnection", { teamFingerprint })
}
