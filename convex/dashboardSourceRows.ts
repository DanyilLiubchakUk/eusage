import type { Doc } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"
import {
  defaultDashboardSettings,
  defaultTvSettings,
  publicDashboardSettings,
  publicTvSettings,
} from "./dashboardSettings"
import { displayDeviceName } from "./deviceNames"
import { reportingTimeZoneOrDefault } from "./reportingTimeZone"

type DashboardSourceOptions = {
  includeDeveloperTokens: boolean
  tvSafeOnly?: boolean
}

export async function dashboardSourceRowsForTeam(
  ctx: QueryCtx,
  team: Pick<Doc<"teams">, "_id" | "name" | "slug" | "reportingTimeZone">,
  options: DashboardSourceOptions
) {
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
  const providerAccounts = await ctx.db
    .query("providerAccounts")
    .withIndex("by_team_account_fingerprint", (q) => q.eq("teamId", team._id))
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
  const publicTv = publicTvSettings(tvSettings)
  const tvVisibleDeveloperIds =
    options.tvSafeOnly && publicTv.visibleDeveloperIds
      ? new Set(publicTv.visibleDeveloperIds)
      : null
  const tvVisibleProviderIds =
    options.tvSafeOnly && publicTv.visibleProviderIds
      ? new Set(publicTv.visibleProviderIds)
      : null
  const providerStatusById = new Map(
    providers.map((provider) => [provider.providerId, provider.status])
  )
  const knownProviderIds = uniqueStable([
    ...providers.map((provider) => provider.providerId),
    ...snapshots.map((snapshot) => snapshot.providerId),
    ...metricSamples.map((sample) => sample.providerId),
  ])
  const isVisibleTvProvider = (providerId: string) => {
    const status = providerStatusById.get(providerId)
    return (
      status !== "disabled" &&
      (!tvVisibleProviderIds || tvVisibleProviderIds.has(providerId))
    )
  }
  const filteredProviders = options.tvSafeOnly
    ? providers.filter(
        (provider) =>
          provider.status === "enabled" &&
          isVisibleTvProvider(provider.providerId)
      )
    : providers
  const filteredProviderIds = new Set(
    options.tvSafeOnly
      ? knownProviderIds.filter(isVisibleTvProvider)
      : filteredProviders.map((provider) => provider.providerId)
  )
  const filteredDevelopers = options.tvSafeOnly
    ? developers.filter(
        (developer) =>
          developer.status === "active" &&
          (!tvVisibleDeveloperIds || tvVisibleDeveloperIds.has(developer._id))
      )
    : developers
  const filteredDeveloperIds = new Set(filteredDevelopers.map((developer) => developer._id))
  const developerTokens = options.includeDeveloperTokens
    ? await ctx.db
        .query("developerTokens")
        .withIndex("by_teamId_status", (q) => q.eq("teamId", team._id))
        .collect()
    : []
  const devices = await ctx.db
    .query("devices")
    .withIndex("by_teamId_status", (q) => q.eq("teamId", team._id))
    .collect()

  const filteredSnapshots = snapshots.filter(
    (snapshot) =>
      !options.tvSafeOnly ||
      (filteredDeveloperIds.has(snapshot.developerId) && filteredProviderIds.has(snapshot.providerId))
  )
  const filteredMetricSamples = metricSamples.filter(
    (sample) =>
      !options.tvSafeOnly ||
      (filteredProviderIds.has(sample.providerId) &&
        (!sample.developerId || filteredDeveloperIds.has(sample.developerId)))
  )
  const filteredDevices = devices.filter(
    (device) => !options.tvSafeOnly || filteredDeveloperIds.has(device.developerId)
  )
  const filteredProviderAccounts = providerAccounts.filter(
    (account) =>
      !options.tvSafeOnly ||
      (filteredDeveloperIds.has(account.developerId) &&
        filteredProviderIds.has(account.providerId))
  )

  const developerNames = new Map(
    filteredDevelopers.map((developer) => [developer._id, developer.displayName])
  )
  const latestTokensByDeveloper = new Map(
    filteredDevelopers.map((developer) => [
      developer._id,
      latestByCreatedAt(
        developerTokens.filter((token) => token.developerId === developer._id)
      ),
    ])
  )
  const devicesByDeveloper = new Map(
    filteredDevelopers.map((developer) => [
      developer._id,
      filteredDevices.filter((device) => device.developerId === developer._id),
    ])
  )

  return {
    status: "ready" as const,
    team: {
      name: team.name,
      slug: team.slug,
      reportingTimeZone: reportingTimeZoneOrDefault(team.reportingTimeZone),
    },
    developers: filteredDevelopers.map((developer) => ({
      id: developer._id,
      displayName: developer.displayName,
      status: developer.status,
      token: options.includeDeveloperTokens
        ? publicToken(latestTokensByDeveloper.get(developer._id) ?? null)
        : null,
      devices: (devicesByDeveloper.get(developer._id) ?? []).map((device) => ({
        deviceId: device.deviceId,
        deviceName: displayDeviceName(device.deviceName, device.os),
        os: device.os,
        status: device.status,
        lastSeenAt: device.lastSeenAt,
        lastSyncAt: device.lastSyncAt ?? null,
      })),
    })),
    providers: filteredProviders.map((provider) => ({
      providerId: provider.providerId,
      name: provider.name,
      status: provider.status,
      brandColor: provider.brandColor,
    })),
    dashboardSettings: options.tvSafeOnly
      ? defaultDashboardSettings()
      : publicDashboardSettings(dashboardSettings),
    tvSettings: options.tvSafeOnly
      ? {
          ...publicTv,
          visibleProviderIds: null,
          visibleDeveloperIds: null,
        }
      : publicTv,
    snapshots: filteredSnapshots.map((snapshot) => ({
      id: snapshot._id,
      developerId: snapshot.developerId,
      developerName: developerNames.get(snapshot.developerId),
      deviceId: snapshot.deviceId,
      providerId: snapshot.providerId,
      providerAccountFingerprint: snapshot.providerAccountFingerprint,
      periodStart: snapshot.periodStart,
      periodEnd: snapshot.periodEnd,
      periodKey: snapshot.periodKey,
      dataIdentity: snapshot.dataIdentity,
      summary: snapshot.summary,
      metricFamilies: snapshot.metricFamilies,
      capturedAt: snapshot.capturedAt,
      updatedAt: snapshot.updatedAt,
    })),
    metricSamples: filteredMetricSamples.map((sample) => ({
      id: sample._id,
      providerId: sample.providerId,
      developerId: sample.developerId,
      deviceId: sample.deviceId,
      providerAccountFingerprint: sample.providerAccountFingerprint,
      metricKey: sample.metricKey,
      value: sample.value,
      unit: sample.unit,
      sampleDay: sample.sampleDay,
      periodStart: sample.periodStart,
      periodEnd: sample.periodEnd,
      bucket: sample.bucket,
      source: sample.source,
      capturedAt: sample.capturedAt,
      updatedAt: sample.updatedAt,
    })),
    providerAccounts: filteredProviderAccounts.map((account) => ({
      id: account._id,
      developerId: account.developerId,
      providerId: account.providerId,
      teamAccountFingerprint: account.teamAccountFingerprint,
      label: account.label,
      status: account.status,
      firstSharedAt: account.firstSharedAt,
      lastSharedAt: account.lastSharedAt,
      updatedAt: account.updatedAt,
    })),
  }
}

export function unavailableDashboardSource<const TStatus extends string>(
  status: TStatus,
  team?: { name: string; slug: string; reportingTimeZone?: string }
) {
  return {
    status,
    team: team
      ? {
          name: team.name,
          slug: team.slug,
          reportingTimeZone: reportingTimeZoneOrDefault(team.reportingTimeZone),
        }
      : null,
    developers: [],
    providers: [],
    dashboardSettings: defaultDashboardSettings(),
    tvSettings: defaultTvSettings(),
    snapshots: [],
    metricSamples: [],
    providerAccounts: [],
  }
}

function latestByCreatedAt<T extends { createdAt: number }>(rows: T[]) {
  return [...rows].sort((left, right) => right.createdAt - left.createdAt)[0] ?? null
}

function uniqueStable(values: string[]) {
  return [...new Set(values)]
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
