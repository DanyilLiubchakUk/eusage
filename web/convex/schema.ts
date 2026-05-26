import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  organizations: defineTable({
    orgId: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_org_id", ["orgId"]),

  teammates: defineTable({
    orgId: v.string(),
    teammateId: v.string(),
    name: v.string(),
    writeTokenHash: v.string(),
    writeTokenPrefix: v.string(),
    writeTokenSuffix: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_org_id", ["orgId"])
    .index("by_write_token_hash", ["writeTokenHash"]),

  readTokens: defineTable({
    orgId: v.string(),
    label: v.string(),
    tokenHash: v.string(),
    tokenPrefix: v.string(),
    tokenSuffix: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_org_id", ["orgId"])
    .index("by_token_hash", ["tokenHash"]),

  snapshots: defineTable({
    orgId: v.string(),
    teammateId: v.string(),
    providerId: v.string(),
    snapshot: v.any(),
    updatedAt: v.number(),
  })
    .index("by_org_teammate", ["orgId", "teammateId"])
    .index("by_org_provider", ["orgId", "providerId"])
    .index("by_org_teammate_provider", [
      "orgId",
      "teammateId",
      "providerId",
    ]),
});
