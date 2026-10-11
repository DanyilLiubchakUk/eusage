import { describe, expect, it } from "vitest"
import {
  connectTeam,
  disconnectTeam,
  loadTeamConnection,
  refreshTeamCheckIn,
  updateTeamDeviceNameOverride,
} from "@/lib/team-connection-actions"
import { connectedSettings, createDeps, endpoints } from "../../test/team-connection-actions.helpers"

describe("team connection actions", () => {
  it("connects, saves raw token in credentials, and saves metadata only", async () => {
    const fake = createDeps()

    const result = await connectTeam(
      "eusage://connect?url=https://team.example.com&token=eusage_dev_secret",
      fake.deps
    )

    expect(result.ok).toBe(true)
    expect(fake.deps.fetchTeamConfig).toHaveBeenCalledWith("https://team.example.com")
    expect(fake.deps.replaceTeamConnectionSettings).toHaveBeenCalledWith(
      expect.objectContaining({ connectionId: "connection-1" }), "eusage_dev_secret"
    )
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
    expect(fake.sharingResets).toBe(1)
    expect(JSON.stringify(fake.connection)).not.toContain("eusage_dev_secret")
    expect(fake.connection).toMatchObject({
      teamName: "Acme Team",
      reportingTimeZone: "America/New_York",
      teamFingerprint: "team-fingerprint",
      tokenFingerprint: "abcd1234...wxyz7890",
      deviceName: "Alex MacBook",
      detectedDeviceName: "Alex MacBook",
      deviceNameOverride: null,
      syncStatus: "connected",
      lastContactAt: "2026-06-01T12:00:00.000Z",
      deviceStatus: "connected",
    })
  })

  it("clears Provider Account sharing when reconnecting to another team", async () => {
    const fake = createDeps({
      connection: connectedSettings(),
      token: "eusage_dev_old",
    })
    fake.deps.fetchTeamConfig.mockResolvedValueOnce({
      ok: true,
      value: {
        teamName: "Beta Team",
        reportingTimeZone: "America/New_York",
        teamFingerprint: "team-b-fingerprint",
        appVersion: "0.6.24",
        apiVersion: "v1",
        endpoints,
      },
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
          reportingTimeZone: "America/New_York",
          teamFingerprint: "team-b-fingerprint",
        },
      },
    })

    const result = await connectTeam(
      "eusage://connect?url=https://beta.example.com&token=eusage_dev_new",
      fake.deps
    )

    expect(result.ok).toBe(true)
    expect(fake.sharingResets).toBe(1)
    expect(fake.connection).toMatchObject({
      teamName: "Beta Team",
      teamFingerprint: "team-b-fingerprint",
      deviceId: "device-1",
    })
  })

  it("fails connection when credential storage fails", async () => {
    const fake = createDeps()
    fake.deps.replaceTeamConnectionSettings.mockRejectedValueOnce(new Error("credential store unavailable"))

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
    expect(fake.sharingResets).toBe(1)
    expect(fake.token).toBeNull()
    expect(fake.connection).toBeNull()
  })

  it("reuses the saved device ID after local disconnect", async () => {
    const fake = createDeps({
      deviceId: "device-1",
    })

    const result = await connectTeam(
      "eusage://connect?url=https://team.example.com&token=eusage_dev_secret",
      fake.deps
    )

    expect(result.ok).toBe(true)
    expect(fake.deps.createDeviceId).not.toHaveBeenCalled()
    expect(fake.deps.checkInTeamDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: "device-1",
      })
    )
  })

  it("reconnects after an offline disconnect using a fresh ID on an ownership conflict", async () => {
    const fake = createDeps({ connection: connectedSettings(), token: "eusage_dev_secret" })
    fake.deps.disconnectTeamDevice.mockResolvedValueOnce({
      ok: false, code: "network-error", message: "offline", statusCode: null,
    })
    await disconnectTeam(fake.deps)
    fake.deps.createDeviceId.mockReturnValue("device-new")
    fake.deps.checkInTeamDevice.mockResolvedValueOnce({
      ok: false, code: "device-owner-conflict", message: "Device belongs to another developer.", statusCode: 409,
    })

    const result = await connectTeam(
      "eusage://connect?url=https://team.example.com&token=eusage_dev_new_developer",
      fake.deps
    )

    expect(result).toMatchObject({ ok: true, connection: { deviceId: "device-new" } })
    expect(fake.deps.checkInTeamDevice).toHaveBeenNthCalledWith(1, expect.objectContaining({ deviceId: "device-1" }))
    expect(fake.deps.checkInTeamDevice).toHaveBeenNthCalledWith(2, expect.objectContaining({ deviceId: "device-new" }))
    expect(fake.deps.createDeviceId).toHaveBeenCalledTimes(1)
    expect(fake.connection?.deviceId).toBe("device-new")
  })

  it("reports a repeated ownership conflict without another retry", async () => {
    const fake = createDeps({ deviceId: "device-1" })
    fake.deps.createDeviceId.mockReturnValue("device-new")
    fake.deps.checkInTeamDevice.mockResolvedValue({
      ok: false, code: "device-owner-conflict", message: "Device belongs to another developer.", statusCode: 409,
    })

    const result = await connectTeam(
      "eusage://connect?url=https://team.example.com&token=eusage_dev_secret",
      fake.deps
    )

    expect(result).toMatchObject({ ok: false, code: "device-owner-conflict" })
    expect(fake.deps.checkInTeamDevice).toHaveBeenCalledTimes(2)
    expect(fake.deps.createDeviceId).toHaveBeenCalledTimes(1)
  })

  it.each([loadTeamConnection, refreshTeamCheckIn])(
    "does not register a new device during automatic or manual check-in",
    async (checkIn) => {
      const fake = createDeps({ connection: connectedSettings(), token: "eusage_dev_secret" })
      fake.deps.checkInTeamDevice.mockResolvedValueOnce({
        ok: false, code: "device-owner-conflict", message: "Device belongs to another developer.", statusCode: 409,
      })

      const result = await checkIn(fake.deps)

      expect(result).toMatchObject({ connection: { deviceId: "device-1" } })
      expect(fake.deps.checkInTeamDevice).toHaveBeenCalledTimes(1)
      expect(fake.deps.createDeviceId).not.toHaveBeenCalled()
    }
  )

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
    expect(fake.sharingResets).toBe(1)
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
    expect(fake.sharingResets).toBe(1)
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
          teamFingerprint: "team-fingerprint",
        },
      },
    })

    const result = await refreshTeamCheckIn(fake.deps)

    expect(result.ok).toBe(true)
    expect(fake.connection?.reportingTimeZone).toBe("America/Los_Angeles")
  })
})
