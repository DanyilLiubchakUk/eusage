import { mutation, query } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import {
  claimFirstOwner,
  getSetupState,
  type SetupClaimIdentity,
} from "./setupClaim"
import { v } from "convex/values"

export const get = query({
  args: {},
  handler: async (ctx) => {
    const team = await ctx.db.query("teams").first()
    const owner = await ctx.db.query("admins").first()
    const identity = await ctx.auth.getUserIdentity()

    return getSetupState(team, owner, {
      exposeOwnerDetails: owner?.clerkUserId === identity?.subject,
    })
  },
})

export const claimOwner = mutation({
  args: {
    teamName: v.string(),
    setupToken: v.string(),
  },
  handler: async (ctx, input) => {
    const identity = await ctx.auth.getUserIdentity()
    const claimIdentity: SetupClaimIdentity | null = identity
      ? {
          clerkUserId: identity.subject,
          email: identity.email ?? null,
          name: identity.name ?? null,
        }
      : null

    return claimFirstOwner({
      input,
      identity: claimIdentity,
      expectedSetupToken: process.env.SETUP_TOKEN,
      now: Date.now(),
      store: {
        getTeam: async () => ctx.db.query("teams").first(),
        getOwner: async () => ctx.db.query("admins").first(),
        createTeam: async (team) => {
          const id = await ctx.db.insert("teams", team)
          const created = await ctx.db.get(id)
          if (!created) {
            throw new Error("Created team row was not readable.")
          }
          return created
        },
        createOwner: async (owner) => {
          await ctx.db.insert("admins", {
            ...owner,
            teamId: owner.teamId as Id<"teams">,
          })
        },
      },
    })
  },
})
