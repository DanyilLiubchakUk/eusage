import { describe, expect, it } from "vitest"
import {
  DEVICE_STALE_AFTER_MS,
  authenticateDesktopTokenHash,
  checkInDevice,
  disconnectDevice,
  getDeviceStatus,
  getPublicTeamConfig,
  type DesktopApiStore,
  type DeviceRecord,
  type NewDeviceRecord,
} from "./desktopApi"
import {
  hashDeveloperToken,
  type DeveloperRecord,
  type DeveloperTeamRecord,
  type DeveloperTokenRecord,
} from "./developerTokens"

async function createStore(seed?: {
  token?: Partial<DeveloperTokenRecord>
  developer?: Partial<DeveloperRecord>
  devices?: DeviceRecord[]
}) {
  const rawToken = "eusage_dev_secret_raw_token"
  const tokenHash = await hashDeveloperToken(rawToken)
  const team: DeveloperTeamRecord = {
    _id: "team-1",
    name: "Acme Team",
    slug: "acme-team",
    reportingTimeZone: "America/New_York",
  }
  const developers: DeveloperRecord[] = [
    {
      _id: "developer-1",
      teamId: "team-1",
      displayName: "Alex Dev",
      status: "active",
      createdAt: 1780320000000,
      updatedAt: 1780320000000,
      ...seed?.developer,
    },
  ]
  const tokens: DeveloperTokenRecord[] = [
    {
      _id: "token-1",
      teamId: "team-1",
      developerId: "developer-1",
      tokenHash,
      fingerprint: "hash...hash",
      label: "Alex laptop",
      status: "active",
      createdAt: 1780320000000,
      ...seed?.token,
    },
  ]
  const devices: DeviceRecord[] = seed?.devices ? [...seed.devices] : []

  const store: DesktopApiStore = {
    getTeam: async () => team,
    getTokenByHash: async (hash) =>
      tokens.find((token) => token.tokenHash === hash) ?? null,
    getDeveloper: async (developerId) =>
      developers.find((developer) => developer._id === developerId) ?? null,
    getDeviceByDeviceId: async (deviceId) =>
      devices.find((device) => device.deviceId === deviceId) ?? null,
    createDevice: async (device: NewDeviceRecord) => {
      const created = {
        _id: `device-${devices.length + 1}`,
        ...device,
      }
      devices.push(created)
      return created
    },
    updateDevice: async (deviceRecordId, patch) => {
      const device = devices.find((row) => row._id === deviceRecordId)
      if (!device) throw new Error("Missing device in fake store.")
      Object.assign(device, patch)
      return device
    },
    updateDeveloper: async (developerId, patch) => {
      const developer = developers.find((row) => row._id === developerId)
      if (!developer) throw new Error("Missing developer in fake store.")
      Object.assign(developer, patch)
      return developer
    },
    updateToken: async (tokenId, patch) => {
      const token = tokens.find((row) => row._id === tokenId)
      if (!token) throw new Error("Missing token in fake store.")
      Object.assign(token, patch)
      return token
    },
  }

  return {
    store,
    rawToken,
    tokenHash,
    developers,
    tokens,
    devices,
  }
}

describe("desktop API", () => {
  it("returns public team reporting timezone metadata", async () => {
    const fake = await createStore()

    await expect(getPublicTeamConfig({ store: fake.store })).resolves.toMatchObject({
      ok: true,
      team: {
        name: "Acme Team",
        reportingTimeZone: "America/New_York",
        teamFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    })
    const result = await getPublicTeamConfig({ store: fake.store })
    expect(JSON.stringify(result)).not.toContain("team-1")
  })

  it("rejects missing bearer auth before device writes", async () => {
    const fake = await createStore()

    const result = await authenticateDesktopTokenHash({
      tokenHash: null,
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: false,
      status: "error",
      code: "missing-bearer-auth",
    })
  })

  it("rejects revoked developer tokens", async () => {
    const fake = await createStore({
      token: {
        status: "revoked",
        revokedAt: 1780330000000,
      },
    })

    const result = await checkInDevice({
      input: {
        tokenHash: fake.tokenHash,
        deviceId: "device-1",
        os: "macos",
        appVersion: "0.6.24",
      },
      now: 1780340000000,
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: false,
      status: "error",
      code: "revoked-token",
    })
    expect(fake.devices).toHaveLength(0)
  })

  it("creates and updates a device check-in for the authenticated developer", async () => {
    const fake = await createStore()

    const first = await checkInDevice({
      input: {
        tokenHash: fake.tokenHash,
        deviceId: "device-1",
        deviceName: "Alex MacBook",
        os: "macos",
        appVersion: "0.6.24",
      },
      now: 1780340000000,
      store: fake.store,
    })
    const second = await checkInDevice({
      input: {
        tokenHash: fake.tokenHash,
        deviceId: "device-1",
        deviceName: "Alex MacBook Pro",
        os: "macos",
        appVersion: "0.6.25",
      },
      now: 1780343600000,
      store: fake.store,
    })

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    expect(first).toMatchObject({
      team: {
        reportingTimeZone: "America/New_York",
      },
    })
    expect(fake.devices).toHaveLength(1)
    expect(fake.devices[0]).toMatchObject({
      developerId: "developer-1",
      deviceId: "device-1",
      deviceName: "Alex MacBook Pro",
      os: "macos",
      appVersion: "0.6.25",
      status: "connected",
      lastSeenAt: 1780343600000,
    })
    expect(fake.developers[0].lastSeenAt).toBe(1780343600000)
    expect(fake.tokens[0].lastUsedAt).toBe(1780343600000)
  })

  it("uses OS fallback instead of Unknown device when no name is sent", async () => {
    const fake = await createStore()

    const result = await checkInDevice({
      input: {
        tokenHash: fake.tokenHash,
        deviceId: "device-1",
        os: "windows",
        appVersion: "0.6.24",
      },
      now: 1780340000000,
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: true,
      device: {
        deviceName: "Windows desktop",
      },
    })
    expect(fake.devices[0].deviceName).toBe("Windows desktop")
  })

  it("replaces old Unknown device labels in public rows", async () => {
    const fake = await createStore({
      devices: [
        {
          _id: "device-1",
          teamId: "team-1",
          developerId: "developer-1",
          deviceId: "device-1",
          deviceName: "Unknown device",
          os: "macos",
          appVersion: "0.6.24",
          status: "connected",
          lastSeenAt: 1780340000000,
          createdAt: 1780340000000,
          updatedAt: 1780340000000,
        },
      ],
    })

    const result = await disconnectDevice({
      input: {
        tokenHash: fake.tokenHash,
        deviceId: "device-1",
      },
      now: 1780347200000,
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: true,
      device: {
        deviceName: "macOS desktop",
      },
    })
  })

  it("marks an existing device disconnected without deleting it", async () => {
    const fake = await createStore({
      devices: [
        {
          _id: "device-1",
          teamId: "team-1",
          developerId: "developer-1",
          deviceId: "device-1",
          deviceName: "Alex MacBook",
          os: "macos",
          appVersion: "0.6.24",
          status: "connected",
          lastSeenAt: 1780340000000,
          createdAt: 1780340000000,
          updatedAt: 1780340000000,
        },
      ],
    })

    const result = await disconnectDevice({
      input: {
        tokenHash: fake.tokenHash,
        deviceId: "device-1",
      },
      now: 1780347200000,
      store: fake.store,
    })

    expect(result.ok).toBe(true)
    expect(fake.devices).toHaveLength(1)
    expect(fake.devices[0]).toMatchObject({
      status: "disconnected",
      lastSeenAt: 1780340000000,
      updatedAt: 1780347200000,
    })
  })

  it("derives stale status after 72 hours without check-in", () => {
    const now = 1780340000000
    const fresh = {
      status: "connected" as const,
      lastSeenAt: now - DEVICE_STALE_AFTER_MS,
    }
    const stale = {
      status: "connected" as const,
      lastSeenAt: now - DEVICE_STALE_AFTER_MS - 1,
    }

    expect(getDeviceStatus(fresh, now)).toBe("connected")
    expect(getDeviceStatus(stale, now)).toBe("stale")
    expect(getDeviceStatus({ ...stale, status: "disconnected" }, now)).toBe(
      "disconnected"
    )
  })
})
