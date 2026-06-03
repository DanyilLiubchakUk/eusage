import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  clearTeamConnectionSettings,
  loadTeamConnectionSettings,
  normalizeTeamConnectionSettings,
  saveTeamConnectionSettings,
  type TeamConnectionSettings,
} from "@/lib/team-settings"

const storeState = new Map<string, unknown>()
const storeDeleteMock = vi.fn()
const storeSaveMock = vi.fn()

vi.mock("@tauri-apps/plugin-store", () => ({
  LazyStore: class {
    async get<T>(key: string): Promise<T | null> {
      if (!storeState.has(key)) return undefined as T | null
      return storeState.get(key) as T | null
    }
    async set<T>(key: string, value: T): Promise<void> {
      storeState.set(key, value)
    }
    async delete(key: string): Promise<void> {
      storeDeleteMock(key)
      storeState.delete(key)
    }
    async save(): Promise<void> {
      storeSaveMock()
    }
  },
}))

const connection: TeamConnectionSettings = {
  teamUrl: "https://team.example.com",
  teamName: "Acme Team",
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

describe("team settings", () => {
  beforeEach(() => {
    storeState.clear()
    storeDeleteMock.mockReset()
    storeSaveMock.mockReset()
  })

  it("persists only non-secret team metadata", async () => {
    await saveTeamConnectionSettings(connection)

    const stored = storeState.get("teamConnection")
    expect(stored).toEqual(connection)
    expect(JSON.stringify(stored)).not.toContain("eusage_dev_")
    await expect(loadTeamConnectionSettings()).resolves.toEqual(connection)
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
    }

    expect(normalizeTeamConnectionSettings(legacy)).toMatchObject({
      deviceName: "Desktop",
      detectedDeviceName: null,
      deviceNameOverride: null,
    })
  })

  it("clears the team connection key", async () => {
    storeState.set("teamConnection", connection)

    await clearTeamConnectionSettings()

    expect(storeDeleteMock).toHaveBeenCalledWith("teamConnection")
    expect(storeSaveMock).toHaveBeenCalledTimes(1)
    await expect(loadTeamConnectionSettings()).resolves.toBeNull()
  })
})
