import { query } from "./_generated/server"

export const sourceRows = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      return {
        status: "not-authenticated" as const,
        team: null,
        developers: [],
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

    const developerNames = new Map(
      developers.map((developer) => [developer._id, developer.displayName])
    )

    return {
      status: "ready" as const,
      team: publicTeam,
      developers: developers.map((developer) => ({
        id: developer._id,
        displayName: developer.displayName,
        status: developer.status,
      })),
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
        metricKey: sample.metricKey,
        value: sample.value,
        unit: sample.unit,
        sampleDay: sample.sampleDay,
        source: sample.source,
        capturedAt: sample.capturedAt,
        updatedAt: sample.updatedAt,
      })),
    }
  },
})
