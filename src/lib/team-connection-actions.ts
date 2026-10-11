import { getVersion } from "@tauri-apps/api/app"
import { invoke } from "@tauri-apps/api/core"
import { normalizeDeviceName, resolveDeviceName } from "@/lib/team-device-name"
import {
  fingerprintDeveloperToken,
  isInvalidTokenError,
  parseTeamConnectionString,
  type TeamConnectionErrorCode,
} from "@/lib/team-connection"
import {
  checkInTeamDevice,
  disconnectTeamDevice,
  fetchTeamConfig,
  type TeamConfig,
} from "@/lib/team-api"
import {
  clearTeamConnectionSettings,
  loadTeamDeviceId,
  loadTeamConnectionSettings,
  saveTeamConnectionSettings,
  replaceTeamConnectionSettings,
  type TeamConnectionSettings,
} from "@/lib/team-settings"
import { readTeamToken } from "@/lib/team-credentials"

export type TeamConnectionActionResult =
  | {
      ok: true
      connection: TeamConnectionSettings | null
      message: string
    }
  | {
      ok: false
      code: TeamConnectionErrorCode
      message: string
      connection: TeamConnectionSettings | null
    }

export type TeamConnectionLoadResult =
  | {
      status: "disconnected"
      connection: null
      message: string | null
    }
  | {
      status: "connected" | "error"
      connection: TeamConnectionSettings
      message: string | null
    }
  | {
      status: "invalid"
      connection: null
      message: string | null
    }

type TeamConnectionCheckInResult =
  | {
      ok: true
      connection: TeamConnectionSettings
      message: string
    }
  | Extract<TeamConnectionActionResult, { ok: false }>

type ActionDeps = {
  fetchTeamConfig: typeof fetchTeamConfig
  checkInTeamDevice: typeof checkInTeamDevice
  disconnectTeamDevice: typeof disconnectTeamDevice
  fingerprintDeveloperToken: typeof fingerprintDeveloperToken
  readTeamToken: typeof readTeamToken
  loadTeamConnectionSettings: typeof loadTeamConnectionSettings
  loadTeamDeviceId: typeof loadTeamDeviceId
  saveTeamConnectionSettings: typeof saveTeamConnectionSettings
  clearTeamConnectionSettings: typeof clearTeamConnectionSettings
  replaceTeamConnectionSettings: typeof replaceTeamConnectionSettings
  createConnectionId: () => string
  createDeviceId: () => string
  getDesktopPlatform: () => Promise<string>
  getDetectedDeviceName: () => Promise<string | null>
  getAppVersion: () => Promise<string>
  nowIso: () => string
}

const defaultDeps: ActionDeps = {
  fetchTeamConfig,
  checkInTeamDevice,
  disconnectTeamDevice,
  fingerprintDeveloperToken,
  readTeamToken,
  loadTeamConnectionSettings,
  loadTeamDeviceId,
  saveTeamConnectionSettings,
  clearTeamConnectionSettings,
  replaceTeamConnectionSettings,
  createConnectionId: () => crypto.randomUUID(),
  createDeviceId: () => crypto.randomUUID(),
  getDesktopPlatform: () => invoke<string>("get_desktop_platform"),
  getDetectedDeviceName: () => invoke<string | null>("get_detected_device_name"),
  getAppVersion: () => getVersion(),
  nowIso: () => new Date().toISOString(),
}

let teamActionQueue = Promise.resolve()

function serializeTeamAction<Args extends unknown[], Result>(action: (...args: Args) => Promise<Result>) {
  return (...args: Args): Promise<Result> => {
    const result = teamActionQueue.then(() => action(...args))
    teamActionQueue = result.then(() => undefined, () => undefined)
    return result
  }
}

export const loadTeamConnection = serializeTeamAction(loadTeamConnectionNow)
export const connectTeam = serializeTeamAction(connectTeamNow)
export const refreshTeamCheckIn = serializeTeamAction(refreshTeamCheckInNow)
export const disconnectTeam = serializeTeamAction(disconnectTeamNow)
export const updateTeamDeviceNameOverride = serializeTeamAction(updateTeamDeviceNameOverrideNow)

async function loadTeamConnectionNow(
  deps: Partial<ActionDeps> = {}
): Promise<TeamConnectionLoadResult> {
  const resolved = { ...defaultDeps, ...deps }
  const connection = await resolved.loadTeamConnectionSettings()
  if (!connection) {
    return { status: "disconnected", connection: null, message: null }
  }

  const token = await readStoredToken(resolved, connection)
  if (!token.ok) {
    return {
      status: "error",
      connection: markConnectionError(connection, token.message),
      message: token.message,
    }
  }

  if (!token.value) {
    if (!await resolved.clearTeamConnectionSettings(connection)) {
      const current = await resolved.loadTeamConnectionSettings()
      if (current) return { status: "error", connection: current, message: "Team connection changed. Try again." }
    }
    return {
      status: "disconnected",
      connection: null,
      message: "Team token is missing. Paste a connection string again.",
    }
  }

  const checkIn = await checkInConnection(connection, token.value, resolved)
  if (checkIn.ok) {
    return {
      status: "connected",
      connection: checkIn.connection,
      message: checkIn.message,
    }
  }

  if (isInvalidTokenError(checkIn.code)) {
    return {
      status: "invalid",
      connection: null,
      message: checkIn.message,
    }
  }

  return {
    status: "error",
    connection: checkIn.connection ?? connection,
    message: checkIn.message,
  }
}

async function connectTeamNow(
  connectionString: string,
  deps: Partial<ActionDeps> = {}
): Promise<TeamConnectionActionResult> {
  const resolved = { ...defaultDeps, ...deps }
  const parsed = parseTeamConnectionString(connectionString)
  if (!parsed.ok) return { ...parsed, connection: null }

  const config = await resolved.fetchTeamConfig(parsed.value.teamUrl)
  if (!config.ok) return { ...config, connection: null }

  const existing = await resolved.loadTeamConnectionSettings()
  const storedDeviceId = existing?.deviceId ?? (await resolved.loadTeamDeviceId())
  const connection = await buildConnectionSettings({
    config: config.value,
    teamUrl: parsed.value.teamUrl,
    token: parsed.value.token,
    deviceId: storedDeviceId ?? resolved.createDeviceId(),
    deps: resolved,
  })

  const saved = await saveTokenAndSettings(connection, parsed.value.token, resolved)
  if (!saved.ok) return saved

  const checkedIn = await checkInConnection(connection, parsed.value.token, resolved)
  if (checkedIn.ok || checkedIn.code !== "device-owner-conflict") return checkedIn

  // Offline disconnect may leave the saved ID owned by the previous developer.
  // Only an explicit connect can register this installation with a fresh ID.
  const replacement = { ...connection, deviceId: resolved.createDeviceId() }
  if (!await resolved.saveTeamConnectionSettings(replacement)) return connectionChanged(resolved)
  return checkInConnection(replacement, parsed.value.token, resolved)
}

async function refreshTeamCheckInNow(
  deps: Partial<ActionDeps> = {}
): Promise<TeamConnectionActionResult> {
  const resolved = { ...defaultDeps, ...deps }
  const connection = await resolved.loadTeamConnectionSettings()
  if (!connection) {
    return {
      ok: false,
      code: "settings-error",
      message: "No team connection is saved.",
      connection: null,
    }
  }

  const token = await readStoredToken(resolved, connection)
  if (!token.ok) {
    return {
      ok: false,
      code: "credential-error",
      message: token.message,
      connection,
    }
  }
  if (!token.value) {
    if (!await resolved.clearTeamConnectionSettings(connection)) return connectionChanged(resolved)
    return {
      ok: false,
      code: "credential-error",
      message: "Team token is missing. Paste a connection string again.",
      connection: null,
    }
  }

  return checkInConnection(connection, token.value, resolved)
}

async function disconnectTeamNow(
  deps: Partial<ActionDeps> = {}
): Promise<TeamConnectionActionResult> {
  const resolved = { ...defaultDeps, ...deps }
  const connection = await resolved.loadTeamConnectionSettings()
  const token = await readStoredToken(resolved, connection)
  let notifyFailed = false

  if (connection && token.ok && token.value) {
    const notify = await resolved.disconnectTeamDevice({
      teamUrl: connection.teamUrl,
      endpoints: connection.endpoints,
      token: token.value,
      deviceId: connection.deviceId,
    })
    notifyFailed = !notify.ok
  }

  try {
    if (connection && !await resolved.clearTeamConnectionSettings(connection)) return connectionChanged(resolved)
  } catch (error) {
    return {
      ok: false,
      code: "credential-error",
      message: errorMessage(error, "Failed to remove team credentials."),
      connection,
    }
  }

  return {
    ok: true,
    connection: null,
    message: notifyFailed
      ? "Disconnected locally. Team deployment was not reachable."
      : "Disconnected from team.",
  }
}

async function updateTeamDeviceNameOverrideNow(
  deviceNameOverride: string | null,
  deps: Partial<ActionDeps> = {}
): Promise<TeamConnectionActionResult> {
  const resolved = { ...defaultDeps, ...deps }
  const connection = await resolved.loadTeamConnectionSettings()
  if (!connection) {
    return {
      ok: false,
      code: "settings-error",
      message: "No team connection is saved.",
      connection: null,
    }
  }

  const normalizedOverride =
    deviceNameOverride === null ? null : normalizeDeviceName(deviceNameOverride)
  if (deviceNameOverride !== null && !normalizedOverride) {
    return {
      ok: false,
      code: "settings-error",
      message: "Device name is required.",
      connection,
    }
  }

  const updated = await withResolvedDeviceName(
    {
      ...connection,
      deviceNameOverride: normalizedOverride,
    },
    resolved
  )
  if (!await resolved.saveTeamConnectionSettings(updated)) return connectionChanged(resolved)

  const token = await readStoredToken(resolved, updated)
  if (!token.ok) {
    return {
      ok: false,
      code: "credential-error",
      message: token.message,
      connection: updated,
    }
  }
  if (!token.value) {
    return {
      ok: true,
      connection: updated,
      message: "Device name saved locally.",
    }
  }

  return checkInConnection(updated, token.value, resolved)
}

async function buildConnectionSettings(args: {
  config: TeamConfig
  teamUrl: string
  token: string
  deviceId: string
  deps: ActionDeps
}): Promise<TeamConnectionSettings> {
  return withResolvedDeviceName({
    connectionId: args.deps.createConnectionId(),
    teamUrl: args.teamUrl,
    teamName: args.config.teamName,
    reportingTimeZone: args.config.reportingTimeZone,
    teamFingerprint: args.config.teamFingerprint,
    tokenFingerprint: await args.deps.fingerprintDeveloperToken(args.token),
    deviceId: args.deviceId,
    deviceName: "Desktop",
    detectedDeviceName: null,
    deviceNameOverride: null,
    endpoints: args.config.endpoints,
    syncStatus: "never",
    lastContactAt: null,
    deviceStatus: null,
    lastError: null,
  }, args.deps)
}

async function saveTokenAndSettings(
  connection: TeamConnectionSettings,
  token: string,
  deps: ActionDeps
): Promise<TeamConnectionActionResult> {
  try {
    await deps.replaceTeamConnectionSettings(connection, token)
    return { ok: true, connection, message: "Team connection saved." }
  } catch (error) {
    return {
      ok: false,
      code: "credential-error",
      message: errorMessage(error, "Failed to save team credentials."),
      connection: await deps.loadTeamConnectionSettings(),
    }
  }
}

async function checkInConnection(
  connection: TeamConnectionSettings,
  token: string,
  deps: ActionDeps
): Promise<TeamConnectionCheckInResult> {
  const [os, appVersion, detectedDeviceName] = await Promise.all([
    deps.getDesktopPlatform(),
    deps.getAppVersion(),
    readDetectedDeviceName(deps),
  ])
  const deviceName = resolveDeviceName({
    override: connection.deviceNameOverride,
    detected: detectedDeviceName,
    os,
  })

  const result = await deps.checkInTeamDevice({
    teamUrl: connection.teamUrl,
    endpoints: connection.endpoints,
    token,
    deviceId: connection.deviceId,
    deviceName,
    os,
    appVersion,
  })

  if (!result.ok) {
    if (isInvalidTokenError(result.code)) {
      if (!await deps.clearTeamConnectionSettings(connection)) return connectionChanged(deps)
      return {
        ok: false,
        code: result.code,
        message: result.message,
        connection: null,
      }
    }

    const failed = markConnectionError(connection, result.message)
    if (!await deps.saveTeamConnectionSettings(failed)) return connectionChanged(deps)
    return {
      ok: false,
      code: result.code,
      message: result.message,
      connection: failed,
    }
  }

  const updated: TeamConnectionSettings = {
    ...connection,
    reportingTimeZone:
      result.value.team?.reportingTimeZone ?? connection.reportingTimeZone,
    teamFingerprint:
      result.value.team?.teamFingerprint ?? connection.teamFingerprint,
    deviceName: normalizeDeviceName(result.value.device.deviceName) ?? deviceName,
    detectedDeviceName,
    syncStatus: "connected",
    lastContactAt: deps.nowIso(),
    deviceStatus: result.value.device.status,
    lastError: null,
  }
  if (!await deps.saveTeamConnectionSettings(updated)) return connectionChanged(deps)
  return {
    ok: true,
    connection: updated,
    message: "Device checked in.",
  }
}

async function withResolvedDeviceName(
  connection: TeamConnectionSettings,
  deps: ActionDeps
): Promise<TeamConnectionSettings> {
  const [os, detectedDeviceName] = await Promise.all([
    deps.getDesktopPlatform(),
    readDetectedDeviceName(deps),
  ])
  return {
    ...connection,
    detectedDeviceName,
    deviceName: resolveDeviceName({
      override: connection.deviceNameOverride,
      detected: detectedDeviceName,
      os,
    }),
  }
}

async function readDetectedDeviceName(deps: ActionDeps): Promise<string | null> {
  try {
    return normalizeDeviceName(await deps.getDetectedDeviceName())
  } catch (error) {
    console.error("Failed to detect device name:", error)
    return null
  }
}

async function connectionChanged(deps: ActionDeps): Promise<Extract<TeamConnectionActionResult, { ok: false }>> {
  return {
    ok: false,
    code: "settings-error",
    message: "Team connection changed. Try again.",
    connection: await deps.loadTeamConnectionSettings(),
  }
}

async function readStoredToken(deps: ActionDeps, connection: TeamConnectionSettings | null):
  Promise<{ ok: true; value: string | null } | { ok: false; message: string }> {
  try {
    const token = await deps.readTeamToken()
    if (token && connection && await deps.fingerprintDeveloperToken(token) !== connection.tokenFingerprint) {
      return { ok: false, message: "Team credentials do not match the saved connection. Paste a connection string again." }
    }
    return { ok: true, value: token }
  } catch (error) {
    return {
      ok: false,
      message: errorMessage(error, "Failed to read team credentials."),
    }
  }
}

function markConnectionError(
  connection: TeamConnectionSettings,
  message: string
): TeamConnectionSettings {
  return {
    ...connection,
    syncStatus: "error",
    lastError: message,
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
