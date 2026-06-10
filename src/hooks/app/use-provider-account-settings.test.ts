import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useProviderAccountSettings } from "@/hooks/app/use-provider-account-settings"
import type { ProviderAccountRegistry } from "@/lib/provider-account-registry"

const store = vi.hoisted(() => ({
  loadProviderAccountRegistry: vi.fn(),
  saveProviderAccountRegistry: vi.fn(),
}))

vi.mock("@/lib/provider-account-registry-store", () => store)

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
    store.loadProviderAccountRegistry.mockResolvedValue(registry)
    store.saveProviderAccountRegistry.mockResolvedValue(undefined)
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
})
