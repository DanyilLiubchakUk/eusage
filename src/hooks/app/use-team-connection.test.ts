import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TeamConnectionSettings } from "@/lib/team-settings"

const connection: TeamConnectionSettings = {
  teamUrl: "https://team.example.com",
  teamName: "Acme Team",
  reportingTimeZone: "America/New_York",
  tokenFingerprint: "abcd1234...wxyz7890",
  deviceId: "device-1",
  deviceName: "Alex MacBook",
  detectedDeviceName: "Alex MacBook",
  deviceNameOverride: null,
  endpoints: {
    teamConfig: "/api/v1/team-config",
    deviceCheckIn: "/api/v1/device/check-in",
    usageBatch: "/api/v1/usage/batch",
    deviceDisconnect: "/api/v1/device/disconnect",
  },
  syncStatus: "connected",
  lastContactAt: "2026-06-01T12:00:00.000Z",
  deviceStatus: "connected",
  lastError: null,
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve
  })
  return { promise, resolve }
}

describe("useTeamConnection", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("keeps the loaded team connection visible across page remounts", async () => {
    const firstLoad = deferred<{
      status: "connected"
      connection: TeamConnectionSettings
      message: string
    }>()
    const secondLoad = deferred<{
      status: "connected"
      connection: TeamConnectionSettings
      message: string
    }>()
    const loadTeamConnection = vi
      .fn()
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise)

    vi.doMock("@/lib/team-connection-actions", () => ({
      loadTeamConnection,
      connectTeam: vi.fn(),
      disconnectTeam: vi.fn(),
      refreshTeamCheckIn: vi.fn(),
      updateTeamDeviceNameOverride: vi.fn(),
    }))

    const { useTeamConnection } = await import("@/hooks/app/use-team-connection")
    const first = renderHook(() => useTeamConnection())

    expect(first.result.current.state.status).toBe("loading")

    await act(async () => {
      firstLoad.resolve({
        status: "connected",
        connection,
        message: "Device checked in.",
      })
    })

    await waitFor(() => {
      expect(first.result.current.state).toMatchObject({
        status: "connected",
        connection,
        message: "Device checked in.",
      })
    })

    first.unmount()

    const second = renderHook(() => useTeamConnection())

    expect(second.result.current.state).toMatchObject({
      status: "connected",
      connection,
      message: "Device checked in.",
    })
    expect(loadTeamConnection).toHaveBeenCalledTimes(2)

    await act(async () => {
      secondLoad.resolve({
        status: "connected",
        connection,
        message: "Fresh check-in.",
      })
    })

    await waitFor(() => {
      expect(second.result.current.state.message).toBe("Fresh check-in.")
    })
  })
})
