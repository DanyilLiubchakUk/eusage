import { mutation, query, type MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { v } from "convex/values"
import {
  defaultDashboardSettings,
  defaultTvSettings,
  isValidDateRange,
  isValidTvSlides,
  normalizeTvSlides,
} from "./dashboardSettings"
import { dashboardSourceRowsForTeam, unavailableDashboardSource } from "./dashboardSourceRows"

export const sourceRows = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      return unavailableDashboardSource("not-authenticated")
    }

    const team = await ctx.db.query("teams").first()
    const owner = await ctx.db.query("admins").first()

    if (!team || !owner || owner.teamId !== team._id) {
      return unavailableDashboardSource("setup-state-invalid")
    }

    const publicTeam = {
      name: team.name,
      slug: team.slug,
    }

    if (owner.clerkUserId !== identity.subject) {
      return unavailableDashboardSource("not-owner", publicTeam)
    }

    return dashboardSourceRowsForTeam(ctx, team, { includeDeveloperTokens: true })
  },
})

export const updateDashboardSettings = mutation({
  args: {
    defaultDateRange: v.optional(
      v.union(
        v.object({ preset: v.literal("last7") }),
        v.object({ preset: v.literal("last30") }),
        v.object({ preset: v.literal("last90") }),
        v.object({ preset: v.literal("allTime") }),
        v.object({
          preset: v.literal("custom"),
          startDay: v.string(),
          endDay: v.string(),
        })
      )
    ),
    visibleProviderIds: v.optional(v.union(v.array(v.string()), v.null())),
  },
  handler: async (ctx, input) => {
    const ownerState = await getOwnerTeamState(ctx)
    if (ownerState.status !== "ready") return ownerState
    if (input.defaultDateRange !== undefined && !isValidDateRange(input.defaultDateRange)) {
      return {
        status: "invalid-date-range" as const,
        message: "Date range is invalid.",
      }
    }

    const existing = await ctx.db
      .query("dashboardSettings")
      .withIndex("by_teamId", (q) => q.eq("teamId", ownerState.team._id))
      .first()
    const now = Date.now()
    const patch = {
      ...(input.defaultDateRange === undefined ? {} : { defaultDateRange: input.defaultDateRange }),
      ...(input.visibleProviderIds === undefined
        ? {}
        : { visibleProviderIds: input.visibleProviderIds ?? undefined }),
      updatedAt: now,
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch)
    } else {
      await ctx.db.insert("dashboardSettings", {
        teamId: ownerState.team._id,
        defaultDateRange: input.defaultDateRange ?? defaultDashboardSettings().defaultDateRange,
        ...(input.visibleProviderIds === undefined || input.visibleProviderIds === null
          ? {}
          : { visibleProviderIds: input.visibleProviderIds }),
        hiddenDeveloperIds: [],
        includeInactiveDevelopers: false,
        createdAt: now,
        updatedAt: now,
      })
    }

    return { status: "ok" as const }
  },
})

export const updateTvSettings = mutation({
  args: {
    dateRange: v.optional(
      v.union(
        v.object({ preset: v.literal("last7") }),
        v.object({ preset: v.literal("last30") }),
        v.object({ preset: v.literal("last90") }),
        v.object({ preset: v.literal("allTime") }),
        v.object({
          preset: v.literal("custom"),
          startDay: v.string(),
          endDay: v.string(),
        })
      )
    ),
    visibleProviderIds: v.optional(v.union(v.array(v.string()), v.null())),
    visibleDeveloperIds: v.optional(v.union(v.array(v.id("developers")), v.null())),
    slides: v.optional(
      v.array(
        v.object({
          id: v.string(),
          enabled: v.boolean(),
          order: v.number(),
          durationSeconds: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, input) => {
    const ownerState = await getOwnerTeamState(ctx)
    if (ownerState.status !== "ready") return ownerState
    if (input.dateRange !== undefined && !isValidDateRange(input.dateRange)) {
      return {
        status: "invalid-date-range" as const,
        message: "Date range is invalid.",
      }
    }
    if (input.slides !== undefined && !isValidTvSlides(input.slides)) {
      return {
        status: "invalid-slides" as const,
        message: "TV slides are invalid.",
      }
    }

    const existing = await ctx.db
      .query("tvSettings")
      .withIndex("by_teamId", (q) => q.eq("teamId", ownerState.team._id))
      .first()
    const now = Date.now()
    const patch = {
      ...(input.dateRange === undefined ? {} : { dateRange: input.dateRange }),
      ...(input.visibleProviderIds === undefined
        ? {}
        : { visibleProviderIds: input.visibleProviderIds ?? undefined }),
      ...(input.visibleDeveloperIds === undefined
        ? {}
        : { visibleDeveloperIds: input.visibleDeveloperIds ?? undefined }),
      ...(input.slides === undefined ? {} : { slides: normalizeTvSlides(input.slides) }),
      updatedAt: now,
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch)
    } else {
      await ctx.db.insert("tvSettings", {
        teamId: ownerState.team._id,
        dateRange: input.dateRange ?? defaultTvSettings().dateRange,
        ...(input.visibleProviderIds === undefined || input.visibleProviderIds === null
          ? {}
          : { visibleProviderIds: input.visibleProviderIds }),
        ...(input.visibleDeveloperIds === undefined || input.visibleDeveloperIds === null
          ? {}
          : { visibleDeveloperIds: input.visibleDeveloperIds }),
        slides: input.slides ? normalizeTvSlides(input.slides) : defaultTvSettings().slides,
        theme: "dark",
        createdAt: now,
        updatedAt: now,
      })
    }

    return { status: "ok" as const }
  },
})

async function getOwnerTeamState(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return { status: "not-authenticated" as const }

  const team = await ctx.db.query("teams").first()
  const owner = await ctx.db.query("admins").first()
  if (!team || !owner || owner.teamId !== team._id) {
    return { status: "setup-state-invalid" as const }
  }
  if (owner.clerkUserId !== identity.subject) return { status: "not-owner" as const }

  return { status: "ready" as const, team: team as { _id: Id<"teams"> } }
}
