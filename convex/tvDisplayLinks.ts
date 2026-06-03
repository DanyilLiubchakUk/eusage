import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { dashboardSourceRowsForTeam } from "./dashboardSourceRows"
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
      code: "not-authenticated" | "not-owner" | "setup-state-invalid"
      message: string
    }

export type PublicTvDisplayLink = {
  fingerprint: string
  status: TvDisplayLinkStatus
  createdAt: number
  rotatedAt: number | null
  revokedAt: number | null
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const ownerState = await getOwnerTeamState(ctx)
    if (ownerState.status !== "ready") {
      return { status: ownerState.status, link: null }
    }

    const activeLink = await ctx.db
      .query("tvDisplayLinks")
      .withIndex("by_teamId_status", (q) =>
        q.eq("teamId", ownerState.team._id).eq("status", "active")
      )
      .first()

    return {
      status: "ready" as const,
      link: activeLink ? publicTvDisplayLink(activeLink) : null,
    }
  },
})

export const create = mutation({
  args: {},
  handler: async (ctx) =>
    createTvDisplayLinkCore({
      identity: await getIdentity(ctx),
      now: Date.now(),
      store: convexTvDisplayLinkStore(ctx),
    }),
})

export const rotate = mutation({
  args: {},
  handler: async (ctx) =>
    rotateTvDisplayLinkCore({
      identity: await getIdentity(ctx),
      now: Date.now(),
      store: convexTvDisplayLinkStore(ctx),
    }),
})

export const revoke = mutation({
  args: {},
  handler: async (ctx) =>
    revokeTvDisplayLinkCore({
      identity: await getIdentity(ctx),
      now: Date.now(),
      store: convexTvDisplayLinkStore(ctx),
    }),
})

export const displaySource = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const tokenHash = await hashTvDisplayToken(args.token)
    const link = await ctx.db
      .query("tvDisplayLinks")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .first()

    if (!link || link.status !== "active") {
      return tvLinkUnavailable()
    }

    const team = await ctx.db.get(link.teamId)
    if (!team) return tvLinkUnavailable()

    return dashboardSourceRowsForTeam(ctx, team, {
      includeDeveloperTokens: false,
      tvSafeOnly: true,
    })
  },
})

export async function createTvDisplayLinkCore(args: {
  identity: { clerkUserId: string } | null
  now: number
  rawToken?: string
  store: TvDisplayLinkStore
}): Promise<TvDisplayLinkResult> {
  const ownerState = await authorizeOwner(args.identity, args.store)
  if (!ownerState.ok) return ownerState

  const activeLinks = await args.store.listActiveLinks(ownerState.team._id)
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
    teamId: ownerState.team._id,
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
  identity: { clerkUserId: string } | null
  now: number
  rawToken?: string
  store: TvDisplayLinkStore
}): Promise<TvDisplayLinkResult> {
  const ownerState = await authorizeOwner(args.identity, args.store)
  if (!ownerState.ok) return ownerState

  const activeLinks = await args.store.listActiveLinks(ownerState.team._id)
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
    teamId: ownerState.team._id,
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
  identity: { clerkUserId: string } | null
  now: number
  store: TvDisplayLinkStore
}): Promise<TvDisplayLinkResult> {
  const ownerState = await authorizeOwner(args.identity, args.store)
  if (!ownerState.ok) return ownerState

  const activeLinks = await args.store.listActiveLinks(ownerState.team._id)
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

async function authorizeOwner(
  identity: { clerkUserId: string } | null,
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
  if (owner.clerkUserId !== identity.clerkUserId) {
    return createError("not-owner", "Only the setup owner can manage TV links.")
  }

  return { ok: true, team }
}

function convexTvDisplayLinkStore(ctx: MutationCtx): TvDisplayLinkStore {
  return {
    getTeam: async () => ctx.db.query("teams").first(),
    getOwner: async () => ctx.db.query("admins").first(),
    listActiveLinks: async (teamId) =>
      ctx.db
        .query("tvDisplayLinks")
        .withIndex("by_teamId_status", (q) =>
          q.eq("teamId", teamId as Id<"teams">).eq("status", "active")
        )
        .collect(),
    createLink: async (link) => {
      const id = await ctx.db.insert("tvDisplayLinks", {
        ...link,
        teamId: link.teamId as Id<"teams">,
      })
      const created = await ctx.db.get(id)
      if (!created) throw new Error("Created TV display link is missing.")
      return created
    },
    updateLink: async (linkId, patch) => {
      await ctx.db.patch(linkId as Id<"tvDisplayLinks">, patch)
    },
  }
}

async function getOwnerTeamState(ctx: { auth: QueryCtx["auth"]; db: QueryCtx["db"] }) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return { status: "not-authenticated" as const }

  const team = await ctx.db.query("teams").first()
  const owner = await ctx.db.query("admins").first()
  if (!team || !owner || owner.teamId !== team._id) return { status: "setup-state-invalid" as const }
  if (owner.clerkUserId !== identity.subject) return { status: "not-owner" as const }

  return { status: "ready" as const, team }
}

async function getIdentity(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  return identity ? { clerkUserId: identity.subject } : null
}

function publicTvDisplayLink(link: TvDisplayLinkRecord): PublicTvDisplayLink {
  return {
    fingerprint: link.fingerprint,
    status: link.status,
    createdAt: link.createdAt,
    rotatedAt: link.rotatedAt ?? null,
    revokedAt: link.revokedAt ?? null,
  }
}

function tvLinkUnavailable() {
  return {
    status: "tv-link-unavailable" as const,
    message: "TV link unavailable",
  }
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
