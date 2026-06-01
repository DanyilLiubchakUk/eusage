import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import {
  createDeveloperWithToken,
  publicDeveloperRow,
  type PublicDeveloperRow,
  type DeveloperOwnerRecord,
  type DeveloperTeamRecord,
} from "./developerTokens"
import {
  reenableDeveloper,
  revokeDeveloperToken,
  rotateDeveloperToken,
  type DeveloperTokenLifecycleStore,
} from "./developerTokenLifecycle"
import { v } from "convex/values"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      return {
        status: "not-authenticated" as const,
        team: null,
        developers: [],
      }
    }

    const team = await ctx.db.query("teams").first()
    const owner = await ctx.db.query("admins").first()

    if (!team || !owner || owner.teamId !== team._id) {
      return {
        status: "setup-state-invalid" as const,
        team: null,
        developers: [],
      }
    }

    const publicTeam = {
      name: team.name,
      slug: team.slug,
    }

    if (owner.clerkUserId !== identity.subject) {
      return {
        status: "not-owner" as const,
        team: publicTeam,
        developers: [],
      }
    }

    const activeDevelopers = await ctx.db
      .query("developers")
      .withIndex("by_teamId_status", (q) =>
        q.eq("teamId", team._id).eq("status", "active")
      )
      .collect()
    const inactiveDevelopers = await ctx.db
      .query("developers")
      .withIndex("by_teamId_status", (q) =>
        q.eq("teamId", team._id).eq("status", "inactive")
      )
      .collect()

    const developers = [...activeDevelopers, ...inactiveDevelopers].sort(
      (left, right) => right.createdAt - left.createdAt
    )
    const rows: PublicDeveloperRow[] = []

    for (const developer of developers) {
      rows.push(publicDeveloperRow(developer, await getDisplayToken(ctx, developer._id)))
    }

    return {
      status: "ready" as const,
      team: publicTeam,
      developers: rows,
    }
  },
})

export const rotate = mutation({
  args: {
    developerId: v.id("developers"),
    tokenLabel: v.string(),
  },
  handler: async (ctx, input) => {
    const identity = await ctx.auth.getUserIdentity()

    return rotateDeveloperToken({
      developerId: input.developerId,
      tokenLabel: input.tokenLabel,
      identity: identity ? { clerkUserId: identity.subject } : null,
      now: Date.now(),
      store: createLifecycleStore(ctx),
    })
  },
})

export const revoke = mutation({
  args: {
    developerId: v.id("developers"),
  },
  handler: async (ctx, input) => {
    const identity = await ctx.auth.getUserIdentity()

    return revokeDeveloperToken({
      developerId: input.developerId,
      identity: identity ? { clerkUserId: identity.subject } : null,
      now: Date.now(),
      store: createLifecycleStore(ctx),
    })
  },
})

export const reenable = mutation({
  args: {
    developerId: v.id("developers"),
    tokenLabel: v.string(),
  },
  handler: async (ctx, input) => {
    const identity = await ctx.auth.getUserIdentity()

    return reenableDeveloper({
      developerId: input.developerId,
      tokenLabel: input.tokenLabel,
      identity: identity ? { clerkUserId: identity.subject } : null,
      now: Date.now(),
      store: createLifecycleStore(ctx),
    })
  },
})

async function getDisplayToken(ctx: QueryCtx, developerId: Id<"developers">) {
  const activeTokens = await ctx.db
    .query("developerTokens")
    .withIndex("by_developerId_status", (q) =>
      q.eq("developerId", developerId).eq("status", "active")
    )
    .collect()

  const activeToken = latestToken(activeTokens)
  if (activeToken) return activeToken

  const revokedTokens = await ctx.db
    .query("developerTokens")
    .withIndex("by_developerId_status", (q) =>
      q.eq("developerId", developerId).eq("status", "revoked")
    )
    .collect()

  return latestToken(revokedTokens)
}

function latestToken<T extends { createdAt: number }>(tokens: T[]) {
  return [...tokens].sort((left, right) => right.createdAt - left.createdAt)[0] ?? null
}

function createLifecycleStore(ctx: MutationCtx): DeveloperTokenLifecycleStore {
  return {
    getTeam: async () =>
      ctx.db.query("teams").first() as Promise<DeveloperTeamRecord | null>,
    getOwner: async () =>
      ctx.db.query("admins").first() as Promise<DeveloperOwnerRecord | null>,
    getDeveloper: async (developerId) =>
      ctx.db.get(developerId as Id<"developers">),
    listActiveTokens: async (developerId) =>
      ctx.db
        .query("developerTokens")
        .withIndex("by_developerId_status", (q) =>
          q.eq("developerId", developerId as Id<"developers">).eq("status", "active")
        )
        .collect(),
    createToken: async (token) => {
      const id = await ctx.db.insert("developerTokens", {
        ...token,
        teamId: token.teamId as Id<"teams">,
        developerId: token.developerId as Id<"developers">,
      })
      const created = await ctx.db.get(id)
      if (!created) {
        throw new Error("Created developer token row was not readable.")
      }
      return created
    },
    updateDeveloper: async (developerId, patch) => {
      await ctx.db.patch(developerId as Id<"developers">, patch)
      const updated = await ctx.db.get(developerId as Id<"developers">)
      if (!updated) {
        throw new Error("Updated developer row was not readable.")
      }
      return updated
    },
    updateToken: async (tokenId, patch) => {
      await ctx.db.patch(tokenId as Id<"developerTokens">, patch)
      const updated = await ctx.db.get(tokenId as Id<"developerTokens">)
      if (!updated) {
        throw new Error("Updated developer token row was not readable.")
      }
      return updated
    },
  }
}

export const create = mutation({
  args: {
    displayName: v.string(),
    email: v.optional(v.string()),
    tokenLabel: v.string(),
    metadataNotes: v.optional(v.string()),
  },
  handler: async (ctx, input) => {
    const identity = await ctx.auth.getUserIdentity()

    return createDeveloperWithToken({
      input,
      identity: identity ? { clerkUserId: identity.subject } : null,
      now: Date.now(),
      store: {
        getTeam: async () =>
          ctx.db.query("teams").first() as Promise<DeveloperTeamRecord | null>,
        getOwner: async () =>
          ctx.db.query("admins").first() as Promise<DeveloperOwnerRecord | null>,
        createDeveloper: async (developer) => {
          const id = await ctx.db.insert("developers", {
            ...developer,
            teamId: developer.teamId as Id<"teams">,
          })
          const created = await ctx.db.get(id)
          if (!created) {
            throw new Error("Created developer row was not readable.")
          }
          return created
        },
        createToken: async (token) => {
          const id = await ctx.db.insert("developerTokens", {
            ...token,
            teamId: token.teamId as Id<"teams">,
            developerId: token.developerId as Id<"developers">,
          })
          const created = await ctx.db.get(id)
          if (!created) {
            throw new Error("Created developer token row was not readable.")
          }
          return created
        },
      },
    })
  },
})
