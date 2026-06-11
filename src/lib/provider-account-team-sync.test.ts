import { invoke } from "@tauri-apps/api/core"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  syncSharedProviderAccount,
  updateSharedProviderAccountLabel,
  uploadSharedProviderAccountCurrentData,
} from "@/lib/provider-account-team-sync"
import type { LocalProviderAccount } from "@/lib/provider-account-registry"

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))

const invokeMock = vi.mocked(invoke)

describe("provider account team sync", () => {
  beforeEach(() => {
    invokeMock.mockReset()
    invokeMock.mockResolvedValue(undefined)
  })

  it("updates shared Provider Account metadata through Tauri", async () => {
    await updateSharedProviderAccountLabel(providerAccount())

    expect(invokeMock).toHaveBeenCalledWith("update_shared_provider_account_label", {
      providerId: "codex",
      localAccountFingerprint: "fp-work",
      label: "Work Codex",
    })
  })

  it("queues current shared Provider Account data through Tauri", async () => {
    invokeMock.mockResolvedValueOnce({ currentDataQueued: true })

    await uploadSharedProviderAccountCurrentData(providerAccount())

    expect(invokeMock).toHaveBeenCalledWith(
      "upload_shared_provider_account_current_data",
      {
        providerId: "codex",
        localAccountFingerprint: "fp-work",
        label: "Work Codex",
      }
    )
  })

  it("queues current data before metadata on share sync", async () => {
    invokeMock.mockResolvedValueOnce({ currentDataQueued: true })

    const result = await syncSharedProviderAccount(providerAccount())

    expect(invokeMock.mock.calls.map(([command]) => command)).toEqual([
      "upload_shared_provider_account_current_data",
      "update_shared_provider_account_label",
    ])
    expect(result).toEqual({
      ok: true,
      status: "synced",
      currentDataQueued: true,
      metadataUpdated: true,
    })
  })

  it("reports waiting when sharing has no fresh provider scan yet", async () => {
    invokeMock
      .mockResolvedValueOnce({ currentDataQueued: false })
      .mockRejectedValueOnce(
        "Shared Provider Account needs a fresh provider scan before updating Team metadata."
      )

    const result = await syncSharedProviderAccount(providerAccount())

    expect(result).toEqual({
      ok: true,
      status: "waitingForProviderScan",
      currentDataQueued: false,
      metadataUpdated: false,
      message: "Sharing saved. Team updates after the next successful provider scan.",
    })
  })

  it("reports failed metadata sync after current data queues", async () => {
    invokeMock
      .mockResolvedValueOnce({ currentDataQueued: true })
      .mockRejectedValueOnce("offline")

    const result = await syncSharedProviderAccount(providerAccount())

    expect(result).toEqual({
      ok: false,
      status: "failed",
      currentDataQueued: true,
      metadataUpdated: false,
      message: "offline",
    })
  })
})

function providerAccount(): LocalProviderAccount {
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
  }
}
