import { LazyStore } from "@tauri-apps/plugin-store"
import { normalizeDeviceName } from "@/lib/team-device-name"

const SETTINGS_STORE_PATH = "settings.json"
const TEAM_CONNECTION_KEY = "teamConnection"

export type TeamDeviceStatus = "connected" | "stale" | "disconnected" | "archived"

export type TeamSyncStatus = "never" | "connected" | "error" | "invalid"

export type TeamApiEndpoints = {
  teamConfig: string
  deviceCheckIn: string
  usageBatch: string
  deviceDisconnect: string
}

export type TeamConnectionSettings = {
  teamUrl: string
  teamName: string
  reportingTimeZone: string
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

const store = new LazyStore(SETTINGS_STORE_PATH)

type StoreWithDelete = {
  delete?: (key: string) => Promise<void>
}

async function deleteStoreKey(key: string): Promise<void> {
  const maybeDelete = (store as unknown as StoreWithDelete).delete
  if (typeof maybeDelete === "function") {
    await maybeDelete.call(store, key)
    return
  }
  await store.set(key, null)
}

export async function loadTeamConnectionSettings(): Promise<TeamConnectionSettings | null> {
  const stored = await store.get<unknown>(TEAM_CONNECTION_KEY)
  return normalizeTeamConnectionSettings(stored)
}

export async function saveTeamConnectionSettings(
  settings: TeamConnectionSettings
): Promise<void> {
  await store.set(TEAM_CONNECTION_KEY, settings)
  await store.save()
}

export async function clearTeamConnectionSettings(): Promise<void> {
  await deleteStoreKey(TEAM_CONNECTION_KEY)
  await store.save()
}

export function normalizeTeamConnectionSettings(
  value: unknown
): TeamConnectionSettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>

  const teamUrl = stringField(row.teamUrl)
  const teamName = stringField(row.teamName)
  const reportingTimeZone = normalizeReportingTimeZone(row.reportingTimeZone)
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
    teamUrl,
    teamName,
    reportingTimeZone,
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
