import packageJson from "../../../../package.json"
import { hashDeveloperToken } from "../../../../convex/developerTokens"
import type { DesktopApiError } from "../../../../convex/desktopApi"

export const DESKTOP_API_VERSION = "v1"

export const DESKTOP_API_ENDPOINTS = {
  teamConfig: "/api/v1/team-config",
  deviceCheckIn: "/api/v1/device/check-in",
  usageBatch: "/api/v1/usage/batch",
  deviceDisconnect: "/api/v1/device/disconnect",
  providerAccountUpdate: "/api/v1/provider-account/update",
}

export const DESKTOP_API_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
}

type TeamConfigInput = {
  teamName: string
  reportingTimeZone: string
  teamFingerprint: string
}

export function buildTeamConfigResponse(input: TeamConfigInput) {
  return {
    teamName: input.teamName,
    reportingTimeZone: input.reportingTimeZone,
    teamFingerprint: input.teamFingerprint,
    appVersion: packageJson.version,
    apiVersion: DESKTOP_API_VERSION,
    endpoints: DESKTOP_API_ENDPOINTS,
  }
}

export async function getBearerTokenHash(headers: Headers) {
  const rawToken = getBearerToken(headers)
  if (!rawToken) {
    return {
      ok: false as const,
      status: "error" as const,
      code: "missing-bearer-auth" as const,
      message: "Authorization bearer token is required.",
    }
  }

  return {
    ok: true as const,
    tokenHash: await hashDeveloperToken(rawToken),
  }
}

export function getBearerToken(headers: Headers) {
  const authorization = headers.get("authorization")?.trim()
  if (!authorization) return null

  const [scheme, token, extra] = authorization.split(/\s+/)
  if (scheme !== "Bearer" || !token || extra) return null

  return token
}

export function apiJsonError(
  error: DesktopApiError,
  status = statusForDesktopApiError(error.code)
) {
  return desktopApiJson(
    {
      ok: false,
      status: "error",
      code: error.code,
      message: error.message,
    },
    { status }
  )
}

export function desktopApiJson(body: unknown, init?: ResponseInit) {
  return Response.json(body, withDesktopApiHeaders(init))
}

export function desktopApiOptions() {
  return new Response(null, withDesktopApiHeaders({ status: 204 }))
}

function withDesktopApiHeaders(init: ResponseInit = {}): ResponseInit {
  return {
    ...init,
    headers: {
      ...DESKTOP_API_CORS_HEADERS,
      ...Object.fromEntries(new Headers(init.headers)),
    },
  }
}

export async function readJsonObject(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return {
      ok: false as const,
      status: "error" as const,
      code: "invalid-json" as const,
      message: "Request body must be valid JSON.",
    }
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false as const,
      status: "error" as const,
      code: "invalid-body" as const,
      message: "Request body must be a JSON object.",
    }
  }

  return {
    ok: true as const,
    body: body as Record<string, unknown>,
  }
}

export function stringField(body: Record<string, unknown>, field: string) {
  const value = body[field]
  return typeof value === "string" ? value : ""
}

export function optionalStringField(body: Record<string, unknown>, field: string) {
  const value = body[field]
  return typeof value === "string" ? value : undefined
}

export function statusForDesktopApiError(code: DesktopApiError["code"]) {
  switch (code) {
    case "missing-bearer-auth":
    case "invalid-token":
    case "revoked-token":
    case "inactive-developer":
      return 401
    case "device-id-required":
    case "device-os-required":
    case "device-app-version-required":
    case "upload-schema-version-required":
    case "unsupported-upload-schema-version":
    case "usage-providers-required":
    case "invalid-json":
    case "invalid-body":
      return 400
    case "device-not-found":
      return 404
    case "setup-state-invalid":
      return 503
  }
}
