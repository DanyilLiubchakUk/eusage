import type { TeamApiEndpoints, TeamDeviceStatus } from "@/lib/team-settings"
import type { TeamConnectionErrorCode } from "@/lib/team-connection"

export const DEFAULT_TEAM_API_ENDPOINTS: TeamApiEndpoints = {
  teamConfig: "/api/v1/team-config",
  deviceCheckIn: "/api/v1/device/check-in",
  usageBatch: "/api/v1/usage/batch",
  deviceDisconnect: "/api/v1/device/disconnect",
  providerAccountUpdate: "/api/v1/provider-account/update",
}

export type TeamConfig = {
  teamName: string
  reportingTimeZone: string
  teamFingerprint: string
  appVersion: string
  apiVersion: string
  endpoints: TeamApiEndpoints
}

export type TeamDevice = {
  deviceName: string
  status: TeamDeviceStatus
  lastSeenAt: number
  updatedAt: number
}

export type TeamResponseMetadata = {
  reportingTimeZone: string
  teamFingerprint: string
}

export type TeamApiResult<T> =
  | { ok: true; value: T }
  | {
      ok: false
      code: TeamConnectionErrorCode
      message: string
      statusCode: number | null
    }

export async function fetchTeamConfig(teamUrl: string): Promise<TeamApiResult<TeamConfig>> {
  const result = await requestJson(joinTeamUrl(teamUrl, DEFAULT_TEAM_API_ENDPOINTS.teamConfig))
  if (!result.ok) return result

  const config = normalizeTeamConfig(result.value)
  if (!config) {
    return apiError("team-config-invalid", "Team config response is invalid.")
  }
  return { ok: true, value: config }
}

export async function checkInTeamDevice(args: {
  teamUrl: string
  endpoints: TeamApiEndpoints
  token: string
  deviceId: string
  deviceName: string
  os: string
  appVersion: string
}): Promise<TeamApiResult<{ device: TeamDevice; team: TeamResponseMetadata | null }>> {
  const result = await requestJson(joinTeamUrl(args.teamUrl, args.endpoints.deviceCheckIn), {
    method: "POST",
    headers: bearerJsonHeaders(args.token),
    body: JSON.stringify({
      deviceId: args.deviceId,
      deviceName: args.deviceName,
      os: args.os,
      appVersion: args.appVersion,
    }),
  })
  return normalizeDeviceApiResult(result, "Device check-in response is invalid.")
}

export async function disconnectTeamDevice(args: {
  teamUrl: string
  endpoints: TeamApiEndpoints
  token: string
  deviceId: string
}): Promise<TeamApiResult<{ device: TeamDevice; team: TeamResponseMetadata | null }>> {
  const result = await requestJson(joinTeamUrl(args.teamUrl, args.endpoints.deviceDisconnect), {
    method: "POST",
    headers: bearerJsonHeaders(args.token),
    body: JSON.stringify({
      deviceId: args.deviceId,
    }),
  })
  return normalizeDeviceApiResult(result, "Device disconnect response is invalid.")
}

function normalizeDeviceApiResult(
  result: TeamApiResult<unknown>,
  invalidMessage: string
): TeamApiResult<{ device: TeamDevice; team: TeamResponseMetadata | null }> {
  if (!result.ok) return result

  const row = result.value as Record<string, unknown>
  const device = normalizeDevice(row.device)
  if (!device) return apiError("team-config-invalid", invalidMessage)
  return { ok: true, value: { device, team: normalizeTeamResponseMetadata(row.team) } }
}

async function requestJson(url: string, init?: RequestInit): Promise<TeamApiResult<unknown>> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch {
    return apiError("network-error", "Team deployment is unreachable.")
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return apiError(
      "invalid-json",
      "Team deployment returned invalid JSON.",
      response.status
    )
  }

  if (!response.ok) {
    const apiError = normalizeApiError(body)
    return {
      ok: false,
      code: apiError.code,
      message: apiError.message,
      statusCode: response.status,
    }
  }

  return { ok: true, value: body }
}

function normalizeTeamConfig(value: unknown): TeamConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const endpoints = normalizeEndpoints(row.endpoints)
  if (!endpoints) return null

  const teamName = stringField(row.teamName)
  const reportingTimeZone = normalizeReportingTimeZone(row.reportingTimeZone)
  const teamFingerprint = stringField(row.teamFingerprint)
  const appVersion = stringField(row.appVersion)
  const apiVersion = stringField(row.apiVersion)
  if (!teamName || !reportingTimeZone || !teamFingerprint || !appVersion || !apiVersion) return null

  return { teamName, reportingTimeZone, teamFingerprint, appVersion, apiVersion, endpoints }
}

function normalizeTeamResponseMetadata(value: unknown): TeamResponseMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const reportingTimeZone = normalizeReportingTimeZone(
    row.reportingTimeZone
  )
  const teamFingerprint = stringField(row.teamFingerprint)
  return reportingTimeZone && teamFingerprint
    ? { reportingTimeZone, teamFingerprint }
    : null
}

function normalizeEndpoints(value: unknown): TeamApiEndpoints | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const endpoints = {
    teamConfig: stringField(row.teamConfig),
    deviceCheckIn: stringField(row.deviceCheckIn),
    usageBatch: stringField(row.usageBatch),
    deviceDisconnect: stringField(row.deviceDisconnect),
    providerAccountUpdate:
      stringField(row.providerAccountUpdate) ||
      DEFAULT_TEAM_API_ENDPOINTS.providerAccountUpdate,
  }
  return Object.values(endpoints).every((path) => path.startsWith("/"))
    ? endpoints
    : null
}

function normalizeDevice(value: unknown): TeamDevice | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const status = row.status
  if (
    status !== "connected" &&
    status !== "stale" &&
    status !== "disconnected" &&
    status !== "archived"
  ) {
    return null
  }

  const lastSeenAt = numberField(row.lastSeenAt)
  const updatedAt = numberField(row.updatedAt)
  const deviceName = stringField(row.deviceName)
  return lastSeenAt === null || updatedAt === null
    ? null
    : { deviceName, status, lastSeenAt, updatedAt }
}

function normalizeApiError(value: unknown): {
  code: TeamConnectionErrorCode
  message: string
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { code: "network-error", message: "Team deployment request failed." }
  }

  const row = value as Record<string, unknown>
  const code = stringField(row.code)
  const message = stringField(row.message) || "Team deployment request failed."
  if (isKnownErrorCode(code)) return { code, message }
  return { code: "network-error", message }
}

function isKnownErrorCode(code: string): code is TeamConnectionErrorCode {
  return [
    "missing-bearer-auth",
    "invalid-token",
    "revoked-token",
    "inactive-developer",
    "device-id-required",
    "device-os-required",
    "device-app-version-required",
    "device-not-found",
    "setup-state-invalid",
  ].includes(code)
}

function bearerJsonHeaders(token: string) {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  }
}

function joinTeamUrl(teamUrl: string, path: string): string {
  return `${teamUrl.replace(/\/+$/g, "")}/${path.replace(/^\/+/g, "")}`
}

function apiError(
  code: TeamConnectionErrorCode,
  message: string,
  statusCode: number | null = null
): Extract<TeamApiResult<unknown>, { ok: false }> {
  return { ok: false, code, message, statusCode }
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function numberField(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
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
