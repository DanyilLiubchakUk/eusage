import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useProviderAccountSettings } from "@/hooks/app/use-provider-account-settings"
import type { ProviderAccountRegistry } from "@/lib/provider-account-registry"

const store = vi.hoisted(() => ({
  loadProviderAccountRegistry: vi.fn(),
  saveProviderAccountRegistry: vi.fn(),
  loadProviderAccountSharingSettings: vi.fn(),
  invoke: vi.fn(),
}))

vi.mock("@/lib/provider-account-registry-store", () => ({
  loadProviderAccountRegistry: store.loadProviderAccountRegistry,
  saveProviderAccountRegistry: store.saveProviderAccountRegistry,
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
    store.loadProviderAccountRegistry.mockReset()
    store.saveProviderAccountRegistry.mockReset()
    store.loadProviderAccountSharingSettings.mockReset()
    store.invoke.mockReset()
    store.loadProviderAccountRegistry.mockResolvedValue(registry)
    store.saveProviderAccountRegistry.mockResolvedValue(undefined)
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

    act(() => {
      result.current.handleProviderAccountRename("fp-work", "Main Claude")
    })
    expect(store.saveProviderAccountRegistry).toHaveBeenLastCalledWith({
      accounts: [
        expect.objectContaining({ label: "Main Claude" }),
        expect.objectContaining({ label: "Old Claude" }),
      ],
    })

    act(() => {
      result.current.handleProviderAccountVisibilityChange("fp-work", false)
    })
    expect(store.saveProviderAccountRegistry).toHaveBeenLastCalledWith({
      accounts: [
        expect.objectContaining({ label: "Main Claude", visibility: "hidden" }),
        expect.objectContaining({ label: "Old Claude" }),
      ],
    })

    act(() => {
      result.current.handleProviderAccountForget("fp-old")
    })
    expect(store.saveProviderAccountRegistry).toHaveBeenLastCalledWith({
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

    act(() => {
      result.current.handleProviderAccountRename("fp-work", "Main Claude")
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

    act(() => {
      result.current.handleProviderAccountRename("fp-work", "Main Claude")
    })

    await waitFor(() => {
      expect(result.current.providerAccountLabelSyncError).toBe("offline")
    })
    expect(store.saveProviderAccountRegistry).toHaveBeenLastCalledWith({
      accounts: [
        expect.objectContaining({ localAccountFingerprint: "fp-work", label: "Main Claude" }),
        expect.objectContaining({ localAccountFingerprint: "fp-old" }),
      ],
    })
  })
})
