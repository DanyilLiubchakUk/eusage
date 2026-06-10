import { describe, expect, it, vi } from "vitest"
import {
  connectTeam,
  disconnectTeam,
  loadTeamConnection,
  refreshTeamCheckIn,
  updateTeamDeviceNameOverride,
} from "@/lib/team-connection-actions"
import type { TeamConnectionSettings } from "@/lib/team-settings"

const endpoints = {
  teamConfig: "/api/v1/team-config",
  deviceCheckIn: "/api/v1/device/check-in",
  usageBatch: "/api/v1/usage/batch",
  deviceDisconnect: "/api/v1/device/disconnect",
}

function createDeps(seed?: {
  connection?: TeamConnectionSettings | null
  token?: string | null
}) {
  let connection = seed?.connection ?? null
  let token = seed?.token ?? null

  const deps = {
    fetchTeamConfig: vi.fn(async () => ({
      ok: true as const,
      value: {
        teamName: "Acme Team",
        reportingTimeZone: "America/New_York",
        appVersion: "0.6.24",
        apiVersion: "v1",
        endpoints,
      },
    })),
    checkInTeamDevice: vi.fn(async (input: { deviceName: string }) => ({
      ok: true as const,
      value: {
        device: {
          deviceName: input.deviceName,
          status: "connected" as const,
          lastSeenAt: 1780340000000,
          updatedAt: 1780340000000,
        },
        team: {
          reportingTimeZone: "America/New_York",
        },
      },
    })),
    disconnectTeamDevice: vi.fn(async () => ({
      ok: true as const,
      value: {
        device: {
          deviceName: "Alex MacBook",
          status: "disconnected" as const,
          lastSeenAt: 1780340000000,
          updatedAt: 1780340000001,
        },
        team: {
          reportingTimeZone: "America/New_York",
        },
      },
    })),
    fingerprintDeveloperToken: vi.fn(async () => "abcd1234...wxyz7890"),
    saveTeamToken: vi.fn(async (value: string) => {
      token = value
    }),
    readTeamToken: vi.fn(async () => token),
    deleteTeamToken: vi.fn(async () => {
      token = null
    }),
    loadTeamConnectionSettings: vi.fn(async () => connection),
    saveTeamConnectionSettings: vi.fn(async (value: TeamConnectionSettings) => {
      connection = value
    }),
    clearTeamConnectionSettings: vi.fn(async () => {
      connection = null
    }),
    clearProviderAccountSharingSettings: vi.fn(async () => undefined),
    createDeviceId: vi.fn(() => "device-1"),
    getDesktopPlatform: vi.fn(async () => "macos"),
    getDetectedDeviceName: vi.fn(async () => "Alex MacBook"),
    getAppVersion: vi.fn(async () => "0.6.24"),
    nowIso: vi.fn(() => "2026-06-01T12:00:00.000Z"),
  }

  return {
    deps,
    get connection() {
      return connection
    },
    get token() {
      return token
    },
  }
}

describe("team connection actions", () => {
  it("connects, saves raw token in credentials, and saves metadata only", async () => {
    const fake = createDeps()

    const result = await connectTeam(
      "eusage://connect?url=https://team.example.com&token=eusage_dev_secret",
      fake.deps
    )

    expect(result.ok).toBe(true)
    expect(fake.deps.fetchTeamConfig).toHaveBeenCalledWith("https://team.example.com")
    expect(fake.deps.saveTeamToken).toHaveBeenCalledWith("eusage_dev_secret")
    expect(fake.deps.checkInTeamDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        teamUrl: "https://team.example.com",
        token: "eusage_dev_secret",
        deviceId: "device-1",
        deviceName: "Alex MacBook",
        os: "macos",
        appVersion: "0.6.24",
      })
    )
    expect(fake.token).toBe("eusage_dev_secret")
    expect(fake.deps.clearProviderAccountSharingSettings).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(fake.connection)).not.toContain("eusage_dev_secret")
    expect(fake.connection).toMatchObject({
      teamName: "Acme Team",
      reportingTimeZone: "America/New_York",
      tokenFingerprint: "abcd1234...wxyz7890",
      deviceName: "Alex MacBook",
      detectedDeviceName: "Alex MacBook",
      deviceNameOverride: null,
      syncStatus: "connected",
      lastContactAt: "2026-06-01T12:00:00.000Z",
      deviceStatus: "connected",
    })
  })

  it("fails connection when credential storage fails", async () => {
    const fake = createDeps()
    fake.deps.saveTeamToken.mockRejectedValueOnce(new Error("credential store unavailable"))

    const result = await connectTeam(
      "eusage://connect?url=https://team.example.com&token=eusage_dev_secret",
      fake.deps
    )

    expect(result).toMatchObject({
      ok: false,
      code: "credential-error",
      message: "credential store unavailable",
      connection: null,
    })
    expect(fake.token).toBeNull()
    expect(fake.connection).toBeNull()
    expect(fake.deps.checkInTeamDevice).not.toHaveBeenCalled()
  })

  it("disconnects locally even when backend notify fails", async () => {
    const fake = createDeps({
      connection: connectedSettings(),
      token: "eusage_dev_secret",
    })
    fake.deps.disconnectTeamDevice.mockResolvedValueOnce({
      ok: false,
      code: "network-error",
      message: "offline",
      statusCode: null,
    })

    const result = await disconnectTeam(fake.deps)

    expect(result).toMatchObject({
      ok: true,
      connection: null,
      message: "Disconnected locally. Team deployment was not reachable.",
    })
    expect(fake.deps.disconnectTeamDevice).toHaveBeenCalled()
    expect(fake.deps.clearProviderAccountSharingSettings).toHaveBeenCalledTimes(1)
    expect(fake.token).toBeNull()
    expect(fake.connection).toBeNull()
  })

  it("cleans up credentials and settings after invalid token check-in", async () => {
    const fake = createDeps({
      connection: connectedSettings(),
      token: "eusage_dev_secret",
    })
    fake.deps.checkInTeamDevice.mockResolvedValueOnce({
      ok: false,
      code: "revoked-token",
      message: "Developer token is revoked.",
      statusCode: 401,
    })

    const result = await refreshTeamCheckIn(fake.deps)

    expect(result).toMatchObject({
      ok: false,
      code: "revoked-token",
      connection: null,
    })
    expect(fake.token).toBeNull()
    expect(fake.connection).toBeNull()
    expect(fake.deps.clearProviderAccountSharingSettings).toHaveBeenCalledTimes(1)
  })

  it("saves a device name override and sends it on check-in", async () => {
    const fake = createDeps({
      connection: connectedSettings(),
      token: "eusage_dev_secret",
    })

    const result = await updateTeamDeviceNameOverride("Desk Mac", fake.deps)

    expect(result.ok).toBe(true)
    expect(fake.deps.checkInTeamDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: "device-1",
        deviceName: "Desk Mac",
      })
    )
    expect(fake.connection).toMatchObject({
      deviceName: "Desk Mac",
      detectedDeviceName: "Alex MacBook",
      deviceNameOverride: "Desk Mac",
    })
  })

  it("resets the device name override to the detected name", async () => {
    const fake = createDeps({
      connection: {
        ...connectedSettings(),
        deviceName: "Desk Mac",
        deviceNameOverride: "Desk Mac",
      },
      token: "eusage_dev_secret",
    })

    const result = await updateTeamDeviceNameOverride(null, fake.deps)

    expect(result.ok).toBe(true)
    expect(fake.deps.checkInTeamDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceName: "Alex MacBook",
      })
    )
    expect(fake.connection).toMatchObject({
      deviceName: "Alex MacBook",
      detectedDeviceName: "Alex MacBook",
      deviceNameOverride: null,
    })
  })

  it("falls back to an OS device name when detection is missing", async () => {
    const fake = createDeps()
    fake.deps.getDetectedDeviceName.mockResolvedValue(null)

    const result = await connectTeam(
      "eusage://connect?url=https://team.example.com&token=eusage_dev_secret",
      fake.deps
    )

    expect(result.ok).toBe(true)
    expect(fake.deps.checkInTeamDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceName: "macOS desktop",
      })
    )
    expect(fake.connection).toMatchObject({
      deviceName: "macOS desktop",
      detectedDeviceName: null,
      deviceNameOverride: null,
    })
  })

  it("loads as invalid without keeping old metadata after revoked token", async () => {
    const fake = createDeps({
      connection: connectedSettings(),
      token: "eusage_dev_secret",
    })
    fake.deps.checkInTeamDevice.mockResolvedValueOnce({
      ok: false,
      code: "inactive-developer",
      message: "Developer is inactive.",
      statusCode: 401,
    })

    const result = await loadTeamConnection(fake.deps)

    expect(result).toEqual({
      status: "invalid",
      connection: null,
      message: "Developer is inactive.",
    })
    expect(fake.token).toBeNull()
    expect(fake.connection).toBeNull()
    expect(fake.deps.clearProviderAccountSharingSettings).toHaveBeenCalledTimes(1)
  })

  it("updates saved reporting timezone from device check-in metadata", async () => {
    const fake = createDeps({
      connection: connectedSettings(),
      token: "eusage_dev_secret",
    })
    fake.deps.checkInTeamDevice.mockResolvedValueOnce({
      ok: true,
      value: {
        device: {
          deviceName: "Alex MacBook",
          status: "connected",
          lastSeenAt: 1780340000000,
          updatedAt: 1780340000000,
        },
        team: {
          reportingTimeZone: "America/Los_Angeles",
        },
      },
    })

    const result = await refreshTeamCheckIn(fake.deps)

    expect(result.ok).toBe(true)
    expect(fake.connection?.reportingTimeZone).toBe("America/Los_Angeles")
  })
})

function connectedSettings(): TeamConnectionSettings {
  return {
    teamUrl: "https://team.example.com",
    teamName: "Acme Team",
    reportingTimeZone: "America/New_York",
    tokenFingerprint: "abcd1234...wxyz7890",
    deviceId: "device-1",
    deviceName: "Alex MacBook",
    detectedDeviceName: "Alex MacBook",
    deviceNameOverride: null,
    endpoints,
    syncStatus: "connected",
    lastContactAt: "2026-06-01T12:00:00.000Z",
    deviceStatus: "connected",
    lastError: null,
  }
}
