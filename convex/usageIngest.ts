import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { mutation, type MutationCtx } from "./_generated/server"
import type { DeveloperTeamRecord } from "./developerTokens"
import { ingestUsageBatch } from "./usageIngestCore"
import {
  type MetricSampleRecord,
  type NewMetricSampleRecord,
  type NewRawPayloadRecord,
  type NewUsageSnapshotRecord,
  type RawPayloadRecord,
  type UsageIngestStore,
  type UsageSnapshotRecord,
} from "./usageIngestTypes"

export {
  RAW_PAYLOAD_RETENTION_MS,
  SUPPORTED_UPLOAD_SCHEMA_VERSION,
  SYNC_ERROR_RETENTION_MS,
  type ExtractorVersion,
  type JsonObject,
  type MetricReportingBucket,
  type MetricSampleRecord,
  type MetricSource,
  type NewMetricSampleRecord,
  type NewRawPayloadRecord,
  type NewSyncErrorRecord,
  type NewUsageSnapshotRecord,
  type RawPayloadRecord,
  type SyncErrorRecord,
  type UsageBatchResult,
  type UsageIngestStore,
  type UsageMetricSampleInput,
  type UsageProviderInput,
  type UsageSnapshotRecord,
  type UsageSummary,
} from "./usageIngestTypes"
export { ingestUsageBatch } from "./usageIngestCore"

export const uploadBatch = mutation({
  args: {
    tokenHash: v.string(),
    batch: v.any(),
  },
  handler: async (ctx, input) =>
    ingestUsageBatch({
      input,
      now: Date.now(),
      store: createUsageIngestStore(ctx),
    }),
})

function createUsageIngestStore(ctx: MutationCtx): UsageIngestStore {
  return {
    getTeam: async () =>
      ctx.db.query("teams").first() as Promise<DeveloperTeamRecord | null>,
    getTokenByHash: async (tokenHash) =>
      ctx.db
        .query("developerTokens")
        .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
        .first(),
    getDeveloper: async (developerId) =>
      ctx.db.get(developerId as Id<"developers">),
    getDeviceByDeviceId: async (deviceId) =>
      ctx.db
        .query("devices")
        .withIndex("by_deviceId", (q) => q.eq("deviceId", deviceId))
        .first(),
    updateDevice: async (deviceRecordId, patch) => {
      const { developerId, ...rest } = patch
      await ctx.db.patch(deviceRecordId as Id<"devices">, {
        ...rest,
        ...(developerId ? { developerId: developerId as Id<"developers"> } : {}),
      })
      const updated = await ctx.db.get(deviceRecordId as Id<"devices">)
      if (!updated) throw new Error("Updated device row was not readable.")
      return updated
    },
    updateDeveloper: async (developerId, patch) => {
      await ctx.db.patch(developerId as Id<"developers">, patch)
      const updated = await ctx.db.get(developerId as Id<"developers">)
      if (!updated) throw new Error("Updated developer row was not readable.")
      return updated
    },
    updateToken: async (tokenId, patch) => {
      await ctx.db.patch(tokenId as Id<"developerTokens">, patch)
      const updated = await ctx.db.get(tokenId as Id<"developerTokens">)
      if (!updated) throw new Error("Updated developer token row was not readable.")
      return updated
    },
    createRawPayload: async (payload) => {
      const id = await ctx.db.insert("rawPayloads", rawPayloadFields(payload))
      const created = await ctx.db.get(id)
      if (!created) throw new Error("Created raw payload row was not readable.")
      return created as RawPayloadRecord
    },
    getUsageSnapshot: async (snapshot) =>
      (await ctx.db
        .query("usageSnapshots")
        .withIndex("by_snapshot_identity", (q) =>
          q
            .eq("teamId", snapshot.teamId as Id<"teams">)
            .eq("developerId", snapshot.developerId as Id<"developers">)
            .eq("deviceId", snapshot.deviceId)
            .eq("providerId", snapshot.providerId)
            .eq("periodKey", snapshot.periodKey)
            .eq("dataIdentity", snapshot.dataIdentity)
        )
        .first()) as UsageSnapshotRecord | null,
    createUsageSnapshot: async (snapshot) => {
      const id = await ctx.db.insert("usageSnapshots", usageSnapshotFields(snapshot))
      const created = await ctx.db.get(id)
      if (!created) throw new Error("Created usage snapshot row was not readable.")
      return created as UsageSnapshotRecord
    },
    updateUsageSnapshot: async (snapshotId, patch) => {
      await ctx.db.patch(
        snapshotId as Id<"usageSnapshots">,
        usageSnapshotFields(patch as NewUsageSnapshotRecord)
      )
      const updated = await ctx.db.get(snapshotId as Id<"usageSnapshots">)
      if (!updated) throw new Error("Updated usage snapshot row was not readable.")
      return updated as UsageSnapshotRecord
    },
    getMetricSample: async (sample) =>
      (sample.deviceId
        ? ((await ctx.db
            .query("metricSamples")
            .withIndex("by_sample_identity_device", (q) =>
              q
                .eq("teamId", sample.teamId as Id<"teams">)
                .eq("providerId", sample.providerId)
                .eq("developerId", sample.developerId as Id<"developers">)
                .eq("deviceId", sample.deviceId)
                .eq("metricKey", sample.metricKey)
                .eq("sampleDay", sample.sampleDay)
                .eq("periodStart", sample.periodStart)
                .eq("periodEnd", sample.periodEnd)
            )
            .first()) as MetricSampleRecord | null)
        : ((await ctx.db
            .query("metricSamples")
            .withIndex("by_sample_identity", (q) =>
              q
                .eq("teamId", sample.teamId as Id<"teams">)
                .eq("providerId", sample.providerId)
                .eq("developerId", sample.developerId as Id<"developers">)
                .eq("metricKey", sample.metricKey)
                .eq("sampleDay", sample.sampleDay)
                .eq("periodStart", sample.periodStart)
                .eq("periodEnd", sample.periodEnd)
            )
            .first()) as MetricSampleRecord | null)),
    createMetricSample: async (sample) => {
      const id = await ctx.db.insert("metricSamples", metricSampleFields(sample))
      const created = await ctx.db.get(id)
      if (!created) throw new Error("Created metric sample row was not readable.")
      return created as MetricSampleRecord
    },
    updateMetricSample: async (sampleId, patch) => {
      await ctx.db.patch(
        sampleId as Id<"metricSamples">,
        metricSampleFields(patch as NewMetricSampleRecord)
      )
      const updated = await ctx.db.get(sampleId as Id<"metricSamples">)
      if (!updated) throw new Error("Updated metric sample row was not readable.")
      return updated as MetricSampleRecord
    },
    createSyncError: async (error) => {
      const { teamId, developerId, ...rest } = error
      const id = await ctx.db.insert("syncErrors", {
        ...rest,
        teamId: teamId as Id<"teams">,
        ...(developerId ? { developerId: developerId as Id<"developers"> } : {}),
      })
      const created = await ctx.db.get(id)
      if (!created) throw new Error("Created sync error row was not readable.")
      return created
    },
  }
}

function rawPayloadFields(payload: NewRawPayloadRecord) {
  return {
    ...payload,
    teamId: payload.teamId as Id<"teams">,
    developerId: payload.developerId as Id<"developers">,
  }
}

function usageSnapshotFields(snapshot: NewUsageSnapshotRecord) {
  return {
    teamId: snapshot.teamId as Id<"teams">,
    developerId: snapshot.developerId as Id<"developers">,
    deviceId: snapshot.deviceId,
    providerId: snapshot.providerId,
    ...(snapshot.periodStart !== undefined ? { periodStart: snapshot.periodStart } : {}),
    ...(snapshot.periodEnd !== undefined ? { periodEnd: snapshot.periodEnd } : {}),
    periodKey: snapshot.periodKey,
    dataIdentity: snapshot.dataIdentity,
    summary: snapshot.summary,
    summaryVersion: snapshot.summaryVersion,
    extractorVersion: snapshot.extractorVersion,
    metricFamilies: snapshot.metricFamilies,
    ...(snapshot.rawPayloadId
      ? { rawPayloadId: snapshot.rawPayloadId as Id<"rawPayloads"> }
      : {}),
    capturedAt: snapshot.capturedAt,
    updatedAt: snapshot.updatedAt,
  }
}

function metricSampleFields(sample: NewMetricSampleRecord) {
  return {
    teamId: sample.teamId as Id<"teams">,
    providerId: sample.providerId,
    ...(sample.developerId
      ? { developerId: sample.developerId as Id<"developers"> }
      : {}),
    ...(sample.deviceId ? { deviceId: sample.deviceId } : {}),
    metricKey: sample.metricKey,
    value: sample.value,
    unit: sample.unit,
    sampleDay: sample.sampleDay,
    ...(sample.periodStart !== undefined ? { periodStart: sample.periodStart } : {}),
    ...(sample.periodEnd !== undefined ? { periodEnd: sample.periodEnd } : {}),
    ...(sample.bucket !== undefined ? { bucket: sample.bucket } : {}),
    source: sample.source,
    ...(sample.coverage !== undefined ? { coverage: sample.coverage } : {}),
    summaryVersion: sample.summaryVersion,
    extractorVersion: sample.extractorVersion,
    capturedAt: sample.capturedAt,
    updatedAt: sample.updatedAt,
  }
}
