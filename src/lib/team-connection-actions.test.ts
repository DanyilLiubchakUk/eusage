import { describe, expect, it, vi } from "vitest"
import {
  connectTeam,
  disconnectTeam,
  loadTeamConnection,
  refreshTeamCheckIn,
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
        appVersion: "0.6.24",
        apiVersion: "v1",
        endpoints,
      },
    })),
    checkInTeamDevice: vi.fn(async () => ({
      ok: true as const,
      value: {
        device: {
          status: "connected" as const,
          lastSeenAt: 1780340000000,
          updatedAt: 1780340000000,
        },
      },
    })),
    disconnectTeamDevice: vi.fn(async () => ({
      ok: true as const,
      value: {
        device: {
          status: "disconnected" as const,
          lastSeenAt: 1780340000000,
          updatedAt: 1780340000001,
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
    createDeviceId: vi.fn(() => "device-1"),
    getDesktopPlatform: vi.fn(async () => "macos"),
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
        os: "macos",
        appVersion: "0.6.24",
      })
    )
    expect(fake.token).toBe("eusage_dev_secret")
    expect(JSON.stringify(fake.connection)).not.toContain("eusage_dev_secret")
    expect(fake.connection).toMatchObject({
      teamName: "Acme Team",
      tokenFingerprint: "abcd1234...wxyz7890",
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
  })
})

function connectedSettings(): TeamConnectionSettings {
  return {
    teamUrl: "https://team.example.com",
    teamName: "Acme Team",
    tokenFingerprint: "abcd1234...wxyz7890",
    deviceId: "device-1",
    endpoints,
    syncStatus: "connected",
    lastContactAt: "2026-06-01T12:00:00.000Z",
    deviceStatus: "connected",
    lastError: null,
  }
}
