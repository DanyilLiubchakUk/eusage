import { vi } from "vitest"
import type { TeamConnectionSettings } from "../src/lib/team-settings"

export const endpoints = {
  teamConfig: "/api/v1/team-config",
  deviceCheckIn: "/api/v1/device/check-in",
  usageBatch: "/api/v1/usage/batch",
  deviceDisconnect: "/api/v1/device/disconnect",
  providerAccountUpdate: "/api/v1/provider-account/update",
}

export function createDeps(seed?: {
  connection?: TeamConnectionSettings | null
  token?: string | null
  deviceId?: string | null
}) {
  let connection = seed?.connection ?? null
  let token = seed?.token ?? null
  let deviceId = seed?.deviceId ?? connection?.deviceId ?? null

  let connectionSequence = 0
  let sharingResets = 0

  const deps = {
    fetchTeamConfig: vi.fn(async () => ({
      ok: true as const,
      value: {
        teamName: "Acme Team",
        reportingTimeZone: "America/New_York",
        teamFingerprint: "team-fingerprint",
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
          teamFingerprint: "team-fingerprint",
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
          teamFingerprint: "team-fingerprint",
        },
      },
    })),
    fingerprintDeveloperToken: vi.fn(async () => "abcd1234...wxyz7890"),
    readTeamToken: vi.fn(async () => token),
    loadTeamConnectionSettings: vi.fn(async () => connection),
    loadTeamDeviceId: vi.fn(async () => deviceId),
    replaceTeamConnectionSettings: vi.fn(async (value: TeamConnectionSettings, nextToken: string) => {
      connection = value
      token = nextToken
      deviceId = value.deviceId
      sharingResets += 1
    }),
    saveTeamConnectionSettings: vi.fn(async (value: TeamConnectionSettings) => {
      if (!connection || (connection.connectionId ?? null) !== (value.connectionId ?? null)) return false
      connection = value
      deviceId = value.deviceId
      return true
    }),
    clearTeamConnectionSettings: vi.fn(async (expected: TeamConnectionSettings) => {
      if (!connection || (connection.connectionId ?? null) !== (expected.connectionId ?? null)) return false
      deviceId = connection.deviceId
      connection = null
      token = null
      sharingResets += 1
      return true
    }),
    createConnectionId: vi.fn(() => `connection-${++connectionSequence}`),
    createDeviceId: vi.fn(() => "device-1"),
    getDesktopPlatform: vi.fn(async () => "macos"),
    getDetectedDeviceName: vi.fn(async () => "Alex MacBook"),
    getAppVersion: vi.fn(async () => "0.6.24"),
    nowIso: vi.fn(() => "2026-06-01T12:00:00.000Z"),
  }

  return {
    deps,
    get sharingResets() {
      return sharingResets
    },
    get connection() {
      return connection
    },
    get token() {
      return token
    },
  }
}

export function connectedSettings(): TeamConnectionSettings {
  return {
    teamUrl: "https://team.example.com",
    teamName: "Acme Team",
    reportingTimeZone: "America/New_York",
    teamFingerprint: "team-fingerprint",
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
