import { query } from "./_generated/server"

export const get = query({
  args: {},
  handler: async (ctx) => {
    const team = await ctx.db.query("teams").first()

    if (!team) {
      return {
        status: "setup-needed" as const,
        reason: "team-missing" as const,
        team: null,
      }
    }

    return {
      status: "setup-complete" as const,
      reason: null,
      team: {
        name: team.name,
        slug: team.slug,
        setupCompletedAt: team.setupCompletedAt ?? null,
      },
    }
  },
})
