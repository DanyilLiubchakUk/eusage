import { fingerprintSecretHash, generateSecret, hashSecret } from "./tokenSecrets"

export type DeveloperStatus = "active" | "inactive"
export type DeveloperTokenStatus = "active" | "revoked"

export type DeveloperMetadata = {
  notes?: string
}

export type DeveloperTeamRecord = {
  _id: string
  name: string
  slug: string
  reportingTimeZone?: string
}

export type DeveloperOwnerRecord = {
  teamId: string
  clerkUserId: string
  role: "owner"
}

export type DeveloperRecord = {
  _id: string
  teamId: string
  displayName: string
  email?: string
  status: DeveloperStatus
  metadata?: DeveloperMetadata
  createdAt: number
  updatedAt: number
  lastSeenAt?: number
}

export type DeveloperTokenRecord = {
  _id: string
  teamId: string
  developerId: string
  tokenHash: string
  fingerprint: string
  label: string
  status: DeveloperTokenStatus
  createdAt: number
  rotatedAt?: number
  revokedAt?: number
  lastUsedAt?: number
}

export type NewDeveloperRecord = Omit<DeveloperRecord, "_id">
export type NewDeveloperTokenRecord = Omit<DeveloperTokenRecord, "_id">
export const DEVELOPER_NAME_MAX_LENGTH = 80
export const DEVELOPER_EMAIL_MAX_LENGTH = 254
export const DEVELOPER_METADATA_NOTES_MAX_LENGTH = 500
export const DEVELOPER_TOKEN_LABEL_MAX_LENGTH = 16
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type PublicDeveloperRow = {
  id: string
  displayName: string
  email: string | null
  status: DeveloperStatus
  metadata: DeveloperMetadata | null
  createdAt: number
  updatedAt: number
  lastSeenAt: number | null
  token: {
    fingerprint: string
    label: string
    status: DeveloperTokenStatus
    createdAt: number
    rotatedAt: number | null
    revokedAt: number | null
    lastUsedAt: number | null
  } | null
}

export type CreateDeveloperInput = {
  displayName: string
  email?: string
  tokenLabel: string
  metadataNotes?: string
}

export type CreateDeveloperErrorCode =
  | "not-authenticated"
  | "not-owner"
  | "setup-state-invalid"
  | "developer-name-required"
  | "developer-name-too-long"
  | "developer-email-too-long"
  | "developer-email-invalid"
  | "developer-metadata-too-long"
  | "token-label-required"
  | "token-label-too-long"

export type CreateDeveloperResult =
  | {
      ok: true
      message: string
      developer: PublicDeveloperRow
      rawToken: string
    }
  | {
      ok: false
      status: "error"
      code: CreateDeveloperErrorCode
      message: string
    }

export type CreateDeveloperStore = {
  getTeam: () => Promise<DeveloperTeamRecord | null>
  getOwner: () => Promise<DeveloperOwnerRecord | null>
  createDeveloper: (developer: NewDeveloperRecord) => Promise<DeveloperRecord>
  createToken: (token: NewDeveloperTokenRecord) => Promise<DeveloperTokenRecord>
}

export async function createDeveloperWithToken(args: {
  input: CreateDeveloperInput
  identity: { clerkUserId: string } | null
  now: number
  rawToken?: string
  store: CreateDeveloperStore
}): Promise<CreateDeveloperResult> {
  if (!args.identity) {
    return createError("not-authenticated", "Sign in with Clerk before creating developers.")
  }

  const team = await args.store.getTeam()
  const owner = await args.store.getOwner()

  if (!team || !owner || owner.teamId !== team._id) {
    return createError(
      "setup-state-invalid",
      "Setup must be complete before creating developers."
    )
  }

  if (owner.clerkUserId !== args.identity.clerkUserId) {
    return createError("not-owner", "Only the setup owner can create developers.")
  }

  const displayName = args.input.displayName.trim()
  if (!displayName) {
    return createError("developer-name-required", "Developer name is required.")
  }
  if (displayName.length > DEVELOPER_NAME_MAX_LENGTH) {
    return createError("developer-name-too-long", "Use 80 characters or fewer.")
  }

  const tokenLabel = args.input.tokenLabel.trim()
  if (!tokenLabel) {
    return createError("token-label-required", "Token label is required.")
  }
  if (tokenLabel.length > DEVELOPER_TOKEN_LABEL_MAX_LENGTH) {
    return createError("token-label-too-long", "Use 16 characters or fewer.")
  }

  const developer: NewDeveloperRecord = {
    teamId: team._id,
    displayName,
    status: "active",
    createdAt: args.now,
    updatedAt: args.now,
  }

  const email = trimOptional(args.input.email)
  if (email) {
    if (email.length > DEVELOPER_EMAIL_MAX_LENGTH) {
      return createError("developer-email-too-long", "Use 254 characters or fewer.")
    }
    if (!emailPattern.test(email)) {
      return createError("developer-email-invalid", "Enter a valid email address.")
    }
    developer.email = email
  }

  const metadataNotes = trimOptional(args.input.metadataNotes)
  if (metadataNotes) {
    if (metadataNotes.length > DEVELOPER_METADATA_NOTES_MAX_LENGTH) {
      return createError("developer-metadata-too-long", "Use 500 characters or fewer.")
    }
    developer.metadata = { notes: metadataNotes }
  }

  const createdDeveloper = await args.store.createDeveloper(developer)
  const rawToken = args.rawToken ?? generateDeveloperToken()
  const tokenHash = await hashDeveloperToken(rawToken)
  const token = await args.store.createToken({
    teamId: team._id,
    developerId: createdDeveloper._id,
    tokenHash,
    fingerprint: fingerprintDeveloperTokenHash(tokenHash),
    label: tokenLabel,
    status: "active",
    createdAt: args.now,
  })

  return {
    ok: true,
    message: "Developer created.",
    developer: publicDeveloperRow(createdDeveloper, token),
    rawToken,
  }
}

export function generateDeveloperToken(bytes = randomBytes(32)) {
  return generateSecret("eusage_dev", bytes)
}

export async function hashDeveloperToken(rawToken: string) {
  return hashSecret(rawToken)
}

export function fingerprintDeveloperTokenHash(tokenHash: string) {
  return fingerprintSecretHash(tokenHash)
}

export function buildDeveloperConnectionString(args: {
  teamUrl: string
  rawToken: string
}) {
  const teamUrl = args.teamUrl.trim().replace(/\/+$/g, "")
  return `eusage://connect?url=${teamUrl}&token=${args.rawToken}`
}

export function publicDeveloperRow(
  developer: DeveloperRecord,
  token: DeveloperTokenRecord | null
): PublicDeveloperRow {
  return {
    id: developer._id,
    displayName: developer.displayName,
    email: developer.email ?? null,
    status: developer.status,
    metadata: developer.metadata ?? null,
    createdAt: developer.createdAt,
    updatedAt: developer.updatedAt,
    lastSeenAt: developer.lastSeenAt ?? null,
    token: token
      ? {
          fingerprint: token.fingerprint,
          label: token.label,
          status: token.status,
          createdAt: token.createdAt,
          rotatedAt: token.rotatedAt ?? null,
          revokedAt: token.revokedAt ?? null,
          lastUsedAt: token.lastUsedAt ?? null,
        }
      : null,
  }
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length)
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Math.floor(Math.random() * 256)
  }
  return bytes
}

function trimOptional(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function createError(
  code: CreateDeveloperErrorCode,
  message: string
): CreateDeveloperResult {
  return {
    ok: false,
    status: "error",
    code,
    message,
  }
}
