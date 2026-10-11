import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  clearProviderAccountSharingSettings,
  loadProviderAccountSharingSettings,
  saveProviderAccountSharingSettings,
} from "@/lib/provider-account-sharing-store"

const storeState = new Map<string, unknown>()
const invoke = vi.hoisted(() => vi.fn())
vi.mock("@tauri-apps/api/core", () => ({ invoke }))

const readTeamSettings = vi.hoisted(() => vi.fn())
vi.mock("@/lib/team-settings", () => ({ readTeamSettings }))

describe("provider account sharing store", () => {
  beforeEach(() => {
    storeState.clear()
    readTeamSettings.mockImplementation(async () => Object.fromEntries(storeState))
    invoke.mockResolvedValue(true)
  })

  it("loads default sharing settings when missing", async () => {
    saveTeamConnection("team-a")
    await expect(loadProviderAccountSharingSettings()).resolves.toEqual({
      sharedLocalAccountFingerprints: [], connectionId: null,
    })
  })

  it("normalizes stored sharing settings", async () => {
    saveTeamConnection("team-a")
    storeState.set("providerAccountSharing", {
      teamFingerprint: "team-a",
      sharedLocalAccountFingerprints: [" fp-work ", "fp-work", "fp-side"],
    })

    await expect(loadProviderAccountSharingSettings()).resolves.toEqual({
      sharedLocalAccountFingerprints: ["fp-work", "fp-side"], connectionId: null,
    })
  })

  it("starts private when stored sharing belongs to another team", async () => {
    saveTeamConnection("team-b")
    storeState.set("providerAccountSharing", {
      teamFingerprint: "team-a",
      sharedLocalAccountFingerprints: ["fp-work"],
    })

    await expect(loadProviderAccountSharingSettings()).resolves.toEqual({
      sharedLocalAccountFingerprints: [], connectionId: null,
    })
  })

  it.each([undefined, "old-connection"])("rejects sharing retained from an earlier connection to the same Team (%s)", async (connectionId) => {
    storeState.set("teamConnection", { teamFingerprint: "team-a", connectionId: "new-connection" })
    storeState.set("providerAccountSharing", {
      teamFingerprint: "team-a", connectionId, sharedLocalAccountFingerprints: ["fp-work"],
    })
    await expect(loadProviderAccountSharingSettings()).resolves.toEqual({
      sharedLocalAccountFingerprints: [], connectionId: "new-connection",
    })
  })

  it("saves and clears through the owner with the expected identity", async () => {
    storeState.set("teamConnection", { connectionId: "connection-a" })
    const settings = { connectionId: "connection-a", sharedLocalAccountFingerprints: ["fp-work"] }
    await saveProviderAccountSharingSettings(settings)
    await clearProviderAccountSharingSettings(settings)
    expect(invoke).toHaveBeenNthCalledWith(1, "save_provider_account_sharing", {
      settings: { connectionId: "connection-a", sharedLocalAccountFingerprints: ["fp-work"] }, expectedConnectionId: "connection-a",
    })
    expect(invoke).toHaveBeenNthCalledWith(2, "save_provider_account_sharing", {
      settings: null, expectedConnectionId: "connection-a",
    })
  })

  it("returns the native rejection after the Team connection changes", async () => {
    invoke.mockResolvedValueOnce(false)
    await expect(saveProviderAccountSharingSettings({ sharedLocalAccountFingerprints: ["fp-work"] })).resolves.toBe(false)
  })

  it("finishes a pending save before reset, retaining each invocation's identity", async () => {
    storeState.set("teamConnection", { connectionId: "connection-a" })
    let finish!: (value: boolean) => void
    invoke.mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve }))
    const settings = { connectionId: "connection-a", sharedLocalAccountFingerprints: ["fp-work"] }
    const save = saveProviderAccountSharingSettings(settings)
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(1))
    const reset = clearProviderAccountSharingSettings(settings)
    storeState.set("teamConnection", { connectionId: "connection-b" })
    await Promise.resolve()
    expect(invoke).toHaveBeenCalledTimes(1)
    finish(true)
    await Promise.all([save, reset])
    expect(invoke).toHaveBeenLastCalledWith("save_provider_account_sharing", {
      settings: null, expectedConnectionId: "connection-a",
    })
  })

  it("never stamps old displayed consent with a newer connection identity", async () => {
    storeState.set("teamConnection", { connectionId: "connection-b", teamFingerprint: "team-b" })
    const previous = { connectionId: "connection-a", sharedLocalAccountFingerprints: ["fp-work"] }
    await saveProviderAccountSharingSettings(previous)
    expect(invoke).toHaveBeenCalledWith("save_provider_account_sharing", {
      settings: previous, expectedConnectionId: "connection-a",
    })
    expect(readTeamSettings).not.toHaveBeenCalled()
  })

  it("continues with reset after a failed save", async () => {
    invoke.mockRejectedValueOnce(new Error("synthetic disk failure"))
    await expect(saveProviderAccountSharingSettings({ sharedLocalAccountFingerprints: ["fp-work"] })).rejects.toThrow("synthetic disk failure")
    await expect(clearProviderAccountSharingSettings({ sharedLocalAccountFingerprints: [] })).resolves.toBe(true)
    expect(invoke).toHaveBeenCalledTimes(2)
  })

  it("reads after a pending sharing write commits", async () => {
    let finish!: () => void
    invoke.mockImplementationOnce(() => new Promise<boolean>((resolve) => {
      finish = () => {
        storeState.set("providerAccountSharing", { teamFingerprint: "team-a", sharedLocalAccountFingerprints: [] })
        resolve(true)
      }
    }))
    saveTeamConnection("team-a")
    storeState.set("providerAccountSharing", { teamFingerprint: "team-a", sharedLocalAccountFingerprints: ["fp-work"] })
    const save = saveProviderAccountSharingSettings({ sharedLocalAccountFingerprints: [] })
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(1))
    const load = loadProviderAccountSharingSettings()
    await Promise.resolve()
    expect(readTeamSettings).not.toHaveBeenCalled()
    finish()
    await save
    await expect(load).resolves.toMatchObject({ sharedLocalAccountFingerprints: [] })
  })
})

function saveTeamConnection(teamFingerprint: string) {
  storeState.set("teamConnection", { teamFingerprint })
}
