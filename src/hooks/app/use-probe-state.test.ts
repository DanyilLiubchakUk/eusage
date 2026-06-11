import { renderHook, act, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useProbeState } from "@/hooks/app/use-probe-state"

const registryStore = vi.hoisted(() => ({
  getOrCreateProviderAccountLocalSalt: vi.fn(),
  syncSavedProviderAccountRegistry: vi.fn(),
}))

vi.mock("@/lib/provider-account-registry-store", () => registryStore)

describe("useProbeState", () => {
  beforeEach(() => {
    registryStore.getOrCreateProviderAccountLocalSalt.mockResolvedValue("local-salt-1")
    registryStore.syncSavedProviderAccountRegistry.mockResolvedValue({
      ok: true,
      value: { accounts: [] },
    })
  })

  it("updates pluginStatesRef synchronously when marking plugins loading", () => {
    const { result } = renderHook(() => useProbeState({}))

    let loadingImmediatelyAfterSet: boolean | undefined
    act(() => {
      result.current.setLoadingForPlugins(["codex"])
      loadingImmediatelyAfterSet =
        result.current.pluginStatesRef.current.codex?.loading
    })

    expect(loadingImmediatelyAfterSet).toBe(true)
    expect(result.current.pluginStates.codex?.loading).toBe(true)
  })

  it("syncs successful provider account detections into the saved registry", async () => {
    const onProviderAccountRegistryChange = vi.fn()
    const { result } = renderHook(() =>
      useProbeState({ onProviderAccountRegistryChange })
    )

    act(() => {
      result.current.handleProbeResult({
        providerId: "claude",
        displayName: "Claude",
        iconUrl: "claude.svg",
        lines: [{ type: "text", label: "Usage", value: "10" }],
        providerAccountDetections: [
          {
            providerId: "claude",
            providerName: "Claude",
            identityKind: "providerEmail",
            identityValue: "work@example.com",
            identityConfidence: "high",
            label: "Work",
          },
        ],
      })
    })

    await waitFor(() => {
      expect(registryStore.syncSavedProviderAccountRegistry).toHaveBeenCalled()
    })
    expect(registryStore.getOrCreateProviderAccountLocalSalt).toHaveBeenCalledTimes(1)
    expect(registryStore.syncSavedProviderAccountRegistry).toHaveBeenCalledWith({
      detectedAccounts: [
        {
          providerId: "claude",
          providerName: "Claude",
          identityKind: "providerEmail",
          identityValue: "work@example.com",
          identityConfidence: "high",
          label: "Work",
          localSalt: "local-salt-1",
        },
      ],
      scannedProviderIds: ["claude"],
      detectedAt: expect.any(String),
    })
    expect(onProviderAccountRegistryChange).toHaveBeenCalledTimes(1)
  })

  it("marks a successful scanned provider even when no accounts are detected", async () => {
    const { result } = renderHook(() => useProbeState({}))

    act(() => {
      result.current.handleProbeResult({
        providerId: "claude",
        displayName: "Claude",
        iconUrl: "claude.svg",
        lines: [{ type: "text", label: "Usage", value: "10" }],
      })
    })

    await waitFor(() => {
      expect(registryStore.syncSavedProviderAccountRegistry).toHaveBeenCalled()
    })
    expect(registryStore.getOrCreateProviderAccountLocalSalt).not.toHaveBeenCalled()
    expect(registryStore.syncSavedProviderAccountRegistry).toHaveBeenCalledWith({
      detectedAccounts: [],
      scannedProviderIds: ["claude"],
      detectedAt: expect.any(String),
    })
  })

  it("does not mark accounts missing after failed probes", async () => {
    const { result } = renderHook(() => useProbeState({}))

    act(() => {
      result.current.handleProbeResult({
        providerId: "claude",
        displayName: "Claude",
        iconUrl: "claude.svg",
        lines: [{ type: "badge", label: "Error", text: "Signed out" }],
        providerAccountDetections: [
          {
            providerId: "claude",
            providerName: "Claude",
            identityKind: "providerEmail",
            identityValue: "work@example.com",
            identityConfidence: "high",
          },
        ],
      })
    })

    await Promise.resolve()
    expect(registryStore.getOrCreateProviderAccountLocalSalt).not.toHaveBeenCalled()
    expect(registryStore.syncSavedProviderAccountRegistry).not.toHaveBeenCalled()
  })
})
