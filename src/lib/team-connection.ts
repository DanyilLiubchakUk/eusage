export type ParsedTeamConnectionString = {
  teamUrl: string
  token: string
}

export type TeamConnectionParseResult =
  | { ok: true; value: ParsedTeamConnectionString }
  | { ok: false; code: TeamConnectionErrorCode; message: string }

export type TeamConnectionErrorCode =
  | "connection-string-required"
  | "connection-string-invalid"
  | "connection-string-scheme-invalid"
  | "connection-string-action-invalid"
  | "connection-url-required"
  | "connection-token-required"
  | "connection-token-invalid"
  | "connection-url-invalid"
  | "connection-url-unsafe"
  | "team-config-invalid"
  | "network-error"
  | "invalid-json"
  | "missing-bearer-auth"
  | "invalid-token"
  | "revoked-token"
  | "inactive-developer"
  | "device-id-required"
  | "device-os-required"
  | "device-app-version-required"
  | "device-not-found"
  | "setup-state-invalid"
  | "credential-error"
  | "settings-error"

export function parseTeamConnectionString(input: string): TeamConnectionParseResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return error("connection-string-required", "Connection string is required.")
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return error("connection-string-invalid", "Connection string is invalid.")
  }

  if (parsed.protocol !== "eusage:") {
    return error(
      "connection-string-scheme-invalid",
      "Connection string must start with eusage://connect."
    )
  }

  if (parsed.hostname !== "connect") {
    return error(
      "connection-string-action-invalid",
      "Connection string must use eusage://connect."
    )
  }

  const rawTeamUrl = parsed.searchParams.get("url")?.trim() ?? ""
  if (!rawTeamUrl) {
    return error("connection-url-required", "Team URL is required.")
  }

  const token = parsed.searchParams.get("token")?.trim() ?? ""
  if (!token) {
    return error("connection-token-required", "Developer token is required.")
  }

  if (!token.startsWith("eusage_dev_")) {
    return error("connection-token-invalid", "Developer token is invalid.")
  }

  const teamUrl = normalizeTeamUrl(rawTeamUrl)
  if (!teamUrl.ok) return teamUrl

  return {
    ok: true,
    value: {
      teamUrl: teamUrl.value,
      token,
    },
  }
}

export function normalizeTeamUrl(input: string):
  | { ok: true; value: string }
  | { ok: false; code: TeamConnectionErrorCode; message: string } {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return error("connection-url-invalid", "Team URL is invalid.")
  }

  if (url.username || url.password) {
    return error("connection-url-unsafe", "Team URL must not include credentials.")
  }

  if (url.protocol === "https:") {
    return { ok: true, value: url.origin }
  }

  if (url.protocol === "http:" && isLoopbackHost(url.hostname)) {
    return { ok: true, value: url.origin }
  }

  return error(
    "connection-url-unsafe",
    "Team URL must use HTTPS, except localhost development."
  )
}

export async function fingerprintDeveloperToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  )
  const hash = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`
}

export function isInvalidTokenError(code: TeamConnectionErrorCode): boolean {
  return code === "invalid-token" || code === "revoked-token" || code === "inactive-developer"
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
}

function error(
  code: TeamConnectionErrorCode,
  message: string
): Extract<TeamConnectionParseResult, { ok: false }> {
  return { ok: false, code, message }
}
