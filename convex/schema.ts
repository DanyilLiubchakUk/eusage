import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  teams: defineTable({
    name: v.string(),
    slug: v.string(),
    reportingTimeZone: v.optional(v.string()),
    setupCompletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),
  admins: defineTable({
    teamId: v.id("teams"),
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    role: v.literal("owner"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_teamId", ["teamId"]),
  developers: defineTable({
    teamId: v.id("teams"),
    displayName: v.string(),
    email: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    metadata: v.optional(
      v.object({
        notes: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSeenAt: v.optional(v.number()),
  }).index("by_teamId_status", ["teamId", "status"]),
  developerTokens: defineTable({
    teamId: v.id("teams"),
    developerId: v.id("developers"),
    tokenHash: v.string(),
    fingerprint: v.string(),
    label: v.string(),
    status: v.union(v.literal("active"), v.literal("revoked")),
    createdAt: v.number(),
    rotatedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    lastUsedAt: v.optional(v.number()),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_developerId_status", ["developerId", "status"])
    .index("by_teamId_status", ["teamId", "status"]),
  devices: defineTable({
    teamId: v.id("teams"),
    developerId: v.id("developers"),
    deviceId: v.string(),
    deviceName: v.string(),
    os: v.string(),
    appVersion: v.string(),
    status: v.union(
      v.literal("connected"),
      v.literal("stale"),
      v.literal("disconnected"),
      v.literal("archived")
    ),
    lastSeenAt: v.number(),
    lastSyncAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_deviceId", ["deviceId"])
    .index("by_developerId_status", ["developerId", "status"])
    .index("by_teamId_status", ["teamId", "status"])
    .index("by_lastSeenAt", ["lastSeenAt"]),
  providers: defineTable({
    teamId: v.id("teams"),
    providerId: v.string(),
    name: v.string(),
    status: v.union(v.literal("enabled"), v.literal("disabled")),
    brandColor: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_teamId_providerId", ["teamId", "providerId"])
    .index("by_teamId_status", ["teamId", "status"]),
  providerAccounts: defineTable({
    teamId: v.id("teams"),
    developerId: v.id("developers"),
    providerId: v.string(),
    teamAccountFingerprint: v.string(),
    label: v.string(),
    status: v.literal("shared"),
    firstSharedAt: v.number(),
    lastSharedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_team_developer_provider_account", [
      "teamId",
      "developerId",
      "providerId",
      "teamAccountFingerprint",
    ])
    .index("by_team_account_fingerprint", ["teamId", "teamAccountFingerprint"]),
  usageSnapshots: defineTable({
    teamId: v.id("teams"),
    developerId: v.id("developers"),
    deviceId: v.string(),
    providerId: v.string(),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
    periodKey: v.string(),
    dataIdentity: v.string(),
    summary: v.any(),
    summaryVersion: v.string(),
    extractorVersion: v.record(v.string(), v.string()),
    metricFamilies: v.array(v.string()),
    rawPayloadId: v.optional(v.id("rawPayloads")),
    capturedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_snapshot_identity", [
      "teamId",
      "developerId",
      "deviceId",
      "providerId",
      "periodKey",
      "dataIdentity",
    ])
    .index("by_team_provider_period", ["teamId", "providerId", "periodKey"])
    .index("by_team_developer_provider_period", [
      "teamId",
      "developerId",
      "providerId",
      "periodKey",
    ])
    .index("by_team_updatedAt", ["teamId", "updatedAt"])
    .index("by_team_developer_updatedAt", ["teamId", "developerId", "updatedAt"]),
  rawPayloads: defineTable({
    teamId: v.id("teams"),
    developerId: v.id("developers"),
    deviceId: v.string(),
    providerId: v.string(),
    payload: v.any(),
    payloadVersion: v.string(),
    redactionVersion: v.string(),
    capturedAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_team_provider_capturedAt", ["teamId", "providerId", "capturedAt"])
    .index("by_developer_provider_capturedAt", [
      "developerId",
      "providerId",
      "capturedAt",
    ])
    .index("by_expiresAt", ["expiresAt"]),
  metricSamples: defineTable({
    teamId: v.id("teams"),
    providerId: v.string(),
    developerId: v.optional(v.id("developers")),
    deviceId: v.optional(v.string()),
    metricKey: v.string(),
    value: v.number(),
    unit: v.string(),
    sampleDay: v.string(),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
    bucket: v.optional(
      v.object({
        kind: v.literal("reportingDay"),
        day: v.string(),
        reportingTimeZone: v.string(),
        startMs: v.number(),
        endMs: v.number(),
      })
    ),
    source: v.union(
      v.literal("providerReported"),
      v.literal("normalized"),
      v.literal("estimated")
    ),
    coverage: v.optional(v.any()),
    summaryVersion: v.string(),
    extractorVersion: v.record(v.string(), v.string()),
    capturedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sample_identity", [
      "teamId",
      "providerId",
      "developerId",
      "metricKey",
      "sampleDay",
      "periodStart",
      "periodEnd",
    ])
    .index("by_sample_identity_device", [
      "teamId",
      "providerId",
      "developerId",
      "deviceId",
      "metricKey",
      "sampleDay",
      "periodStart",
      "periodEnd",
    ])
    .index("by_team_metric_day", ["teamId", "metricKey", "sampleDay"])
    .index("by_team_provider_metric_day", [
      "teamId",
      "providerId",
      "metricKey",
      "sampleDay",
    ])
    .index("by_team_developer_metric_day", [
      "teamId",
      "developerId",
      "metricKey",
      "sampleDay",
    ]),
  syncErrors: defineTable({
    teamId: v.id("teams"),
    developerId: v.optional(v.id("developers")),
    deviceId: v.optional(v.string()),
    providerId: v.optional(v.string()),
    errorCode: v.string(),
    message: v.string(),
    details: v.optional(
      v.object({
        reason: v.string(),
        field: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_team_createdAt", ["teamId", "createdAt"])
    .index("by_expiresAt", ["expiresAt"]),
  dashboardSettings: defineTable({
    teamId: v.id("teams"),
    defaultDateRange: v.any(),
    visibleProviderIds: v.optional(v.array(v.string())),
    hiddenDeveloperIds: v.array(v.id("developers")),
    includeInactiveDevelopers: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_teamId", ["teamId"]),
  tvSettings: defineTable({
    teamId: v.id("teams"),
    dateRange: v.any(),
    visibleProviderIds: v.optional(v.array(v.string())),
    visibleDeveloperIds: v.optional(v.array(v.id("developers"))),
    slides: v.array(
      v.object({
        id: v.string(),
        enabled: v.boolean(),
        order: v.number(),
        durationSeconds: v.number(),
      })
    ),
    theme: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_teamId", ["teamId"]),
  tvDisplayLinks: defineTable({
    teamId: v.id("teams"),
    tokenHash: v.string(),
    fingerprint: v.string(),
    status: v.union(v.literal("active"), v.literal("revoked")),
    createdAt: v.number(),
    rotatedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_teamId_status", ["teamId", "status"]),
})
