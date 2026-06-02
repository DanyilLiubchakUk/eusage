import { getVersion } from "@tauri-apps/api/app"
import { invoke } from "@tauri-apps/api/core"
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
  loadTeamConnectionSettings,
  saveTeamConnectionSettings,
  type TeamConnectionSettings,
} from "@/lib/team-settings"
import {
  deleteTeamToken,
  readTeamToken,
  saveTeamToken,
} from "@/lib/team-credentials"

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
  saveTeamToken: typeof saveTeamToken
  readTeamToken: typeof readTeamToken
  deleteTeamToken: typeof deleteTeamToken
  loadTeamConnectionSettings: typeof loadTeamConnectionSettings
  saveTeamConnectionSettings: typeof saveTeamConnectionSettings
  clearTeamConnectionSettings: typeof clearTeamConnectionSettings
  createDeviceId: () => string
  getDesktopPlatform: () => Promise<string>
  getAppVersion: () => Promise<string>
  nowIso: () => string
}

const defaultDeps: ActionDeps = {
  fetchTeamConfig,
  checkInTeamDevice,
  disconnectTeamDevice,
  fingerprintDeveloperToken,
  saveTeamToken,
  readTeamToken,
  deleteTeamToken,
  loadTeamConnectionSettings,
  saveTeamConnectionSettings,
  clearTeamConnectionSettings,
  createDeviceId: () => crypto.randomUUID(),
  getDesktopPlatform: () => invoke<string>("get_desktop_platform"),
  getAppVersion: () => getVersion(),
  nowIso: () => new Date().toISOString(),
}

export async function loadTeamConnection(
  deps: Partial<ActionDeps> = {}
): Promise<TeamConnectionLoadResult> {
  const resolved = { ...defaultDeps, ...deps }
  const connection = await resolved.loadTeamConnectionSettings()
  if (!connection) {
    return { status: "disconnected", connection: null, message: null }
  }

  const token = await readStoredToken(resolved)
  if (!token.ok) {
    return {
      status: "error",
      connection: markConnectionError(connection, token.message),
      message: token.message,
    }
  }

  if (!token.value) {
    await resolved.clearTeamConnectionSettings()
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

export async function connectTeam(
  connectionString: string,
  deps: Partial<ActionDeps> = {}
): Promise<TeamConnectionActionResult> {
  const resolved = { ...defaultDeps, ...deps }
  const parsed = parseTeamConnectionString(connectionString)
  if (!parsed.ok) return { ...parsed, connection: null }

  const config = await resolved.fetchTeamConfig(parsed.value.teamUrl)
  if (!config.ok) return { ...config, connection: null }

  const existing = await resolved.loadTeamConnectionSettings()
  const connection = await buildConnectionSettings({
    config: config.value,
    teamUrl: parsed.value.teamUrl,
    token: parsed.value.token,
    deviceId: existing?.deviceId ?? resolved.createDeviceId(),
    deps: resolved,
  })

  const saved = await saveTokenAndSettings(connection, parsed.value.token, resolved)
  if (!saved.ok) return saved

  return checkInConnection(connection, parsed.value.token, resolved)
}

export async function refreshTeamCheckIn(
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

  const token = await readStoredToken(resolved)
  if (!token.ok) {
    return {
      ok: false,
      code: "credential-error",
      message: token.message,
      connection,
    }
  }
  if (!token.value) {
    await resolved.clearTeamConnectionSettings()
    return {
      ok: false,
      code: "credential-error",
      message: "Team token is missing. Paste a connection string again.",
      connection: null,
    }
  }

  return checkInConnection(connection, token.value, resolved)
}

export async function disconnectTeam(
  deps: Partial<ActionDeps> = {}
): Promise<TeamConnectionActionResult> {
  const resolved = { ...defaultDeps, ...deps }
  const connection = await resolved.loadTeamConnectionSettings()
  const token = await readStoredToken(resolved)
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
    await resolved.deleteTeamToken()
    await resolved.clearTeamConnectionSettings()
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

async function buildConnectionSettings(args: {
  config: TeamConfig
  teamUrl: string
  token: string
  deviceId: string
  deps: ActionDeps
}): Promise<TeamConnectionSettings> {
  return {
    teamUrl: args.teamUrl,
    teamName: args.config.teamName,
    tokenFingerprint: await args.deps.fingerprintDeveloperToken(args.token),
    deviceId: args.deviceId,
    endpoints: args.config.endpoints,
    syncStatus: "never",
    lastContactAt: null,
    deviceStatus: null,
    lastError: null,
  }
}

async function saveTokenAndSettings(
  connection: TeamConnectionSettings,
  token: string,
  deps: ActionDeps
): Promise<TeamConnectionActionResult> {
  try {
    await deps.saveTeamToken(token)
    await deps.saveTeamConnectionSettings(connection)
    return { ok: true, connection, message: "Team connection saved." }
  } catch (error) {
    await cleanupTeamConnection(deps)
    return {
      ok: false,
      code: "credential-error",
      message: errorMessage(error, "Failed to save team credentials."),
      connection: null,
    }
  }
}

async function checkInConnection(
  connection: TeamConnectionSettings,
  token: string,
  deps: ActionDeps
): Promise<TeamConnectionCheckInResult> {
  const [os, appVersion] = await Promise.all([
    deps.getDesktopPlatform(),
    deps.getAppVersion(),
  ])

  const result = await deps.checkInTeamDevice({
    teamUrl: connection.teamUrl,
    endpoints: connection.endpoints,
    token,
    deviceId: connection.deviceId,
    os,
    appVersion,
  })

  if (!result.ok) {
    if (isInvalidTokenError(result.code)) {
      await cleanupTeamConnection(deps)
      return {
        ok: false,
        code: result.code,
        message: result.message,
        connection: null,
      }
    }

    const failed = markConnectionError(connection, result.message)
    await deps.saveTeamConnectionSettings(failed)
    return {
      ok: false,
      code: result.code,
      message: result.message,
      connection: failed,
    }
  }

  const updated: TeamConnectionSettings = {
    ...connection,
    syncStatus: "connected",
    lastContactAt: deps.nowIso(),
    deviceStatus: result.value.device.status,
    lastError: null,
  }
  await deps.saveTeamConnectionSettings(updated)
  return {
    ok: true,
    connection: updated,
    message: "Device checked in.",
  }
}

async function cleanupTeamConnection(deps: ActionDeps) {
  await Promise.allSettled([
    deps.deleteTeamToken(),
    deps.clearTeamConnectionSettings(),
  ])
}

async function readStoredToken(deps: ActionDeps):
  Promise<{ ok: true; value: string | null } | { ok: false; message: string }> {
  try {
    return { ok: true, value: await deps.readTeamToken() }
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
