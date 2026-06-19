import {
  isOrganizationManagerRole,
  type OrganizationRole,
} from "./organizationScope"
import { fingerprintSecretHash, generateSecret, hashSecret } from "./tokenSecrets"

export type TvDisplayLinkStatus = "active" | "revoked"

export type TvDisplayTeamRecord = {
  _id: string
  name: string
  slug: string
}

export type TvDisplayOwnerRecord = {
  teamId: string
  clerkUserId: string
  role: "owner"
}

export type TvDisplayLinkRecord = {
  _id: string
  teamId: string
  tokenHash: string
  fingerprint: string
  status: TvDisplayLinkStatus
  createdAt: number
  rotatedAt?: number
  revokedAt?: number
}

export type NewTvDisplayLinkRecord = Omit<TvDisplayLinkRecord, "_id">

export type TvDisplayLinkStore = {
  getTeam: () => Promise<TvDisplayTeamRecord | null>
  getOwner: () => Promise<TvDisplayOwnerRecord | null>
  listActiveLinks: (teamId: string) => Promise<TvDisplayLinkRecord[]>
  createLink: (link: NewTvDisplayLinkRecord) => Promise<TvDisplayLinkRecord>
  updateLink: (
    linkId: string,
    patch: Partial<Pick<TvDisplayLinkRecord, "status" | "rotatedAt" | "revokedAt">>
  ) => Promise<void>
}

export type TvDisplayLinkResult =
  | {
      ok: true
      status: "ok"
      message: string
      link: PublicTvDisplayLink | null
      rawToken?: string
    }
  | {
      ok: false
      status: "error"
      code:
        | "not-authenticated"
        | "organization-required"
        | "organization-not-configured"
        | "role-not-authorized"
        | "setup-state-invalid"
      message: string
    }

export type PublicTvDisplayLink = {
  fingerprint: string
  status: TvDisplayLinkStatus
  createdAt: number
  rotatedAt: number | null
  revokedAt: number | null
}

export async function createTvDisplayLinkCore(args: {
  identity: {
    clerkUserId: string
    organizationRole: OrganizationRole | null
  } | null
  now: number
  rawToken?: string
  store: TvDisplayLinkStore
}): Promise<TvDisplayLinkResult> {
  const managerState = await authorizeManager(args.identity, args.store)
  if (!managerState.ok) return managerState

  const activeLinks = await args.store.listActiveLinks(managerState.team._id)
  const activeLink = activeLinks[0] ?? null
  if (activeLink) {
    return {
      ok: true,
      status: "ok",
      message: "TV display link already exists. Rotate it if the raw link was lost.",
      link: publicTvDisplayLink(activeLink),
    }
  }

  const rawToken = args.rawToken ?? generateTvDisplayToken()
  const link = await createStoredLink({
    rawToken,
    teamId: managerState.team._id,
    now: args.now,
    store: args.store,
  })

  return {
    ok: true,
    status: "ok",
    message: "TV display link created.",
    link: publicTvDisplayLink(link),
    rawToken,
  }
}

export async function rotateTvDisplayLinkCore(args: {
  identity: {
    clerkUserId: string
    organizationRole: OrganizationRole | null
  } | null
  now: number
  rawToken?: string
  store: TvDisplayLinkStore
}): Promise<TvDisplayLinkResult> {
  const managerState = await authorizeManager(args.identity, args.store)
  if (!managerState.ok) return managerState

  const activeLinks = await args.store.listActiveLinks(managerState.team._id)
  await Promise.all(
    activeLinks.map((link) =>
      args.store.updateLink(link._id, {
        status: "revoked",
        revokedAt: args.now,
        rotatedAt: args.now,
      })
    )
  )

  const rawToken = args.rawToken ?? generateTvDisplayToken()
  const link = await createStoredLink({
    rawToken,
    teamId: managerState.team._id,
    now: args.now,
    rotatedAt: args.now,
    store: args.store,
  })

  return {
    ok: true,
    status: "ok",
    message: "TV display link rotated.",
    link: publicTvDisplayLink(link),
    rawToken,
  }
}

export async function revokeTvDisplayLinkCore(args: {
  identity: {
    clerkUserId: string
    organizationRole: OrganizationRole | null
  } | null
  now: number
  store: TvDisplayLinkStore
}): Promise<TvDisplayLinkResult> {
  const managerState = await authorizeManager(args.identity, args.store)
  if (!managerState.ok) return managerState

  const activeLinks = await args.store.listActiveLinks(managerState.team._id)
  await Promise.all(
    activeLinks.map((link) =>
      args.store.updateLink(link._id, {
        status: "revoked",
        revokedAt: args.now,
      })
    )
  )

  return {
    ok: true,
    status: "ok",
    message: activeLinks.length > 0 ? "TV display link revoked." : "No active TV display link.",
    link: null,
  }
}

export function generateTvDisplayToken(bytes?: Uint8Array<ArrayBufferLike>) {
  return generateSecret("eusage_tv", bytes)
}

export async function hashTvDisplayToken(rawToken: string) {
  return hashSecret(rawToken)
}

export function publicTvDisplayLink(link: TvDisplayLinkRecord): PublicTvDisplayLink {
  return {
    fingerprint: link.fingerprint,
    status: link.status,
    createdAt: link.createdAt,
    rotatedAt: link.rotatedAt ?? null,
    revokedAt: link.revokedAt ?? null,
  }
}

async function createStoredLink(args: {
  rawToken: string
  teamId: string
  now: number
  rotatedAt?: number
  store: TvDisplayLinkStore
}) {
  const tokenHash = await hashTvDisplayToken(args.rawToken)
  return args.store.createLink({
    teamId: args.teamId,
    tokenHash,
    fingerprint: fingerprintSecretHash(tokenHash),
    status: "active",
    createdAt: args.now,
    ...(args.rotatedAt === undefined ? {} : { rotatedAt: args.rotatedAt }),
  })
}

async function authorizeManager(
  identity: {
    clerkUserId: string
    organizationRole: OrganizationRole | null
  } | null,
  store: TvDisplayLinkStore
): Promise<
  | { ok: true; team: TvDisplayTeamRecord }
  | Extract<TvDisplayLinkResult, { ok: false }>
> {
  if (!identity) {
    return createError("not-authenticated", "Sign in with Clerk before managing TV links.")
  }

  const team = await store.getTeam()
  const owner = await store.getOwner()
  if (!team || !owner || owner.teamId !== team._id) {
    return createError("setup-state-invalid", "Setup must be complete before managing TV links.")
  }
  if (!isOrganizationManagerRole(identity.organizationRole)) {
    return createError(
      "role-not-authorized",
      "Owner or Admin role is required to manage TV links."
    )
  }

  return { ok: true, team }
}

function createError(
  code: Extract<TvDisplayLinkResult, { ok: false }>["code"],
  message: string
): Extract<TvDisplayLinkResult, { ok: false }> {
  return {
    ok: false,
    status: "error",
    code,
    message,
  }
}
