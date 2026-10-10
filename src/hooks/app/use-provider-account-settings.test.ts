import { act, renderHook, waitFor } from "@testing-library/react"
import { createElement, StrictMode, type PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useProviderAccountSettings } from "@/hooks/app/use-provider-account-settings"
import type { ProviderAccountRegistry } from "@/lib/provider-account-registry"
import { syncSavedProviderAccountRegistry } from "@/lib/provider-account-registry-store"

const store = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  get: vi.fn(),
  set: vi.fn(),
  save: vi.fn(),
  loadProviderAccountSharingSettings: vi.fn(),
  invoke: vi.fn(),
}))

vi.mock("@tauri-apps/plugin-store", () => ({
  LazyStore: class {
    async get<T>(key: string): Promise<T | null> {
      return await store.get(key) as T | null
    }
    async set<T>(key: string, value: T): Promise<void> {
      await store.set(key, value)
    }
    async save(): Promise<void> {
      await store.save()
    }
  },
}))
vi.mock("@/lib/provider-account-sharing-store", () => ({
  loadProviderAccountSharingSettings: store.loadProviderAccountSharingSettings,
}))
vi.mock("@tauri-apps/api/core", () => ({
  invoke: store.invoke,
}))

const registry: ProviderAccountRegistry = {
  accounts: [
    {
      providerId: "claude",
      localAccountFingerprint: "fp-work",
      label: "Work Claude",
      visibility: "visible",
      identityConfidence: "high",
      confirmationState: "unconfirmed",
      firstSeenAt: "2026-06-01T00:00:00.000Z",
      lastSeenAt: "2026-06-02T00:00:00.000Z",
      detectionState: "detected",
    },
    {
      providerId: "claude",
      localAccountFingerprint: "fp-old",
      label: "Old Claude",
      visibility: "hidden",
      identityConfidence: "medium",
      confirmationState: "confirmed",
      firstSeenAt: "2026-05-01T00:00:00.000Z",
      lastSeenAt: "2026-05-02T00:00:00.000Z",
      detectionState: "notDetected",
    },
  ],
}

describe("useProviderAccountSettings", () => {
  beforeEach(() => {
    store.values.clear()
    store.values.set("providerAccountRegistry", structuredClone(registry))
    store.get.mockReset()
    store.set.mockReset()
    store.save.mockReset()
    store.loadProviderAccountSharingSettings.mockReset()
    store.invoke.mockReset()
    store.get.mockImplementation(async (key: string) => store.values.get(key))
    store.set.mockImplementation(async (key: string, value: unknown) => {
      store.values.set(key, structuredClone(value))
    })
    store.save.mockResolvedValue(undefined)
    store.loadProviderAccountSharingSettings.mockResolvedValue({
      sharedLocalAccountFingerprints: [],
    })
    store.invoke.mockResolvedValue(undefined)
  })

  it("loads, renames, hides, and forgets local provider accounts", async () => {
    const { result } = renderHook(() => useProviderAccountSettings())

    await waitFor(() => {
      expect(result.current.providerAccountRegistry.accounts).toHaveLength(2)
    })

    await act(async () => {
      await result.current.handleProviderAccountRename("fp-work", "Main Claude")
    })
    expect(store.set).toHaveBeenLastCalledWith("providerAccountRegistry", {
      accounts: [
        expect.objectContaining({ label: "Main Claude" }),
        expect.objectContaining({ label: "Old Claude" }),
      ],
    })

    await act(async () => {
      await result.current.handleProviderAccountVisibilityChange("fp-work", false)
    })
    expect(store.set).toHaveBeenLastCalledWith("providerAccountRegistry", {
      accounts: [
        expect.objectContaining({ label: "Main Claude", visibility: "hidden" }),
        expect.objectContaining({ label: "Old Claude" }),
      ],
    })

    await act(async () => {
      await result.current.handleProviderAccountSharingConfirmation("fp-work")
    })
    expect(store.set).toHaveBeenLastCalledWith("providerAccountRegistry", {
      accounts: [
        expect.objectContaining({
          localAccountFingerprint: "fp-work",
          label: "Main Claude",
          visibility: "hidden",
          confirmationState: "confirmed",
        }),
        expect.objectContaining({ label: "Old Claude" }),
      ],
    })

    await act(async () => {
      await result.current.handleProviderAccountForget("fp-old")
    })
    expect(store.set).toHaveBeenLastCalledWith("providerAccountRegistry", {
      accounts: [expect.objectContaining({ localAccountFingerprint: "fp-work" })],
    })
  })

  it("syncs shared Provider Account label changes with the Team API", async () => {
    store.loadProviderAccountSharingSettings.mockResolvedValue({
      sharedLocalAccountFingerprints: ["fp-work"],
    })
    const { result } = renderHook(() => useProviderAccountSettings())

    await waitFor(() => {
      expect(result.current.providerAccountRegistry.accounts).toHaveLength(2)
    })

    await act(async () => {
      await result.current.handleProviderAccountRename("fp-work", "Main Claude")
    })

    await waitFor(() => {
      expect(store.invoke).toHaveBeenCalledWith(
        "update_shared_provider_account_label",
        {
          providerId: "claude",
          localAccountFingerprint: "fp-work",
          label: "Main Claude",
        }
      )
    })
    expect(result.current.providerAccountLabelSyncError).toBeNull()
  })

  it("keeps local label saved when Team label sync fails", async () => {
    store.loadProviderAccountSharingSettings.mockResolvedValue({
      sharedLocalAccountFingerprints: ["fp-work"],
    })
    store.invoke.mockRejectedValueOnce("offline")
    const { result } = renderHook(() => useProviderAccountSettings())

    await waitFor(() => {
      expect(result.current.providerAccountRegistry.accounts).toHaveLength(2)
    })

    await act(async () => {
      await result.current.handleProviderAccountRename("fp-work", "Main Claude")
    })

    await waitFor(() => {
      expect(result.current.providerAccountLabelSyncError).toBe("offline")
    })
    expect(store.set).toHaveBeenLastCalledWith("providerAccountRegistry", {
      accounts: [
        expect.objectContaining({ localAccountFingerprint: "fp-work", label: "Main Claude" }),
        expect.objectContaining({ localAccountFingerprint: "fp-old" }),
      ],
    })
  })

  it("keeps a concurrent probe and queued UI edits in the saved registry", async () => {
    const { result } = renderHook(() => useProviderAccountSettings())
    await waitFor(() => expect(result.current.providerAccountRegistry.accounts).toHaveLength(2))

    await act(async () => {
      await Promise.all([
        syncSavedProviderAccountRegistry({
          detectedAccounts: [{
            providerId: "codex",
            providerName: "Codex",
            identityKind: "providerAccountId",
            identityValue: "codex-test-account",
            identityConfidence: "high",
            localSalt: "test-salt",
          }],
          scannedProviderIds: ["codex"],
          detectedAt: "2026-06-03T00:00:00.000Z",
        }),
        result.current.handleProviderAccountRename("fp-work", "Main Claude"),
        result.current.handleProviderAccountVisibilityChange("fp-work", false),
        result.current.handleProviderAccountSharingConfirmation("fp-work"),
      ])
    })

    const saved = store.values.get("providerAccountRegistry") as ProviderAccountRegistry
    expect(saved.accounts).toHaveLength(3)
    expect(saved.accounts[0]).toMatchObject({
      label: "Main Claude", visibility: "hidden", confirmationState: "confirmed",
    })
    expect(saved.accounts[2]).toMatchObject({ providerId: "codex", detectionState: "detected" })
    expect(result.current.providerAccountRegistry).toEqual(saved)
  })

  it("persists and syncs a rename once under StrictMode", async () => {
    store.loadProviderAccountSharingSettings.mockResolvedValue({
      sharedLocalAccountFingerprints: ["fp-work"],
    })
    const { result } = renderHook(() => useProviderAccountSettings(), {
      wrapper: ({ children }: PropsWithChildren) => createElement(StrictMode, null, children),
    })
    await waitFor(() => expect(result.current.providerAccountRegistry.accounts).toHaveLength(2))

    await act(async () => {
      await result.current.handleProviderAccountRename("fp-work", "Main Claude")
    })

    expect(store.set).toHaveBeenCalledTimes(1)
    expect(store.save).toHaveBeenCalledTimes(1)
    expect(store.invoke).toHaveBeenCalledTimes(1)
  })

  it("reports a save failure without publishing or syncing the failed edit", async () => {
    const error = new Error("disk full")
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    store.save.mockRejectedValueOnce(error)
    store.loadProviderAccountSharingSettings.mockResolvedValue({
      sharedLocalAccountFingerprints: ["fp-work"],
    })
    const { result } = renderHook(() => useProviderAccountSettings())
    await waitFor(() => expect(result.current.providerAccountRegistry.accounts).toHaveLength(2))

    await act(async () => {
      await result.current.handleProviderAccountRename("fp-work", "Main Claude")
    })

    expect(consoleError).toHaveBeenCalledWith("Failed to save provider account registry:", error)
    expect(result.current.providerAccountRegistry.accounts[0].label).toBe("Work Claude")
    expect(store.values.get("providerAccountRegistry")).toEqual(registry)
    expect(result.current.providerAccountLabelSyncError).toBe("disk full")
    expect(store.invoke).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.handleProviderAccountVisibilityChange("fp-work", false)
    })
    expect(result.current.providerAccountRegistry.accounts[0]).toMatchObject({
      label: "Work Claude", visibility: "hidden",
    })
    expect(result.current.providerAccountLabelSyncError).toBeNull()
  })

  it("shows a registry read failure and clears it after a successful retry", async () => {
    const error = new Error("settings unavailable")
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    store.get.mockRejectedValueOnce(error)
    const { result } = renderHook(() => useProviderAccountSettings())
    await waitFor(() => {
      expect(result.current.providerAccountLabelSyncError).toBe("settings unavailable")
    })
    expect(consoleError).toHaveBeenCalledWith("Failed to load provider account registry:", error)

    await act(async () => { await result.current.reloadProviderAccountRegistry() })
    expect(result.current.providerAccountRegistry).toEqual(registry)
    expect(result.current.providerAccountLabelSyncError).toBeNull()
  })

  it("shows expected edit validation errors without saving or syncing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { result } = renderHook(() => useProviderAccountSettings())
    await waitFor(() => expect(result.current.providerAccountRegistry.accounts).toHaveLength(2))

    await act(async () => { await result.current.handleProviderAccountRename("fp-work", " ") })

    expect(result.current.providerAccountLabelSyncError).toBe("Provider account label is required.")
    expect(store.save).not.toHaveBeenCalled()
    expect(store.invoke).not.toHaveBeenCalled()
    expect(result.current.providerAccountRegistry).toEqual(registry)
  })
})
