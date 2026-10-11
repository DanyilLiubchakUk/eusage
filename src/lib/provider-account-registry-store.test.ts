import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  updateProviderAccountLabel,
  updateProviderAccountVisibility,
  type ProviderAccountRegistry,
} from "@/lib/provider-account-registry"
import {
  getOrCreateProviderAccountLocalSalt,
  loadProviderAccountRegistry,
  syncSavedProviderAccountRegistry,
  updateSavedProviderAccountRegistry,
} from "@/lib/provider-account-registry-store"

const store = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  get: vi.fn(), set: vi.fn(), delete: vi.fn(), save: vi.fn(),
}))

vi.mock("@tauri-apps/plugin-store", () => ({
  LazyStore: class {
    async get<T>(key: string): Promise<T | undefined> { return await store.get(key) }
    async set(key: string, value: unknown): Promise<void> { await store.set(key, value) }
    async delete(key: string): Promise<void> { await store.delete(key) }
    async save(): Promise<void> { await store.save() }
  },
}))

const registry: ProviderAccountRegistry = {
  accounts: [{
    providerId: "claude", localAccountFingerprint: "fp-work", label: "Work",
    visibility: "visible", identityConfidence: "high", confirmationState: "unconfirmed",
    firstSeenAt: "2026-06-01T00:00:00.000Z", lastSeenAt: "2026-06-02T00:00:00.000Z",
    detectionState: "detected",
  }],
}

describe("provider account registry persistence", () => {
  beforeEach(() => {
    store.values.clear()
    store.get.mockReset().mockImplementation(async (key: string) => store.values.get(key))
    store.set.mockReset().mockImplementation(async (key: string, value: unknown) => {
      store.values.set(key, structuredClone(value))
    })
    store.delete.mockReset().mockImplementation(async (key: string) => store.values.delete(key))
    store.save.mockReset().mockResolvedValue(undefined)
  })

  it("creates one persistent salt for concurrent first probes", async () => {
    const salts = await Promise.all([
      getOrCreateProviderAccountLocalSalt(),
      getOrCreateProviderAccountLocalSalt(),
      getOrCreateProviderAccountLocalSalt(),
    ])

    expect(new Set(salts).size).toBe(1)
    expect(store.values.get("providerAccountLocalSalt")).toBe(salts[0])
    expect(store.set).toHaveBeenCalledTimes(1)
    expect(store.save).toHaveBeenCalledTimes(1)
  })

  it("merges concurrent provider probes instead of overwriting an earlier discovery", async () => {
    await Promise.all(["claude", "codex"].map((providerId) => syncSavedProviderAccountRegistry({
      detectedAccounts: [{
        providerId, providerName: providerId, identityKind: "providerAccountId",
        identityValue: `${providerId}-test-account`, identityConfidence: "high", localSalt: "test-salt",
      }],
      scannedProviderIds: [providerId], detectedAt: "2026-06-03T00:00:00.000Z",
    })))

    const saved = await loadProviderAccountRegistry()
    expect(saved.accounts.map((account) => [account.providerId, account.detectionState])).toEqual([
      ["claude", "detected"], ["codex", "detected"],
    ])
    expect(store.save).toHaveBeenCalledTimes(2)
  })

  it("does not publish a queued read until the pending save completes", async () => {
    store.values.set("providerAccountRegistry", structuredClone(registry))
    let finishSave!: () => void
    store.save.mockImplementationOnce(() => new Promise<void>((resolve) => { finishSave = resolve }))
    const update = updateSavedProviderAccountRegistry((current) =>
      updateProviderAccountLabel(current, "fp-work", "Main")
    )
    const read = loadProviderAccountRegistry()
    await vi.waitFor(() => expect(store.save).toHaveBeenCalledTimes(1))
    expect(store.get).toHaveBeenCalledTimes(2)

    finishSave()
    await update
    await expect(read).resolves.toMatchObject({ accounts: [{ label: "Main" }] })
  })

  it("returns an expected validation failure without writing or blocking later edits", async () => {
    store.values.set("providerAccountRegistry", structuredClone(registry))
    const invalid = updateSavedProviderAccountRegistry((current) =>
      updateProviderAccountLabel(current, "fp-work", " ")
    )
    const valid = updateSavedProviderAccountRegistry((current) =>
      updateProviderAccountVisibility(current, "fp-work", "hidden")
    )

    await expect(invalid).resolves.toMatchObject({ ok: false, code: "account-label-required" })
    await expect(valid).resolves.toMatchObject({ ok: true, value: { accounts: [{ visibility: "hidden" }] } })
    expect(store.save).toHaveBeenCalledTimes(1)
  })

  it("restores the previous raw key after save failure before the next queued edit", async () => {
    const previous = { ...registry, legacyField: "preserve on rollback" }
    store.values.set("providerAccountRegistry", structuredClone(previous))
    const error = new Error("disk full")
    store.save.mockRejectedValueOnce(error)
    const failed = updateSavedProviderAccountRegistry((current) =>
      updateProviderAccountLabel(current, "fp-work", "Failed label")
    )
    await expect(failed).rejects.toBe(error)
    expect(store.values.get("providerAccountRegistry")).toEqual(previous)

    await updateSavedProviderAccountRegistry((current) =>
      updateProviderAccountVisibility(current, "fp-work", "hidden")
    )
    await expect(loadProviderAccountRegistry()).resolves.toMatchObject({
      accounts: [{ label: "Work", visibility: "hidden" }],
    })
  })

  it("removes an unsaved first salt so the next request creates a persisted salt", async () => {
    const error = new Error("disk full")
    store.save.mockRejectedValueOnce(error)
    await expect(getOrCreateProviderAccountLocalSalt()).rejects.toBe(error)
    expect(store.values.has("providerAccountLocalSalt")).toBe(false)
    expect(store.delete).toHaveBeenCalledWith("providerAccountLocalSalt")

    const salt = await getOrCreateProviderAccountLocalSalt()
    expect(store.values.get("providerAccountLocalSalt")).toBe(salt)
    expect(store.set).toHaveBeenCalledTimes(2)
    expect(store.save).toHaveBeenCalledTimes(3)
  })

  it("reports both persistence and rollback failures", async () => {
    const saveError = new Error("disk full")
    const rollbackError = new Error("store disconnected")
    store.save.mockRejectedValueOnce(saveError).mockRejectedValueOnce(rollbackError)

    await expect(updateSavedProviderAccountRegistry(() => ({ ok: true, value: registry })))
      .rejects.toMatchObject({
        name: "Error", errors: [saveError, rollbackError],
        message: "Provider Account save failed and the previous local state could not be restored.",
      })
    expect(store.values.has("providerAccountRegistry")).toBe(false)
    expect(store.save).toHaveBeenCalledTimes(2)
    await expect(loadProviderAccountRegistry()).resolves.toEqual({ accounts: [] })
  })
})
