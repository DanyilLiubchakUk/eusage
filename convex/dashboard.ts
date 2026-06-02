import { mutation, query, type MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { v } from "convex/values"
import {
  defaultDashboardSettings,
  defaultTvSettings,
  defaultTvSlides,
  isValidDateRange,
  isValidTvSlides,
  normalizeTvSlides,
  publicDashboardSettings,
  publicTvSettings,
} from "./dashboardSettings"

export const sourceRows = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      return {
        status: "not-authenticated" as const,
        team: null,
        developers: [],
        providers: [],
        dashboardSettings: defaultDashboardSettings(),
        tvSettings: defaultTvSettings(),
        snapshots: [],
        metricSamples: [],
      }
    }

    const team = await ctx.db.query("teams").first()
    const owner = await ctx.db.query("admins").first()

    if (!team || !owner || owner.teamId !== team._id) {
      return {
        status: "setup-state-invalid" as const,
        team: null,
        developers: [],
        providers: [],
        dashboardSettings: defaultDashboardSettings(),
        tvSettings: defaultTvSettings(),
        snapshots: [],
        metricSamples: [],
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
        providers: [],
        dashboardSettings: defaultDashboardSettings(),
        tvSettings: defaultTvSettings(),
        snapshots: [],
        metricSamples: [],
      }
    }

    const developers = await ctx.db
      .query("developers")
      .withIndex("by_teamId_status", (q) => q.eq("teamId", team._id))
      .collect()
    const snapshots = await ctx.db
      .query("usageSnapshots")
      .withIndex("by_team_updatedAt", (q) => q.eq("teamId", team._id))
      .collect()
    const metricSamples = await ctx.db
      .query("metricSamples")
      .withIndex("by_team_metric_day", (q) => q.eq("teamId", team._id))
      .collect()
    const providers = await ctx.db
      .query("providers")
      .withIndex("by_teamId_status", (q) => q.eq("teamId", team._id))
      .collect()
    const dashboardSettings =
      (await ctx.db
        .query("dashboardSettings")
        .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
        .first()) ?? null
    const tvSettings =
      (await ctx.db
        .query("tvSettings")
        .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
        .first()) ?? null
    const developerTokens = await ctx.db
      .query("developerTokens")
      .withIndex("by_teamId_status", (q) => q.eq("teamId", team._id))
      .collect()
    const devices = await ctx.db
      .query("devices")
      .withIndex("by_teamId_status", (q) => q.eq("teamId", team._id))
      .collect()

    const developerNames = new Map(
      developers.map((developer) => [developer._id, developer.displayName])
    )
    const latestTokensByDeveloper = new Map(
      developers.map((developer) => [
        developer._id,
        latestByCreatedAt(
          developerTokens.filter((token) => token.developerId === developer._id)
        ),
      ])
    )
    const devicesByDeveloper = new Map(
      developers.map((developer) => [
        developer._id,
        devices.filter((device) => device.developerId === developer._id),
      ])
    )

    return {
      status: "ready" as const,
      team: publicTeam,
      developers: developers.map((developer) => ({
        id: developer._id,
        displayName: developer.displayName,
        status: developer.status,
        token: publicToken(latestTokensByDeveloper.get(developer._id) ?? null),
        devices: (devicesByDeveloper.get(developer._id) ?? []).map((device) => ({
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          os: device.os,
          status: device.status,
          lastSeenAt: device.lastSeenAt,
          lastSyncAt: device.lastSyncAt ?? null,
        })),
      })),
      providers: providers.map((provider) => ({
        providerId: provider.providerId,
        name: provider.name,
        status: provider.status,
        brandColor: provider.brandColor,
      })),
      dashboardSettings: publicDashboardSettings(dashboardSettings),
      tvSettings: publicTvSettings(tvSettings),
      snapshots: snapshots.map((snapshot) => ({
        id: snapshot._id,
        developerId: snapshot.developerId,
        developerName: developerNames.get(snapshot.developerId),
        deviceId: snapshot.deviceId,
        providerId: snapshot.providerId,
        periodStart: snapshot.periodStart,
        periodEnd: snapshot.periodEnd,
        periodKey: snapshot.periodKey,
        dataIdentity: snapshot.dataIdentity,
        summary: snapshot.summary,
        metricFamilies: snapshot.metricFamilies,
        capturedAt: snapshot.capturedAt,
        updatedAt: snapshot.updatedAt,
      })),
      metricSamples: metricSamples.map((sample) => ({
        id: sample._id,
        providerId: sample.providerId,
        developerId: sample.developerId,
        deviceId: sample.deviceId,
        metricKey: sample.metricKey,
        value: sample.value,
        unit: sample.unit,
        sampleDay: sample.sampleDay,
        periodStart: sample.periodStart,
        periodEnd: sample.periodEnd,
        source: sample.source,
        capturedAt: sample.capturedAt,
        updatedAt: sample.updatedAt,
      })),
    }
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
        slides: input.slides ? normalizeTvSlides(input.slides) : defaultTvSlides(),
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

function latestByCreatedAt<T extends { createdAt: number }>(rows: T[]) {
  return [...rows].sort((left, right) => right.createdAt - left.createdAt)[0] ?? null
}

function publicToken(
  token: {
    fingerprint: string
    label: string
    status: string
    lastUsedAt?: number
  } | null
) {
  if (!token) return null
  return {
    fingerprint: token.fingerprint,
    label: token.label,
    status: token.status,
    lastUsedAt: token.lastUsedAt ?? null,
  }
}
