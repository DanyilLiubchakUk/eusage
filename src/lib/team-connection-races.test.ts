import { expect, it, vi } from "vitest"
import { connectTeam, disconnectTeam, loadTeamConnection, refreshTeamCheckIn } from "@/lib/team-connection-actions"
import { connectedSettings, createDeps } from "../../test/team-connection-actions.helpers"

const connectionString = "eusage://connect?url=https://team.example.com&token=eusage_dev_test_placeholder"

function holdCheckIn(fake: ReturnType<typeof createDeps>) {
  let finish!: () => void
  const pending = new Promise<void>((resolve) => { finish = resolve })
  const checkIn = fake.deps.checkInTeamDevice.getMockImplementation()!
  fake.deps.checkInTeamDevice.mockImplementationOnce(async (input) => {
    await pending
    return checkIn(input)
  })
  return finish
}

it("serializes disconnect behind a pending check-in", async () => {
  const fake = createDeps({ connection: connectedSettings(), token: "synthetic-value" })
  const finish = holdCheckIn(fake)
  const checkIn = refreshTeamCheckIn(fake.deps)
  await vi.waitFor(() => expect(fake.deps.checkInTeamDevice).toHaveBeenCalled())
  const disconnect = disconnectTeam(fake.deps)
  await Promise.resolve()
  expect(fake.deps.disconnectTeamDevice).not.toHaveBeenCalled()
  finish()
  await Promise.all([checkIn, disconnect])
  expect(fake.connection).toBeNull()
  expect(fake.token).toBeNull()
})

it("does not restore a connection invalidated by background work during check-in", async () => {
  const connection = connectedSettings()
  const fake = createDeps({ connection, token: "synthetic-value" })
  const finish = holdCheckIn(fake)
  const checkIn = refreshTeamCheckIn(fake.deps)
  await vi.waitFor(() => expect(fake.deps.checkInTeamDevice).toHaveBeenCalled())
  await fake.deps.clearTeamConnectionSettings(connection)
  finish()
  await expect(checkIn).resolves.toMatchObject({ ok: false, code: "settings-error", connection: null })
  expect(fake.connection).toBeNull()
})

it("assigns a new connection identity even when reconnecting with the same device and token", async () => {
  const fake = createDeps()
  await connectTeam(connectionString, fake.deps)
  const first = fake.connection!
  await connectTeam(connectionString, fake.deps)
  expect(fake.connection?.deviceId).toBe(first.deviceId)
  expect(fake.connection?.connectionId).not.toBe(first.connectionId)
  expect(fake.deps.replaceTeamConnectionSettings).toHaveBeenCalledTimes(2)
})

it("continues the action queue after a failed operation", async () => {
  const fake = createDeps()
  fake.deps.fetchTeamConfig.mockRejectedValueOnce(new Error("synthetic failure"))
  await expect(connectTeam(connectionString, fake.deps)).rejects.toThrow("synthetic failure")
  await expect(connectTeam(connectionString, fake.deps)).resolves.toMatchObject({ ok: true })
})

it("preserves the current connection when replacement fails", async () => {
  const connection = connectedSettings()
  const fake = createDeps({ connection, token: "synthetic-old-value" })
  fake.deps.replaceTeamConnectionSettings.mockRejectedValueOnce(new Error("synthetic disk failure"))
  await expect(connectTeam(connectionString, fake.deps)).resolves.toMatchObject({
    ok: false, code: "credential-error", connection,
  })
  expect(fake.connection).toEqual(connection)
  expect(fake.token).toBe("synthetic-old-value")
  expect(fake.deps.clearTeamConnectionSettings).not.toHaveBeenCalled()
})

it.each([loadTeamConnection, refreshTeamCheckIn, disconnectTeam])("never sends mismatched stored credentials to a saved Team", async (action) => {
  const fake = createDeps({ connection: connectedSettings(), token: "synthetic-replacement" })
  fake.deps.fingerprintDeveloperToken.mockResolvedValue("different-fingerprint")
  await action(fake.deps)
  expect(fake.deps.checkInTeamDevice).not.toHaveBeenCalled()
  expect(fake.deps.disconnectTeamDevice).not.toHaveBeenCalled()
})

it.each([loadTeamConnection, refreshTeamCheckIn])("preserves a connection when the Linux keyring is locked", async (action) => {
  const connection = connectedSettings()
  const fake = createDeps({ connection, token: "synthetic-value" })
  fake.deps.readTeamToken.mockRejectedValueOnce(new Error("Linux keyring is locked. Unlock it and retry."))

  const result = await action(fake.deps)

  expect(result.message).toContain("Linux keyring is locked")
  expect(fake.connection).toEqual(connection)
  expect(fake.token).toBe("synthetic-value")
  expect(fake.deps.clearTeamConnectionSettings).not.toHaveBeenCalled()
  expect(fake.deps.checkInTeamDevice).not.toHaveBeenCalled()
  expect(fake.deps.disconnectTeamDevice).not.toHaveBeenCalled()
})

it("reports a locked keyring during disconnect without pretending the token was removed", async () => {
  const connection = connectedSettings()
  const fake = createDeps({ connection, token: "synthetic-value" })
  const error = new Error("Linux keyring is locked. Unlock it and retry.")
  fake.deps.readTeamToken.mockRejectedValueOnce(error)
  fake.deps.clearTeamConnectionSettings.mockRejectedValueOnce(error)

  const result = await disconnectTeam(fake.deps)

  expect(result.ok).toBe(false)
  expect(result.message).toContain("Linux keyring is locked")
  expect(fake.connection).toEqual(connection)
  expect(fake.token).toBe("synthetic-value")
  expect(fake.deps.disconnectTeamDevice).not.toHaveBeenCalled()
})
