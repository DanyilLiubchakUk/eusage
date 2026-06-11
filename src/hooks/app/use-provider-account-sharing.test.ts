import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useProviderAccountSharing } from "@/hooks/app/use-provider-account-sharing"
import type { LocalProviderAccount } from "@/lib/provider-account-registry"
import type { ProviderAccountSettingsGroup } from "@/lib/provider-account-settings"

const store = vi.hoisted(() => ({
  loadProviderAccountSharingSettings: vi.fn(),
  saveProviderAccountSharingSettings: vi.fn(),
  clearProviderAccountSharingSettings: vi.fn(),
}))
const teamSync = vi.hoisted(() => ({
  syncSharedProviderAccount: vi.fn(),
}))

vi.mock("@/lib/provider-account-sharing-store", () => ({
  loadProviderAccountSharingSettings: store.loadProviderAccountSharingSettings,
  saveProviderAccountSharingSettings: store.saveProviderAccountSharingSettings,
  clearProviderAccountSharingSettings: store.clearProviderAccountSharingSettings,
}))
vi.mock("@/lib/provider-account-team-sync", () => ({
  syncSharedProviderAccount: teamSync.syncSharedProviderAccount,
}))

describe("useProviderAccountSharing", () => {
  beforeEach(() => {
    store.loadProviderAccountSharingSettings.mockReset()
    store.saveProviderAccountSharingSettings.mockReset()
    store.clearProviderAccountSharingSettings.mockReset()
    teamSync.syncSharedProviderAccount.mockReset()
    store.loadProviderAccountSharingSettings.mockResolvedValue({
      sharedLocalAccountFingerprints: [],
    })
    store.saveProviderAccountSharingSettings.mockResolvedValue(undefined)
    store.clearProviderAccountSharingSettings.mockResolvedValue(undefined)
    teamSync.syncSharedProviderAccount.mockResolvedValue({
      ok: true,
      status: "synced",
      currentDataQueued: true,
      metadataUpdated: true,
    })
  })

  it("loads, updates, prunes, and resets local sharing settings", async () => {
    store.loadProviderAccountSharingSettings.mockResolvedValue({
      sharedLocalAccountFingerprints: ["fp-work", "fp-hidden", "fp-old"],
    })

    const { result, rerender } = renderHook(
      ({ groups }) => useProviderAccountSharing(groups),
      { initialProps: { groups: [providerGroup()] } }
    )

    await waitFor(() => {
      expect(result.current.providerAccountSharingSettings).toEqual({
        sharedLocalAccountFingerprints: ["fp-work"],
      })
    })
    expect(store.saveProviderAccountSharingSettings).toHaveBeenCalledWith({
      sharedLocalAccountFingerprints: ["fp-work"],
    })

    act(() => {
      result.current.handleProviderAccountSharingChange("fp-side", true)
    })
    expect(store.saveProviderAccountSharingSettings).not.toHaveBeenLastCalledWith({
      sharedLocalAccountFingerprints: ["fp-work", "fp-side"],
    })

    act(() => {
      result.current.handleProviderAccountSharingChange("fp-work", false)
    })
    await waitFor(() => {
      expect(result.current.providerAccountSharingSettings).toEqual({
        sharedLocalAccountFingerprints: [],
      })
    })

    rerender({ groups: [providerGroup({ visibleAccounts: [] })] })
    await act(async () => {
      await result.current.resetProviderAccountSharing()
    })

    expect(store.clearProviderAccountSharingSettings).toHaveBeenCalledTimes(1)
    expect(result.current.providerAccountSharingSettings).toEqual({
      sharedLocalAccountFingerprints: [],
    })
  })

  it("syncs Team current data and metadata after saving a share-on toggle", async () => {
    const syncOrder: string[] = []
    store.saveProviderAccountSharingSettings.mockImplementation(async () => {
      syncOrder.push("save")
    })
    teamSync.syncSharedProviderAccount.mockImplementation(async () => {
      syncOrder.push("sync")
      return {
        ok: true,
        status: "synced",
        currentDataQueued: true,
        metadataUpdated: true,
      }
    })
    const { result } = renderHook(
      ({ groups }) => useProviderAccountSharing(groups),
      { initialProps: { groups: [providerGroup()] } }
    )

    await waitFor(() => {
      expect(result.current.providerAccountSharingSettings).toEqual({
        sharedLocalAccountFingerprints: [],
      })
    })

    act(() => {
      result.current.handleProviderAccountSharingChange("fp-work", true)
    })

    await waitFor(() => {
      expect(store.saveProviderAccountSharingSettings).toHaveBeenCalledWith({
        sharedLocalAccountFingerprints: ["fp-work"],
      })
    })
    await waitFor(() => {
      expect(teamSync.syncSharedProviderAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: "codex",
          localAccountFingerprint: "fp-work",
          label: "Work Codex",
        })
      )
    })
    expect(syncOrder).toEqual(["save", "sync"])
    expect(result.current.providerAccountSharingSyncNotice).toBeNull()
  })

  it("keeps local sharing saved and shows retry clarity when immediate Team sync fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    teamSync.syncSharedProviderAccount.mockResolvedValueOnce({
      ok: false,
      status: "failed",
      currentDataQueued: true,
      metadataUpdated: false,
      message: "offline",
    })
    const { result } = renderHook(
      ({ groups }) => useProviderAccountSharing(groups),
      { initialProps: { groups: [providerGroup()] } }
    )

    await waitFor(() => {
      expect(result.current.providerAccountSharingSettings).toEqual({
        sharedLocalAccountFingerprints: [],
      })
    })

    act(() => {
      result.current.handleProviderAccountSharingChange("fp-work", true)
    })

    await waitFor(() => {
      expect(result.current.providerAccountSharingSettings).toEqual({
        sharedLocalAccountFingerprints: ["fp-work"],
      })
    })
    await waitFor(() => {
      expect(result.current.providerAccountSharingSyncNotice).toEqual({
        tone: "error",
        message:
          "Sharing saved locally. Team still sees old or missing account data. offline",
      })
    })
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to sync shared Provider Account with team:",
      "offline"
    )
    errorSpy.mockRestore()
  })

  it("shows waiting notice when Team needs a fresh provider scan", async () => {
    teamSync.syncSharedProviderAccount.mockResolvedValueOnce({
      ok: true,
      status: "waitingForProviderScan",
      currentDataQueued: false,
      metadataUpdated: false,
      message: "Sharing saved. Team updates after the next successful provider scan.",
    })
    const { result } = renderHook(
      ({ groups }) => useProviderAccountSharing(groups),
      { initialProps: { groups: [providerGroup()] } }
    )

    await waitFor(() => {
      expect(result.current.providerAccountSharingSettings).toEqual({
        sharedLocalAccountFingerprints: [],
      })
    })

    act(() => {
      result.current.handleProviderAccountSharingChange("fp-work", true)
    })

    await waitFor(() => {
      expect(result.current.providerAccountSharingSyncNotice).toEqual({
        tone: "info",
        message: "Sharing saved. Team updates after the next successful provider scan.",
      })
    })
  })

  it("retries current shared Provider Account sync", async () => {
    store.loadProviderAccountSharingSettings.mockResolvedValue({
      sharedLocalAccountFingerprints: ["fp-work"],
    })
    const { result } = renderHook(
      ({ groups }) => useProviderAccountSharing(groups),
      { initialProps: { groups: [providerGroup()] } }
    )

    await waitFor(() => {
      expect(result.current.providerAccountSharingSettings).toEqual({
        sharedLocalAccountFingerprints: ["fp-work"],
      })
    })

    act(() => {
      result.current.retryProviderAccountSharingSync()
    })

    await waitFor(() => {
      expect(teamSync.syncSharedProviderAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: "codex",
          localAccountFingerprint: "fp-work",
        })
      )
    })
  })
})

function providerGroup(
  overrides: Partial<ProviderAccountSettingsGroup> = {}
): ProviderAccountSettingsGroup {
  return {
    providerId: "codex",
    providerName: "Codex",
    providerIconUrl: "/codex.svg",
    visibleAccounts: [providerAccount()],
    hiddenAccounts: [
      providerAccount({
        localAccountFingerprint: "fp-hidden",
        label: "Hidden Codex",
        visibility: "hidden",
      }),
    ],
    notDetectedAccounts: [
      providerAccount({
        localAccountFingerprint: "fp-old",
        label: "Old Codex",
        detectionState: "notDetected",
      }),
    ],
    ...overrides,
  }
}

function providerAccount(
  overrides: Partial<LocalProviderAccount> = {}
): LocalProviderAccount {
  return {
    providerId: "codex",
    localAccountFingerprint: "fp-work",
    label: "Work Codex",
    visibility: "visible",
    identityConfidence: "high",
    confirmationState: "unconfirmed",
    firstSeenAt: "2026-06-01T00:00:00.000Z",
    lastSeenAt: "2026-06-02T00:00:00.000Z",
    detectionState: "detected",
    ...overrides,
  }
}
