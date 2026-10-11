import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  clearTeamConnectionSettings,
  loadTeamDeviceId,
  loadTeamConnectionSettings,
  normalizeTeamConnectionSettings,
  saveTeamConnectionSettings,
  replaceTeamConnectionSettings,
  type TeamConnectionSettings,
} from "@/lib/team-settings"

const invoke = vi.hoisted(() => vi.fn())
vi.mock("@tauri-apps/api/core", () => ({ invoke }))

const connection: TeamConnectionSettings = {
  teamUrl: "https://team.example.com",
  teamName: "Acme Team",
  reportingTimeZone: "America/New_York",
  teamFingerprint: "team-fingerprint",
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
    providerAccountUpdate: "/api/v1/provider-account/update",
  },
  syncStatus: "connected",
  lastContactAt: "2026-06-01T12:00:00.000Z",
  deviceStatus: "connected",
  lastError: null,
}

describe("team settings", () => {
  beforeEach(() => {
    invoke.mockResolvedValue(true)
  })

  it("replaces credentials and metadata in one native operation", async () => {
    const next = { ...connection, connectionId: "connection-1" }
    await replaceTeamConnectionSettings(next, "synthetic-value")
    expect(invoke).toHaveBeenCalledWith("replace_team_connection", {
      settings: next, token: "synthetic-value",
    })
  })

  it("updates only the expected connection and returns stale rejection", async () => {
    const next = { ...connection, connectionId: "connection-1" }
    invoke.mockResolvedValueOnce(false)
    await expect(saveTeamConnectionSettings(next)).resolves.toBe(false)
    expect(invoke).toHaveBeenCalledWith("update_team_connection", {
      settings: next, expectedConnectionId: "connection-1",
    })
  })

  it("rejects invalid stored metadata", () => {
    expect(normalizeTeamConnectionSettings({ ...connection, teamUrl: "" })).toBeNull()
    expect(
      normalizeTeamConnectionSettings({
        ...connection,
        endpoints: { ...connection.endpoints, deviceCheckIn: "api/v1/device/check-in" },
      })
    ).toBeNull()
  })

  it("keeps old saved connections readable without Unknown device", () => {
    const legacy = {
      ...connection,
      deviceName: "Unknown device",
      detectedDeviceName: undefined,
      deviceNameOverride: undefined,
      reportingTimeZone: undefined,
      teamFingerprint: undefined,
      endpoints: {
        teamConfig: "/api/v1/team-config",
        deviceCheckIn: "/api/v1/device/check-in",
        usageBatch: "/api/v1/usage/batch",
        deviceDisconnect: "/api/v1/device/disconnect",
      },
    }

    expect(normalizeTeamConnectionSettings(legacy)).toMatchObject({
      reportingTimeZone: "UTC",
      teamFingerprint: "",
      deviceName: "Desktop",
      detectedDeviceName: null,
      deviceNameOverride: null,
      endpoints: {
        providerAccountUpdate: "/api/v1/provider-account/update",
      },
    })
  })

  it("guards legacy connection cleanup and reads the preserved device ID", async () => {
    await clearTeamConnectionSettings(connection)
    expect(invoke).toHaveBeenCalledWith("clear_team_connection", { expectedConnectionId: null })
    invoke.mockResolvedValue({ teamDeviceId: "device-1" })
    await expect(loadTeamConnectionSettings()).resolves.toBeNull()
    await expect(loadTeamDeviceId()).resolves.toBe("device-1")
  })
})
