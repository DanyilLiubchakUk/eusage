import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import {
  createDeveloperWithToken,
  publicDeveloperRow,
  type CreateDeveloperResult,
  type DeveloperOwnerRecord,
  type DeveloperTeamRecord,
} from "./developerTokens"
import {
  reenableDeveloper,
  revokeDeveloperToken,
  rotateDeveloperToken,
  type DeveloperTokenLifecycleStore,
  type DeveloperTokenLifecycleResult,
} from "./developerTokenLifecycle"
import {
  listPublicDevicesForDeveloper,
  publicDeveloperRowWithDevices,
  type PublicDeveloperRowWithDevices,
} from "./desktopApi"
import {
  getActiveOrganizationManagerState,
  type OrganizationScopeFailureStatus,
} from "./organizationScope"
import { v } from "convex/values"

type ReadyOrganizationManagerState = Extract<
  Awaited<ReturnType<typeof getActiveOrganizationManagerState>>,
  { status: "ready" }
>

export const list = query({
  args: {},
  handler: async (ctx) => {
    const ownerState = await getActiveOrganizationManagerState(ctx)
    if (ownerState.status !== "ready") {
      return {
        status: ownerState.status,
        team: ownerState.team ? publicTeam(ownerState.team) : null,
        developers: [],
      }
    }

    const activeDevelopers = await ctx.db
      .query("developers")
      .withIndex("by_teamId_status", (q) =>
        q.eq("teamId", ownerState.team._id).eq("status", "active")
      )
      .collect()
    const inactiveDevelopers = await ctx.db
      .query("developers")
      .withIndex("by_teamId_status", (q) =>
        q.eq("teamId", ownerState.team._id).eq("status", "inactive")
      )
      .collect()

    const developers = [...activeDevelopers, ...inactiveDevelopers].sort(
      (left, right) => right.createdAt - left.createdAt
    )
    const rows: PublicDeveloperRowWithDevices[] = []
    const now = Date.now()

    for (const developer of developers) {
      rows.push(
        publicDeveloperRowWithDevices(
          developer,
          await getDisplayToken(ctx, developer._id),
          await listPublicDevicesForDeveloper({
            developerId: developer._id,
            now,
            ctx,
          })
        )
      )
    }

    return {
      status: "ready" as const,
      team: publicTeam(ownerState.team),
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
    const ownerState = await getActiveOrganizationManagerState(ctx)
    if (ownerState.status !== "ready") {
      return developerLifecycleScopeError(ownerState.status)
    }

    return rotateDeveloperToken({
      developerId: input.developerId,
      tokenLabel: input.tokenLabel,
      identity: {
        clerkUserId: ownerState.clerkUserId,
        organizationRole: ownerState.role,
      },
      now: Date.now(),
      store: createLifecycleStore(ctx, ownerState),
    })
  },
})

export const revoke = mutation({
  args: {
    developerId: v.id("developers"),
  },
  handler: async (ctx, input) => {
    const ownerState = await getActiveOrganizationManagerState(ctx)
    if (ownerState.status !== "ready") {
      return developerLifecycleScopeError(ownerState.status)
    }

    return revokeDeveloperToken({
      developerId: input.developerId,
      identity: {
        clerkUserId: ownerState.clerkUserId,
        organizationRole: ownerState.role,
      },
      now: Date.now(),
      store: createLifecycleStore(ctx, ownerState),
    })
  },
})

export const reenable = mutation({
  args: {
    developerId: v.id("developers"),
    tokenLabel: v.string(),
  },
  handler: async (ctx, input) => {
    const ownerState = await getActiveOrganizationManagerState(ctx)
    if (ownerState.status !== "ready") {
      return developerLifecycleScopeError(ownerState.status)
    }

    return reenableDeveloper({
      developerId: input.developerId,
      tokenLabel: input.tokenLabel,
      identity: {
        clerkUserId: ownerState.clerkUserId,
        organizationRole: ownerState.role,
      },
      now: Date.now(),
      store: createLifecycleStore(ctx, ownerState),
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

function createLifecycleStore(
  ctx: MutationCtx,
  ownerState: ReadyOrganizationManagerState
): DeveloperTokenLifecycleStore {
  return {
    getTeam: async () => ownerState.team as DeveloperTeamRecord,
    getOwner: async () => ownerState.owner as DeveloperOwnerRecord,
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
    const ownerState = await getActiveOrganizationManagerState(ctx)
    if (ownerState.status !== "ready") {
      return createDeveloperScopeError(ownerState.status)
    }

    return createDeveloperWithToken({
      input,
      identity: {
        clerkUserId: ownerState.clerkUserId,
        organizationRole: ownerState.role,
      },
      now: Date.now(),
      store: {
        getTeam: async () => ownerState.team as DeveloperTeamRecord,
        getOwner: async () => ownerState.owner as DeveloperOwnerRecord,
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

function publicTeam(team: Pick<DeveloperTeamRecord, "name" | "slug">) {
  return {
    name: team.name,
    slug: team.slug,
  }
}

function createDeveloperScopeError(
  status: OrganizationScopeFailureStatus
): CreateDeveloperResult {
  return {
    ok: false,
    status: "error",
    code: developerScopeErrorCode(status),
    message: developerScopeErrorMessage(status),
  }
}

function developerLifecycleScopeError(
  status: OrganizationScopeFailureStatus
): DeveloperTokenLifecycleResult {
  return {
    ok: false,
    status: "error",
    code: developerScopeErrorCode(status),
    message: developerScopeErrorMessage(status),
  }
}

function developerScopeErrorCode(status: OrganizationScopeFailureStatus) {
  return status === "role-not-authorized" ||
    status === "not-authenticated" ||
    status === "organization-required" ||
    status === "organization-not-configured"
    ? status
    : "setup-state-invalid"
}

function developerScopeErrorMessage(status: OrganizationScopeFailureStatus) {
  if (status === "not-authenticated") {
    return "Sign in with Clerk before managing developers."
  }
  if (status === "organization-required") {
    return "Select a Clerk Organization before managing developers."
  }
  if (status === "organization-not-configured") {
    return "Active Organization is not connected to eUsage setup."
  }
  if (status === "role-not-authorized") {
    return "Owner or Admin role is required to manage developers."
  }

  return "Setup must be complete before managing developers."
}
