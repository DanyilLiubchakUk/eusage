import { describe, expect, it } from "vitest"
import { createDeveloperWithToken } from "./developerTokens"
import {
  organizationScopeIdentityFromConvex,
  resolveActiveOrganizationOwner,
  type OrganizationMappingRecord,
  type OrganizationOwnerRecord,
  type OrganizationTeamRecord,
} from "./organizationScope"

const now = 1780320000000
const alphaTeam = {
  _id: "team-alpha",
  name: "Alpha Team",
  slug: "alpha-team",
}
const betaTeam = {
  _id: "team-beta",
  name: "Beta Team",
  slug: "beta-team",
}
const teams: OrganizationTeamRecord[] = [alphaTeam, betaTeam]
const owners: OrganizationOwnerRecord[] = [
  {
    teamId: "team-alpha",
    clerkUserId: "user_alpha_owner",
    role: "owner",
  },
  {
    teamId: "team-beta",
    clerkUserId: "user_beta_owner",
    role: "owner",
  },
]
const organizations: OrganizationMappingRecord[] = [
  {
    clerkOrganizationId: "org_alpha",
    teamId: "team-alpha",
    createdAt: now,
    updatedAt: now,
  },
  {
    clerkOrganizationId: "org_beta",
    teamId: "team-beta",
    createdAt: now,
    updatedAt: now,
  },
]

describe("active Organization scope", () => {
  it("reads Clerk active Organization ID from the Convex identity", () => {
    expect(
      organizationScopeIdentityFromConvex({
        subject: "user_alpha_owner",
        org_id: "org_alpha",
      })
    ).toEqual({
      clerkUserId: "user_alpha_owner",
      clerkOrganizationId: "org_alpha",
    })
  })

  it("requires an active Clerk Organization before tenant data access", async () => {
    const result = await resolveActiveOrganizationOwner({
      identity: {
        clerkUserId: "user_alpha_owner",
        clerkOrganizationId: null,
      },
      store: scopeStore(),
    })

    expect(result).toEqual({
      status: "organization-required",
      clerkOrganizationId: null,
      team: null,
    })
  })

  it("resolves tenant reads from the active Organization mapping", async () => {
    const result = await resolveActiveOrganizationOwner({
      identity: {
        clerkUserId: "user_beta_owner",
        clerkOrganizationId: "org_beta",
      },
      store: scopeStore(),
    })

    expect(result.status).toBe("ready")
    if (result.status !== "ready") throw new Error("Expected ready Organization scope.")
    expect(result.team._id).toBe("team-beta")
  })

  it("blocks a user from reading another Organization mapping", async () => {
    const result = await resolveActiveOrganizationOwner({
      identity: {
        clerkUserId: "user_alpha_owner",
        clerkOrganizationId: "org_beta",
      },
      store: scopeStore(),
    })

    expect(result).toMatchObject({
      status: "not-owner",
      clerkOrganizationId: "org_beta",
      team: betaTeam,
    })
  })

  it("writes developers only to the active Organization team", async () => {
    const ownerState = await resolveActiveOrganizationOwner({
      identity: {
        clerkUserId: "user_beta_owner",
        clerkOrganizationId: "org_beta",
      },
      store: scopeStore(),
    })
    if (ownerState.status !== "ready") {
      throw new Error("Expected ready Organization scope.")
    }
    const developers: Array<{ teamId: string; displayName: string }> = []
    const tokens: Array<{ teamId: string; developerId: string }> = []

    const result = await createDeveloperWithToken({
      input: {
        displayName: "Beta Dev",
        tokenLabel: "Laptop",
      },
      identity: { clerkUserId: "user_beta_owner" },
      now,
      rawToken: "eusage_dev_beta_secret",
      store: {
        getTeam: async () => ownerState.team,
        getOwner: async () => ownerState.owner,
        createDeveloper: async (developer) => {
          const created = {
            _id: `developer-${developers.length + 1}`,
            ...developer,
          }
          developers.push(created)
          return created
        },
        createToken: async (token) => {
          const created = {
            _id: `token-${tokens.length + 1}`,
            ...token,
          }
          tokens.push(created)
          return created
        },
      },
    })

    expect(result.ok).toBe(true)
    expect(developers).toHaveLength(1)
    expect(developers[0].teamId).toBe("team-beta")
    expect(tokens[0].teamId).toBe("team-beta")
  })
})

function scopeStore() {
  return {
    getOrganization: async (clerkOrganizationId: string) =>
      organizations.find(
        (organization) => organization.clerkOrganizationId === clerkOrganizationId
      ) ?? null,
    getTeam: async (teamId: string) =>
      teams.find((team) => team._id === teamId) ?? null,
    getOwner: async (teamId: string) =>
      owners.find((owner) => owner.teamId === teamId) ?? null,
  }
}
