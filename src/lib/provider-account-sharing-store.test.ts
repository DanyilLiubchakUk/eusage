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
    await expect(loadProviderAccountSharingSettings()).resolves.toEqual({
      sharedLocalAccountFingerprints: [],
    })
  })

  it("normalizes stored sharing settings", async () => {
    storeState.set("providerAccountSharing", {
      sharedLocalAccountFingerprints: [" fp-work ", "fp-work", "fp-side"],
    })

    await expect(loadProviderAccountSharingSettings()).resolves.toEqual({
      sharedLocalAccountFingerprints: ["fp-work", "fp-side"],
    })
  })

  it("saves and clears sharing settings", async () => {
    await saveProviderAccountSharingSettings({
      sharedLocalAccountFingerprints: ["fp-work"],
    })
    expect(storeState.get("providerAccountSharing")).toEqual({
      sharedLocalAccountFingerprints: ["fp-work"],
    })

    await clearProviderAccountSharingSettings()

    expect(storeDeleteMock).toHaveBeenCalledWith("providerAccountSharing")
    expect(storeState.has("providerAccountSharing")).toBe(false)
    expect(storeSaveMock).toHaveBeenCalled()
  })
})
