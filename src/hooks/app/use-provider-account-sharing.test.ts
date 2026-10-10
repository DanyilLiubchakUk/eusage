import { act, renderHook, waitFor } from "@testing-library/react"
import { StrictMode } from "react"
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
    store.saveProviderAccountSharingSettings.mockResolvedValue(true)
    store.clearProviderAccountSharingSettings.mockResolvedValue(true)
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

  it("does not restore hidden sharing when toggling during a pending prune", async () => {
    store.loadProviderAccountSharingSettings.mockResolvedValue({ sharedLocalAccountFingerprints: ["fp-hidden"] })
    let finish!: (saved: boolean) => void
    store.saveProviderAccountSharingSettings.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const groups = [providerGroup()]
    const { result } = renderHook(() => useProviderAccountSharing(groups))
    await waitFor(() => expect(store.saveProviderAccountSharingSettings).toHaveBeenCalledTimes(1))
    act(() => { result.current.handleProviderAccountSharingChange("fp-work", true) })
    expect(store.saveProviderAccountSharingSettings).toHaveBeenLastCalledWith({ sharedLocalAccountFingerprints: ["fp-work"] })
    await act(async () => { finish(true) })
    expect(result.current.providerAccountSharingSettings.sharedLocalAccountFingerprints).toEqual(["fp-work"])
  })

  it("syncs Team current data and metadata once per share-on toggle in StrictMode", async () => {
    const syncOrder: string[] = []
    store.saveProviderAccountSharingSettings.mockImplementation(async () => {
      syncOrder.push("save")
      return true
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
      { initialProps: { groups: [providerGroup()] }, wrapper: StrictMode }
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

  it.each(["toggle", "reset"])("ignores a stale settings reload after a newer %s", async (change) => {
    store.loadProviderAccountSharingSettings.mockResolvedValue({
      sharedLocalAccountFingerprints: ["fp-work"],
    })
    const groups = [providerGroup()]
    const { result } = renderHook(() => useProviderAccountSharing(groups))
    await waitFor(() => expect(result.current.providerAccountSharingSettings.sharedLocalAccountFingerprints).toEqual(["fp-work"]))
    let finishRead!: (value: { sharedLocalAccountFingerprints: string[] }) => void
    store.loadProviderAccountSharingSettings.mockImplementationOnce(() => new Promise((resolve) => { finishRead = resolve }))
    const reload = result.current.reloadProviderAccountSharingSettings()

    await act(async () => {
      if (change === "toggle") result.current.handleProviderAccountSharingChange("fp-work", false)
      else await result.current.resetProviderAccountSharing()
      finishRead({ sharedLocalAccountFingerprints: ["fp-work", "fp-old"] })
      await reload
    })

    expect(result.current.providerAccountSharingSettings.sharedLocalAccountFingerprints).toEqual([])
    expect(store.saveProviderAccountSharingSettings).not.toHaveBeenCalledWith({ sharedLocalAccountFingerprints: ["fp-work"] })
    expect(teamSync.syncSharedProviderAccount).not.toHaveBeenCalled()
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

  it("keeps the current sharing visible and reports a failed reset", async () => {
    const previous = { connectionId: "connection-a", sharedLocalAccountFingerprints: ["fp-work"] }
    store.loadProviderAccountSharingSettings.mockResolvedValue(previous)
    store.clearProviderAccountSharingSettings.mockRejectedValueOnce(new Error("synthetic save failure"))
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const { result } = renderHook(() => useProviderAccountSharing([providerGroup()]))
    await waitFor(() => expect(result.current.providerAccountSharingSettings).toEqual(previous))
    await act(async () => { await result.current.resetProviderAccountSharing() })
    expect(result.current.providerAccountSharingSettings).toEqual(previous)
    expect(result.current.providerAccountSharingSyncNotice?.message).toContain("could not be cleared")
    expect(log).toHaveBeenCalled()
  })

  it("does not upload a sharing choice rejected for a stale connection", async () => {
    store.saveProviderAccountSharingSettings.mockResolvedValueOnce(false)
    const { result } = renderHook(() => useProviderAccountSharing([providerGroup()]))
    await waitFor(() => expect(store.loadProviderAccountSharingSettings).toHaveBeenCalled())
    act(() => { result.current.handleProviderAccountSharingChange("fp-work", true) })
    await waitFor(() => expect(result.current.providerAccountSharingSyncNotice?.message).toContain("Team connection changed"))
    await waitFor(() => expect(result.current.providerAccountSharingSettings.sharedLocalAccountFingerprints).toEqual([]))
    expect(teamSync.syncSharedProviderAccount).not.toHaveBeenCalled()
  })

  it("restores persisted sharing when an unshare fails", async () => {
    const previous = { connectionId: "connection-a", sharedLocalAccountFingerprints: ["fp-work"] }
    store.loadProviderAccountSharingSettings.mockResolvedValue(previous)
    store.saveProviderAccountSharingSettings.mockRejectedValueOnce(new Error("synthetic save failure"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    const groups = [providerGroup()]
    const { result } = renderHook(() => useProviderAccountSharing(groups))
    await waitFor(() => expect(result.current.providerAccountSharingSettings).toEqual(previous))
    act(() => { result.current.handleProviderAccountSharingChange("fp-work", false) })
    await waitFor(() => expect(result.current.providerAccountSharingSyncNotice?.message).toContain("could not be saved"))
    expect(result.current.providerAccountSharingSettings).toEqual(previous)
  })

  it("ignores a stale reset rejection after a newer toggle", async () => {
    let finish!: (saved: boolean) => void
    store.clearProviderAccountSharingSettings.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const groups = [providerGroup()]
    const { result } = renderHook(() => useProviderAccountSharing(groups))
    await waitFor(() => expect(store.loadProviderAccountSharingSettings).toHaveBeenCalled())
    let reset!: Promise<void>
    act(() => { reset = result.current.resetProviderAccountSharing() })
    act(() => { result.current.handleProviderAccountSharingChange("fp-work", true) })
    await act(async () => { finish(false); await reset })
    expect(result.current.providerAccountSharingSettings.sharedLocalAccountFingerprints).toEqual(["fp-work"])
    expect(store.loadProviderAccountSharingSettings).toHaveBeenCalledTimes(1)
  })

  it("ignores an old connection's late sync failure after the new connection shares the same account", async () => {
    store.loadProviderAccountSharingSettings.mockResolvedValue({ connectionId: "connection-a", sharedLocalAccountFingerprints: ["fp-work"] })
    let finish!: (value: unknown) => void
    teamSync.syncSharedProviderAccount.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const { result } = renderHook(() => useProviderAccountSharing([providerGroup()]))
    await waitFor(() => expect(result.current.providerAccountSharingSettings.connectionId).toBe("connection-a"))
    await act(async () => { await result.current.retryProviderAccountSharingSync() })
    store.loadProviderAccountSharingSettings.mockResolvedValue({ connectionId: "connection-b", sharedLocalAccountFingerprints: ["fp-work"] })
    await act(async () => { await result.current.reloadProviderAccountSharingSettings() })
    await act(async () => { finish({ ok: false, message: "old connection failure" }) })
    expect(result.current.providerAccountSharingSyncNotice).toBeNull()
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

  it("retries loading persisted sharing before syncing and retains repeated load failures", async () => {
    const saved = { connectionId: "connection-a", sharedLocalAccountFingerprints: ["fp-work"] }
    store.loadProviderAccountSharingSettings
      .mockRejectedValueOnce(new Error("initial read failed"))
      .mockRejectedValueOnce(new Error("retry read failed"))
      .mockResolvedValue(saved)
    vi.spyOn(console, "error").mockImplementation(() => {})
    const groups = [providerGroup()]
    const { result } = renderHook(() => useProviderAccountSharing(groups))
    await waitFor(() => expect(result.current.providerAccountSharingSyncNotice?.message).toContain("could not be loaded"))
    expect(teamSync.syncSharedProviderAccount).not.toHaveBeenCalled()

    await act(async () => { await result.current.retryProviderAccountSharingSync() })
    expect(store.loadProviderAccountSharingSettings).toHaveBeenCalledTimes(2)
    expect(result.current.providerAccountSharingSyncNotice?.message).toContain("could not be loaded")
    expect(teamSync.syncSharedProviderAccount).not.toHaveBeenCalled()

    await act(async () => { await result.current.retryProviderAccountSharingSync() })
    expect(store.loadProviderAccountSharingSettings).toHaveBeenCalledTimes(3)
    expect(result.current.providerAccountSharingSettings).toEqual(saved)
    expect(result.current.providerAccountSharingSyncNotice).toBeNull()
    expect(teamSync.syncSharedProviderAccount).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ localAccountFingerprint: "fp-work" })
    )
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
