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
