import {
  fingerprintDeveloperTokenHash,
  generateDeveloperToken,
  hashDeveloperToken,
  publicDeveloperRow,
  type DeveloperOwnerRecord,
  type DeveloperRecord,
  type DeveloperTeamRecord,
  type DeveloperTokenRecord,
  type NewDeveloperTokenRecord,
  type PublicDeveloperRow,
} from "./developerTokens"

export type DeveloperTokenLifecycleErrorCode =
  | "not-authenticated"
  | "not-owner"
  | "setup-state-invalid"
  | "developer-not-found"
  | "developer-not-active"
  | "developer-not-inactive"
  | "active-token-required"
  | "token-label-required"

export type DeveloperTokenLifecycleResult =
  | {
      ok: true
      message: string
      developer: PublicDeveloperRow
      rawToken?: string
    }
  | {
      ok: false
      status: "error"
      code: DeveloperTokenLifecycleErrorCode
      message: string
    }

export type DeveloperTokenLifecycleStore = {
  getTeam: () => Promise<DeveloperTeamRecord | null>
  getOwner: () => Promise<DeveloperOwnerRecord | null>
  getDeveloper: (developerId: string) => Promise<DeveloperRecord | null>
  listActiveTokens: (developerId: string) => Promise<DeveloperTokenRecord[]>
  createToken: (token: NewDeveloperTokenRecord) => Promise<DeveloperTokenRecord>
  updateDeveloper: (
    developerId: string,
    patch: Pick<DeveloperRecord, "status" | "updatedAt">
  ) => Promise<DeveloperRecord>
  updateToken: (
    tokenId: string,
    patch: Pick<DeveloperTokenRecord, "status"> &
      Partial<Pick<DeveloperTokenRecord, "rotatedAt" | "revokedAt">>
  ) => Promise<DeveloperTokenRecord>
}

export async function rotateDeveloperToken(args: {
  developerId: string
  tokenLabel: string
  identity: { clerkUserId: string } | null
  now: number
  rawToken?: string
  store: DeveloperTokenLifecycleStore
}): Promise<DeveloperTokenLifecycleResult> {
  const owner = await requireOwner(args)
  if (!owner.ok) return owner

  const tokenLabel = args.tokenLabel.trim()
  if (!tokenLabel) {
    return lifecycleError("token-label-required", "Token label is required.")
  }

  const developer = await getTeamDeveloper(args.store, args.developerId, owner.team._id)
  if (!developer) {
    return lifecycleError("developer-not-found", "Developer was not found.")
  }
  if (developer.status !== "active") {
    return lifecycleError(
      "developer-not-active",
      "Only active developers can rotate tokens."
    )
  }

  const activeTokens = await args.store.listActiveTokens(developer._id)
  if (activeTokens.length === 0) {
    return lifecycleError(
      "active-token-required",
      "Developer has no active token to rotate."
    )
  }

  for (const token of activeTokens) {
    await args.store.updateToken(token._id, {
      status: "revoked",
      revokedAt: args.now,
    })
  }

  const rawToken = args.rawToken ?? generateDeveloperToken()
  const token = await createActiveToken({
    developer,
    teamId: owner.team._id,
    tokenLabel,
    rawToken,
    now: args.now,
    rotatedAt: args.now,
    store: args.store,
  })
  const updatedDeveloper = await args.store.updateDeveloper(developer._id, {
    status: "active",
    updatedAt: args.now,
  })

  return {
    ok: true,
    message: "Token rotated.",
    developer: publicDeveloperRow(updatedDeveloper, token),
    rawToken,
  }
}

export async function revokeDeveloperToken(args: {
  developerId: string
  identity: { clerkUserId: string } | null
  now: number
  store: DeveloperTokenLifecycleStore
}): Promise<DeveloperTokenLifecycleResult> {
  const owner = await requireOwner(args)
  if (!owner.ok) return owner

  const developer = await getTeamDeveloper(args.store, args.developerId, owner.team._id)
  if (!developer) {
    return lifecycleError("developer-not-found", "Developer was not found.")
  }
  if (developer.status !== "active") {
    return lifecycleError(
      "developer-not-active",
      "Only active developers can be revoked."
    )
  }

  const activeTokens = await args.store.listActiveTokens(developer._id)
  if (activeTokens.length === 0) {
    return lifecycleError(
      "active-token-required",
      "Developer has no active token to revoke."
    )
  }

  const revokedTokens = []
  for (const token of activeTokens) {
    revokedTokens.push(
      await args.store.updateToken(token._id, {
        status: "revoked",
        revokedAt: args.now,
      })
    )
  }
  const updatedDeveloper = await args.store.updateDeveloper(developer._id, {
    status: "inactive",
    updatedAt: args.now,
  })

  return {
    ok: true,
    message: "Token revoked. Developer is inactive.",
    developer: publicDeveloperRow(updatedDeveloper, latestToken(revokedTokens)),
  }
}

export async function reenableDeveloper(args: {
  developerId: string
  tokenLabel: string
  identity: { clerkUserId: string } | null
  now: number
  rawToken?: string
  store: DeveloperTokenLifecycleStore
}): Promise<DeveloperTokenLifecycleResult> {
  const owner = await requireOwner(args)
  if (!owner.ok) return owner

  const tokenLabel = args.tokenLabel.trim()
  if (!tokenLabel) {
    return lifecycleError("token-label-required", "Token label is required.")
  }

  const developer = await getTeamDeveloper(args.store, args.developerId, owner.team._id)
  if (!developer) {
    return lifecycleError("developer-not-found", "Developer was not found.")
  }
  if (developer.status !== "inactive") {
    return lifecycleError(
      "developer-not-inactive",
      "Only inactive developers can be re-enabled."
    )
  }

  const activeTokens = await args.store.listActiveTokens(developer._id)
  for (const token of activeTokens) {
    await args.store.updateToken(token._id, {
      status: "revoked",
      revokedAt: args.now,
    })
  }

  const rawToken = args.rawToken ?? generateDeveloperToken()
  const token = await createActiveToken({
    developer,
    teamId: owner.team._id,
    tokenLabel,
    rawToken,
    now: args.now,
    store: args.store,
  })
  const updatedDeveloper = await args.store.updateDeveloper(developer._id, {
    status: "active",
    updatedAt: args.now,
  })

  return {
    ok: true,
    message: "Developer re-enabled.",
    developer: publicDeveloperRow(updatedDeveloper, token),
    rawToken,
  }
}

async function requireOwner(args: {
  identity: { clerkUserId: string } | null
  store: Pick<DeveloperTokenLifecycleStore, "getTeam" | "getOwner">
}): Promise<
  | { ok: true; team: DeveloperTeamRecord; owner: DeveloperOwnerRecord }
  | Extract<DeveloperTokenLifecycleResult, { ok: false }>
> {
  if (!args.identity) {
    return lifecycleError(
      "not-authenticated",
      "Sign in with Clerk before managing developers."
    )
  }

  const team = await args.store.getTeam()
  const owner = await args.store.getOwner()

  if (!team || !owner || owner.teamId !== team._id) {
    return lifecycleError(
      "setup-state-invalid",
      "Setup must be complete before managing developers."
    )
  }

  if (owner.clerkUserId !== args.identity.clerkUserId) {
    return lifecycleError("not-owner", "Only the setup owner can manage developers.")
  }

  return { ok: true, team, owner }
}

async function getTeamDeveloper(
  store: Pick<DeveloperTokenLifecycleStore, "getDeveloper">,
  developerId: string,
  teamId: string
) {
  const developer = await store.getDeveloper(developerId)
  return developer?.teamId === teamId ? developer : null
}

async function createActiveToken(args: {
  developer: DeveloperRecord
  teamId: string
  tokenLabel: string
  rawToken: string
  now: number
  rotatedAt?: number
  store: Pick<DeveloperTokenLifecycleStore, "createToken">
}) {
  const tokenHash = await hashDeveloperToken(args.rawToken)
  const token: NewDeveloperTokenRecord = {
    teamId: args.teamId,
    developerId: args.developer._id,
    tokenHash,
    fingerprint: fingerprintDeveloperTokenHash(tokenHash),
    label: args.tokenLabel,
    status: "active",
    createdAt: args.now,
  }
  if (args.rotatedAt) token.rotatedAt = args.rotatedAt

  return args.store.createToken(token)
}

function latestToken(tokens: DeveloperTokenRecord[]) {
  return [...tokens].sort((left, right) => right.createdAt - left.createdAt)[0] ?? null
}

function lifecycleError(
  code: DeveloperTokenLifecycleErrorCode,
  message: string
): Extract<DeveloperTokenLifecycleResult, { ok: false }> {
  return {
    ok: false,
    status: "error",
    code,
    message,
  }
}
