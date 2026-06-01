export type DeveloperStatus = "active" | "inactive"
export type DeveloperTokenStatus = "active" | "revoked"

export type DeveloperMetadata = {
  notes?: string
}

export type DeveloperTeamRecord = {
  _id: string
  name: string
  slug: string
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
  | "token-label-required"

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

  const tokenLabel = args.input.tokenLabel.trim()
  if (!tokenLabel) {
    return createError("token-label-required", "Token label is required.")
  }

  const developer: NewDeveloperRecord = {
    teamId: team._id,
    displayName,
    status: "active",
    createdAt: args.now,
    updatedAt: args.now,
  }

  const email = trimOptional(args.input.email)
  if (email) developer.email = email

  const metadataNotes = trimOptional(args.input.metadataNotes)
  if (metadataNotes) developer.metadata = { notes: metadataNotes }

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
  return `eusage_dev_${bytesToBase64Url(bytes)}`
}

export async function hashDeveloperToken(rawToken: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(rawToken)
  )

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}

export function fingerprintDeveloperTokenHash(tokenHash: string) {
  return `${tokenHash.slice(0, 8)}...${tokenHash.slice(-8)}`
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

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
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
