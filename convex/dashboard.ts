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
import {
  LOCAL_SEED_CONFIRM,
  isLocalSeedOrigin,
  seedLocalDashboardData,
} from "./dashboardSeed"
import { normalizeReportingTimeZone } from "./reportingTimeZone"

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
      reportingTimeZone: team.reportingTimeZone,
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
    reportingTimeZone: v.optional(v.string()),
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
    const reportingTimeZone =
      input.reportingTimeZone === undefined
        ? undefined
        : normalizeReportingTimeZone(input.reportingTimeZone)
    if (input.reportingTimeZone !== undefined && !reportingTimeZone) {
      return {
        status: "invalid-reporting-time-zone" as const,
        message: "Reporting time zone is invalid.",
      }
    }

    const existing = await ctx.db
      .query("dashboardSettings")
      .withIndex("by_teamId", (q) => q.eq("teamId", ownerState.team._id))
      .first()
    const now = Date.now()
    if (reportingTimeZone) {
      await ctx.db.patch(ownerState.team._id, {
        reportingTimeZone,
        updatedAt: now,
      })
    }
    const hasDashboardSettingsPatch =
      input.defaultDateRange !== undefined || input.visibleProviderIds !== undefined
    if (!hasDashboardSettingsPatch) return { status: "ok" as const }

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

export const clearTeamData = mutation({
  args: {
    confirm: v.literal("DELETE TEAM DATA"),
  },
  handler: async (ctx) => {
    const ownerState = await getOwnerTeamState(ctx)
    if (ownerState.status !== "ready") return ownerState

    const deleted = {
      developers: 0,
      developerTokens: 0,
      devices: 0,
      metricSamples: 0,
      providerAccounts: 0,
      providers: 0,
      rawPayloads: 0,
      syncErrors: 0,
      usageSnapshots: 0,
    }

    deleted.metricSamples = await deleteTeamRows(ctx, "metricSamples", ownerState.team._id)
    deleted.usageSnapshots = await deleteTeamRows(ctx, "usageSnapshots", ownerState.team._id)
    deleted.rawPayloads = await deleteTeamRows(ctx, "rawPayloads", ownerState.team._id)
    deleted.syncErrors = await deleteTeamRows(ctx, "syncErrors", ownerState.team._id)
    deleted.providerAccounts = await deleteTeamRows(ctx, "providerAccounts", ownerState.team._id)
    deleted.devices = await deleteTeamRows(ctx, "devices", ownerState.team._id)
    deleted.developerTokens = await deleteTeamRows(ctx, "developerTokens", ownerState.team._id)
    deleted.providers = await deleteTeamRows(ctx, "providers", ownerState.team._id)
    deleted.developers = await deleteTeamRows(ctx, "developers", ownerState.team._id)

    return {
      status: "ok" as const,
      deleted,
    }
  },
})

export const seedLocalMockData = mutation({
  args: {
    confirm: v.literal(LOCAL_SEED_CONFIRM),
    clientOrigin: v.string(),
  },
  handler: async (ctx, input) => {
    const ownerState = await getOwnerTeamState(ctx)
    if (ownerState.status !== "ready") return ownerState
    if (!isLocalSeedOrigin(input.clientOrigin)) {
      return {
        status: "not-local-dev" as const,
        message: "Mock seed data is only available from http://localhost:3000.",
      }
    }

    const result = await seedLocalDashboardData(ctx, ownerState.team._id)
    return {
      status: "ok" as const,
      ...result,
    }
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

async function deleteTeamRows<
  TTable extends
    | "developers"
    | "developerTokens"
    | "devices"
    | "metricSamples"
    | "providerAccounts"
    | "providers"
    | "rawPayloads"
    | "syncErrors"
    | "usageSnapshots",
>(ctx: MutationCtx, table: TTable, teamId: Id<"teams">) {
  const rows = await ctx.db.query(table).collect()
  let count = 0

  for (const row of rows) {
    if (row.teamId !== teamId) continue
    await ctx.db.delete(row._id)
    count += 1
  }

  return count
}
