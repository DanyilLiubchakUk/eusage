import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx } from "./_generated/server"
import { dashboardSourceRowsForTeam } from "./dashboardSourceRows"
import {
  createTvDisplayLinkCore,
  hashTvDisplayToken,
  publicTvDisplayLink,
  revokeTvDisplayLinkCore,
  rotateTvDisplayLinkCore,
  type TvDisplayLinkRecord,
  type TvDisplayLinkResult,
  type TvDisplayLinkStore,
} from "./tvDisplayLinkCore"
import {
  getActiveOrganizationManagerState,
  type OrganizationScopeFailureStatus,
} from "./organizationScope"

export type { PublicTvDisplayLink } from "./tvDisplayLinkCore"

type ReadyOrganizationManagerState = Extract<
  Awaited<ReturnType<typeof getActiveOrganizationManagerState>>,
  { status: "ready" }
>

export const get = query({
  args: {},
  handler: async (ctx) => {
    const ownerState = await getActiveOrganizationManagerState(ctx)
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
  handler: async (ctx) => {
    const ownerState = await getActiveOrganizationManagerState(ctx)
    if (ownerState.status !== "ready") return tvDisplayScopeError(ownerState.status)

    return createTvDisplayLinkCore({
      identity: {
        clerkUserId: ownerState.clerkUserId,
        organizationRole: ownerState.role,
      },
      now: Date.now(),
      store: convexTvDisplayLinkStore(ctx, ownerState),
    })
  },
})

export const rotate = mutation({
  args: {},
  handler: async (ctx) => {
    const ownerState = await getActiveOrganizationManagerState(ctx)
    if (ownerState.status !== "ready") return tvDisplayScopeError(ownerState.status)

    return rotateTvDisplayLinkCore({
      identity: {
        clerkUserId: ownerState.clerkUserId,
        organizationRole: ownerState.role,
      },
      now: Date.now(),
      store: convexTvDisplayLinkStore(ctx, ownerState),
    })
  },
})

export const revoke = mutation({
  args: {},
  handler: async (ctx) => {
    const ownerState = await getActiveOrganizationManagerState(ctx)
    if (ownerState.status !== "ready") return tvDisplayScopeError(ownerState.status)

    return revokeTvDisplayLinkCore({
      identity: {
        clerkUserId: ownerState.clerkUserId,
        organizationRole: ownerState.role,
      },
      now: Date.now(),
      store: convexTvDisplayLinkStore(ctx, ownerState),
    })
  },
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

function convexTvDisplayLinkStore(
  ctx: MutationCtx,
  ownerState: ReadyOrganizationManagerState
): TvDisplayLinkStore {
  return {
    getTeam: async () => ownerState.team,
    getOwner: async () => ownerState.owner,
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

function tvDisplayScopeError(
  status: OrganizationScopeFailureStatus
): Extract<TvDisplayLinkResult, { ok: false }> {
  if (status === "not-authenticated") {
    return createError(status, "Sign in with Clerk before managing TV links.")
  }
  if (status === "organization-required") {
    return createError(status, "Select a Clerk Organization before managing TV links.")
  }
  if (status === "organization-not-configured") {
    return createError(status, "Active Organization is not connected to eUsage setup.")
  }
  if (status === "role-not-authorized") {
    return createError(status, "Owner or Admin role is required to manage TV links.")
  }

  return createError(
    "setup-state-invalid",
    "Setup must be complete before managing TV links."
  )
}
