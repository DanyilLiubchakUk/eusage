import { describe, expect, it } from "vitest"
import {
  DEVICE_STALE_AFTER_MS,
  authenticateDesktopTokenHash,
  checkInDevice,
  disconnectDevice,
  getDeviceStatus,
  getPublicTeamConfig,
} from "./desktopApi"
import { createDesktopApiTestStore } from "../test/convex/desktopApiHelpers"

describe("desktop API", () => {
  it("returns public team reporting timezone metadata", async () => {
    const fake = await createDesktopApiTestStore()

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

  it("returns Organization metadata for a valid desktop token", async () => {
    const fake = await createDesktopApiTestStore()

    const result = await getPublicTeamConfig({
      tokenHash: fake.tokenHash,
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: true,
      team: {
        name: "Acme Team",
        organizationName: "Acme Team",
        organizationFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    })
  })

  it("rejects missing bearer auth before device writes", async () => {
    const fake = await createDesktopApiTestStore()

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

  it("rejects tokens that are not mapped to an Organization", async () => {
    const fake = await createDesktopApiTestStore({ organizations: null })

    const result = await authenticateDesktopTokenHash({
      tokenHash: fake.tokenHash,
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: false,
      status: "error",
      code: "setup-state-invalid",
      message: "Developer token is not connected to an Organization.",
    })
  })

  it("rejects revoked developer tokens", async () => {
    const fake = await createDesktopApiTestStore({
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
    const fake = await createDesktopApiTestStore()

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

  it("does not update another Organization device with the same device ID", async () => {
    const fake = await createDesktopApiTestStore({
      devices: [
        {
          _id: "other-device",
          teamId: "team-other",
          developerId: "developer-other",
          deviceId: "device-1",
          deviceName: "Other MacBook",
          os: "macos",
          appVersion: "0.6.24",
          status: "connected",
          lastSeenAt: 1780330000000,
          createdAt: 1780330000000,
          updatedAt: 1780330000000,
        },
      ],
    })

    const result = await checkInDevice({
      input: {
        tokenHash: fake.tokenHash,
        deviceId: "device-1",
        deviceName: "Alex MacBook",
        os: "macos",
        appVersion: "0.6.25",
      },
      now: 1780340000000,
      store: fake.store,
    })

    expect(result.ok).toBe(true)
    expect(fake.devices).toHaveLength(2)
    expect(fake.devices[0]).toMatchObject({
      teamId: "team-other",
      deviceName: "Other MacBook",
      appVersion: "0.6.24",
    })
    expect(fake.devices[1]).toMatchObject({
      teamId: "team-1",
      developerId: "developer-1",
      deviceId: "device-1",
      appVersion: "0.6.25",
    })
  })

  it("uses OS fallback instead of Unknown device when no name is sent", async () => {
    const fake = await createDesktopApiTestStore()

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
    const fake = await createDesktopApiTestStore({
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
    const fake = await createDesktopApiTestStore({
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
