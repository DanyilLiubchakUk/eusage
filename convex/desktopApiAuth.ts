import {
  type DeveloperRecord,
  type DeveloperTeamRecord,
  type DeveloperTokenRecord,
} from "./developerTokens"
import { reportingTimeZoneOrDefault } from "./reportingTimeZone"
import { hashSecret } from "./tokenSecrets"

export type DesktopOrganizationRecord = {
  clerkOrganizationId: string
  teamId: string
}

export type PublicTeamConfigResult =
  | {
      ok: true
      team: PublicDesktopTeamMetadata
    }
  | DesktopApiError

export type PublicDesktopTeamMetadata = {
  name: string
  organizationName: string
  reportingTimeZone: string
  teamFingerprint: string
  organizationFingerprint: string
}

export type DesktopApiErrorCode =
  | "setup-state-invalid"
  | "missing-bearer-auth"
  | "invalid-token"
  | "revoked-token"
  | "inactive-developer"
  | "invalid-json"
  | "invalid-body"
  | "upload-schema-version-required"
  | "unsupported-upload-schema-version"
  | "usage-providers-required"
  | "device-id-required"
  | "device-os-required"
  | "device-app-version-required"
  | "device-not-found"
  | "device-owner-conflict"

export type DesktopApiError = {
  ok: false
  status: "error"
  code: DesktopApiErrorCode
  message: string
}

export type DesktopAuthResult =
  | {
      ok: true
      team: DeveloperTeamRecord
      organization: DesktopOrganizationRecord
      developer: DeveloperRecord
      token: DeveloperTokenRecord
    }
  | DesktopApiError

export type DesktopApiAuthStore = {
  getTeam: () => Promise<DeveloperTeamRecord | null>
  getTeamById: (teamId: string) => Promise<DeveloperTeamRecord | null>
  getOrganizationByTeamId: (teamId: string) => Promise<DesktopOrganizationRecord | null>
  getTokenByHash: (tokenHash: string) => Promise<DeveloperTokenRecord | null>
  getDeveloper: (developerId: string) => Promise<DeveloperRecord | null>
}

export async function getPublicTeamConfig(args: {
  tokenHash?: string | null
  store: Pick<
    DesktopApiAuthStore,
    "getTeam" | "getTeamById" | "getOrganizationByTeamId" | "getTokenByHash" | "getDeveloper"
  >
}): Promise<PublicTeamConfigResult> {
  const tokenHash = args.tokenHash?.trim()
  if (tokenHash) {
    const auth = await authenticateDesktopTokenHash({ tokenHash, store: args.store })
    if (!auth.ok) return auth
    return { ok: true, team: await publicDesktopTeamMetadata(auth.team) }
  }

  const team = await args.store.getTeam()
  if (!team) {
    return desktopError("setup-state-invalid", "Team setup is not complete.")
  }

  return { ok: true, team: await publicDesktopTeamMetadata(team) }
}

export async function authenticateDesktopTokenHash(args: {
  tokenHash: string | null
  store: Pick<
    DesktopApiAuthStore,
    "getTeamById" | "getOrganizationByTeamId" | "getTokenByHash" | "getDeveloper"
  >
}): Promise<DesktopAuthResult> {
  const tokenHash = args.tokenHash?.trim()
  if (!tokenHash) {
    return desktopError(
      "missing-bearer-auth",
      "Authorization bearer token is required."
    )
  }

  const token = await args.store.getTokenByHash(tokenHash)
  if (!token) {
    return desktopError("invalid-token", "Developer token is invalid.")
  }

  const team = await args.store.getTeamById(token.teamId)
  if (!team || token.teamId !== team._id) {
    return desktopError("invalid-token", "Developer token is invalid.")
  }

  const organization = await args.store.getOrganizationByTeamId(team._id)
  if (!organization || organization.teamId !== team._id) {
    return desktopError(
      "setup-state-invalid",
      "Developer token is not connected to an Organization."
    )
  }

  if (token.status !== "active") {
    return desktopError("revoked-token", "Developer token is revoked.")
  }

  const developer = await args.store.getDeveloper(token.developerId)
  if (!developer || developer.teamId !== team._id) {
    return desktopError("invalid-token", "Developer token is invalid.")
  }

  if (developer.status !== "active") {
    return desktopError("inactive-developer", "Developer is inactive.")
  }

  return { ok: true, team, organization, developer, token }
}

export async function publicDesktopTeamMetadata(
  team: DeveloperTeamRecord
): Promise<PublicDesktopTeamMetadata> {
  const fingerprint = await teamFingerprint(team._id)
  return {
    name: team.name,
    organizationName: team.name,
    reportingTimeZone: reportingTimeZoneOrDefault(team.reportingTimeZone),
    teamFingerprint: fingerprint,
    organizationFingerprint: fingerprint,
  }
}

export async function teamFingerprint(teamId: string) {
  return hashSecret(["eusage-team-fingerprint:v1", teamId].join("\0"))
}

export function desktopError(
  code: DesktopApiErrorCode,
  message: string
): DesktopApiError {
  return {
    ok: false,
    status: "error",
    code,
    message,
  }
}
