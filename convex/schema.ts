import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  teams: defineTable({
    name: v.string(),
    slug: v.string(),
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
})
