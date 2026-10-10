import { invoke } from "@tauri-apps/api/core"
import { normalizeDeviceName } from "@/lib/team-device-name"

export type TeamDeviceStatus = "connected" | "stale" | "disconnected" | "archived"

export type TeamSyncStatus = "never" | "connected" | "error" | "invalid"

export type TeamApiEndpoints = {
  teamConfig: string
  deviceCheckIn: string
  usageBatch: string
  deviceDisconnect: string
  providerAccountUpdate: string
}

export type TeamConnectionSettings = {
  connectionId?: string | null
  teamUrl: string
  teamName: string
  reportingTimeZone: string
  teamFingerprint: string
  tokenFingerprint: string
  deviceId: string
  deviceName: string
  detectedDeviceName: string | null
  deviceNameOverride: string | null
  endpoints: TeamApiEndpoints
  syncStatus: TeamSyncStatus
  lastContactAt: string | null
  deviceStatus: TeamDeviceStatus | null
  lastError: string | null
}

const DEFAULT_PROVIDER_ACCOUNT_UPDATE_ENDPOINT = "/api/v1/provider-account/update"

export function readTeamSettings(): Promise<{
  teamConnection?: TeamConnectionSettings | null
  teamDeviceId?: unknown
  providerAccountSharing?: unknown
}> {
  return invoke("read_team_settings")
}

export async function loadTeamConnectionSettings(): Promise<TeamConnectionSettings | null> {
  return normalizeTeamConnectionSettings((await readTeamSettings()).teamConnection)
}

export async function loadTeamDeviceId(): Promise<string | null> {
  const deviceId = stringField((await readTeamSettings()).teamDeviceId).trim()
  return deviceId || null
}

export async function saveTeamConnectionSettings(
  settings: TeamConnectionSettings
): Promise<boolean> {
  return invoke("update_team_connection", {
    settings,
    expectedConnectionId: settings.connectionId ?? null,
  })
}

export async function replaceTeamConnectionSettings(
  settings: TeamConnectionSettings,
  token: string
): Promise<void> {
  await invoke("replace_team_connection", { settings, token })
}

export async function clearTeamConnectionSettings(
  expected: TeamConnectionSettings
): Promise<boolean> {
  return invoke("clear_team_connection", {
    expectedConnectionId: expected.connectionId ?? null,
  })
}

export function normalizeTeamConnectionSettings(
  value: unknown
): TeamConnectionSettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>

  const teamUrl = stringField(row.teamUrl)
  const teamName = stringField(row.teamName)
  const reportingTimeZone = normalizeReportingTimeZone(row.reportingTimeZone)
  const teamFingerprint = stringField(row.teamFingerprint)
  const tokenFingerprint = stringField(row.tokenFingerprint)
  const deviceId = stringField(row.deviceId)
  const detectedDeviceName = normalizeDeviceName(row.detectedDeviceName)
  const deviceNameOverride = normalizeDeviceName(row.deviceNameOverride)
  const deviceName =
    normalizeDeviceName(row.deviceName) ??
    deviceNameOverride ??
    detectedDeviceName ??
    "Desktop"
  const endpoints = normalizeTeamApiEndpoints(row.endpoints)
  if (!teamUrl || !teamName || !reportingTimeZone || !tokenFingerprint || !deviceId || !endpoints) return null

  return {
    ...(row.connectionId !== undefined ? { connectionId: nullableStringField(row.connectionId) } : {}),
    teamUrl,
    teamName,
    reportingTimeZone,
    teamFingerprint,
    tokenFingerprint,
    deviceId,
    deviceName,
    detectedDeviceName,
    deviceNameOverride,
    endpoints,
    syncStatus: normalizeSyncStatus(row.syncStatus),
    lastContactAt: nullableStringField(row.lastContactAt),
    deviceStatus: normalizeDeviceStatus(row.deviceStatus),
    lastError: nullableStringField(row.lastError),
  }
}

function normalizeTeamApiEndpoints(value: unknown): TeamApiEndpoints | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const endpoints = {
    teamConfig: stringField(row.teamConfig),
    deviceCheckIn: stringField(row.deviceCheckIn),
    usageBatch: stringField(row.usageBatch),
    deviceDisconnect: stringField(row.deviceDisconnect),
    providerAccountUpdate:
      stringField(row.providerAccountUpdate) || DEFAULT_PROVIDER_ACCOUNT_UPDATE_ENDPOINT,
  }
  return Object.values(endpoints).every((path) => path.startsWith("/"))
    ? endpoints
    : null
}

function normalizeSyncStatus(value: unknown): TeamSyncStatus {
  if (
    value === "never" ||
    value === "connected" ||
    value === "error" ||
    value === "invalid"
  ) {
    return value
  }
  return "never"
}

function normalizeDeviceStatus(value: unknown): TeamDeviceStatus | null {
  if (
    value === "connected" ||
    value === "stale" ||
    value === "disconnected" ||
    value === "archived"
  ) {
    return value
  }
  return null
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function nullableStringField(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function normalizeReportingTimeZone(value: unknown): string | null {
  if (value === undefined) return "UTC"
  if (typeof value !== "string") return null
  const reportingTimeZone = value.trim()
  if (!reportingTimeZone) return null
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: reportingTimeZone })
    return reportingTimeZone
  } catch {
    return null
  }
}
