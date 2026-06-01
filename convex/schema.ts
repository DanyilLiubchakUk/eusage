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
})
