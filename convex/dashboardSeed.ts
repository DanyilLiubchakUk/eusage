import type { Id } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"
import { seedDevelopers } from "./dashboardSeedRows"

export const LOCAL_SEED_CONFIRM = "SEED LOCAL MOCK DATA"
const LOCAL_SEED_NOTE = "local-dev-dashboard-seed"
const LOCAL_SEED_PREFIX = "local-dev-seed"
const LOCAL_SEED_EMAIL_DOMAIN = "@local.test"

type ProviderSeed = {
  providerId: string
  name: string
  brandColor: string
}

const seedProviders = [
  { providerId: "cursor", name: "Cursor", brandColor: "#000000" },
  { providerId: "codex", name: "Codex", brandColor: "#74AA9C" },
  { providerId: "claude", name: "Claude", brandColor: "#DE7356" },
  {
    providerId: "jetbrains-ai-assistant",
    name: "JetBrains AI Assistant",
    brandColor: "#7d5fe6",
  },
] satisfies ProviderSeed[]

export function isLocalSeedOrigin(origin: string) {
  try {
    const url = new URL(origin)
    return (
      url.protocol === "http:" &&
      url.port === "3000" &&
      (url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "::1" ||
        url.hostname === "[::1]")
    )
  } catch {
    return false
  }
}

export async function seedLocalDashboardData(ctx: MutationCtx, teamId: Id<"teams">) {
  const now = Date.now()
  const day = new Date(now).toISOString().slice(0, 10)
  const period = periodForDay(day)

  const deleted = await deleteExistingSeedRows(ctx, teamId)
  const providers = await upsertSeedProviders(ctx, teamId, now)
  const developers = await createSeedDevelopers(ctx, teamId, now)
  let devices = 0
  let developerTokens = 0
  let usageSnapshots = 0
  let metricSamples = 0

  for (const developer of developers) {
    if (developer.hasToken) {
      developerTokens += 1
      await ctx.db.insert("developerTokens", {
        teamId,
        developerId: developer.id,
        tokenHash: `${LOCAL_SEED_PREFIX}:${developer.slug}:token`,
        fingerprint: `${developer.slug}-seed`,
        label: `${developer.name} seed token`,
        status: developer.tokenStatus,
        createdAt: now,
        ...(developer.tokenStatus === "revoked" ? { revokedAt: now - developer.offsetMs } : {}),
        lastUsedAt: now - developer.offsetMs,
      })
    }

    for (const device of developer.devices) {
      devices += 1
      await ctx.db.insert("devices", {
        teamId,
        developerId: developer.id,
        deviceId: `${LOCAL_SEED_PREFIX}-${developer.slug}-${device.slug}`,
        deviceName: device.name,
        os: device.os,
        appVersion: device.appVersion,
        status: device.status,
        lastSeenAt: now - device.lastSeenOffsetMs,
        ...(device.lastSyncOffsetMs === null
          ? {}
          : { lastSyncAt: now - device.lastSyncOffsetMs }),
        createdAt: now - device.createdOffsetMs,
        updatedAt: now - device.lastSeenOffsetMs,
      })
    }

    const deviceId = `${LOCAL_SEED_PREFIX}-${developer.slug}-${developer.reportingDeviceSlug}`

    for (const provider of developer.providers) {
      usageSnapshots += 1
      await ctx.db.insert("usageSnapshots", {
        teamId,
        developerId: developer.id,
        deviceId,
        providerId: provider.providerId,
        periodStart: period.start,
        periodEnd: period.end,
        periodKey: `${provider.providerId}:${day}`,
        dataIdentity: `${LOCAL_SEED_PREFIX}:${developer.slug}:${provider.providerId}:${day}`,
        summary: provider.summary,
        summaryVersion: "local-seed-v1",
        extractorVersion: { [provider.providerId]: "local-seed-v1" },
        metricFamilies: provider.metricFamilies,
        capturedAt: now - developer.offsetMs,
        updatedAt: now - developer.offsetMs,
      })

      for (const sample of provider.samples) {
        const sampleDay = dayWithOffset(day, sample.dayOffset)
        const samplePeriod = periodForDay(sampleDay)
        metricSamples += 1
        await ctx.db.insert("metricSamples", {
          teamId,
          providerId: provider.providerId,
          developerId: developer.id,
          deviceId,
          metricKey: sample.metricKey,
          value: sample.value,
          unit: sample.unit,
          sampleDay,
          periodStart: samplePeriod.start,
          periodEnd: samplePeriod.end,
          source: sample.source,
          summaryVersion: "local-seed-v1",
          extractorVersion: { [provider.providerId]: "local-seed-v1" },
          capturedAt: now - developer.offsetMs,
          updatedAt: now - developer.offsetMs,
        })
      }
    }
  }

  return {
    deleted,
    seeded: {
      developers: developers.length,
      developerTokens,
      devices,
      metricSamples,
      providers,
      usageSnapshots,
    },
  }
}

async function deleteExistingSeedRows(ctx: MutationCtx, teamId: Id<"teams">) {
  const seedDevelopers = (
    await ctx.db
      .query("developers")
      .withIndex("by_teamId_status", (q) => q.eq("teamId", teamId))
      .collect()
  ).filter(
    (developer) =>
      developer.metadata?.notes === LOCAL_SEED_NOTE ||
      (developer.email?.endsWith(LOCAL_SEED_EMAIL_DOMAIN) ?? false)
  )
  const seedDeveloperIds = new Set(seedDevelopers.map((developer) => developer._id))
  const deleted = {
    developers: 0,
    developerTokens: 0,
    devices: 0,
    metricSamples: 0,
    usageSnapshots: 0,
  }

  deleted.metricSamples = await deleteRows(ctx, "metricSamples", teamId, (row) =>
    row.developerId ? seedDeveloperIds.has(row.developerId) : false
  )
  deleted.usageSnapshots = await deleteRows(ctx, "usageSnapshots", teamId, (row) =>
    seedDeveloperIds.has(row.developerId)
  )
  deleted.devices = await deleteRows(ctx, "devices", teamId, (row) =>
    seedDeveloperIds.has(row.developerId)
  )
  deleted.developerTokens = await deleteRows(ctx, "developerTokens", teamId, (row) =>
    seedDeveloperIds.has(row.developerId)
  )

  for (const developer of seedDevelopers) {
    await ctx.db.delete(developer._id)
    deleted.developers += 1
  }

  return deleted
}

async function upsertSeedProviders(ctx: MutationCtx, teamId: Id<"teams">, now: number) {
  const existing = await ctx.db
    .query("providers")
    .withIndex("by_teamId_status", (q) => q.eq("teamId", teamId))
    .collect()
  let touched = 0

  for (const provider of seedProviders) {
    const row = existing.find((candidate) => candidate.providerId === provider.providerId)
    if (row) {
      await ctx.db.patch(row._id, {
        name: provider.name,
        status: "enabled",
        brandColor: provider.brandColor,
        updatedAt: now,
      })
    } else {
      await ctx.db.insert("providers", {
        teamId,
        providerId: provider.providerId,
        name: provider.name,
        status: "enabled",
        brandColor: provider.brandColor,
        createdAt: now,
        updatedAt: now,
      })
    }
    touched += 1
  }

  return touched
}

async function createSeedDevelopers(ctx: MutationCtx, teamId: Id<"teams">, now: number) {
  const seeds = seedDevelopers(now)
  const developers = []

  for (const seed of seeds) {
    const id = await ctx.db.insert("developers", {
      teamId,
      displayName: seed.name,
      email: `${seed.slug}${LOCAL_SEED_EMAIL_DOMAIN}`,
      status: seed.status,
      ...(seed.metadataNotes ? { metadata: { notes: seed.metadataNotes } } : {}),
      createdAt: now,
      updatedAt: now - seed.offsetMs,
      lastSeenAt: now - seed.offsetMs,
    })
    developers.push({ ...seed, id })
  }

  return developers
}

async function deleteRows<TTable extends "developerTokens" | "devices" | "metricSamples" | "usageSnapshots">(
  ctx: MutationCtx,
  table: TTable,
  teamId: Id<"teams">,
  shouldDelete: (row: Awaited<ReturnType<ReturnType<typeof ctx.db.query<TTable>>["collect"]>>[number]) => boolean
) {
  const rows = await ctx.db.query(table).collect()
  let count = 0

  for (const row of rows) {
    if (row.teamId !== teamId || !shouldDelete(row)) continue
    await ctx.db.delete(row._id)
    count += 1
  }

  return count
}

function dayWithOffset(day: string, offset: number) {
  const date = new Date(`${day}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

function periodForDay(day: string) {
  const start = Date.parse(`${day}T00:00:00.000Z`)
  return { start, end: start + 24 * 60 * 60 * 1000 - 1 }
}
