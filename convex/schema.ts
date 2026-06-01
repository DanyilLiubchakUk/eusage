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
})
