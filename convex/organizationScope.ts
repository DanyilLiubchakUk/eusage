import type { Doc, Id } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"

export type OrganizationScopeIdentity = {
  clerkUserId: string
  clerkOrganizationId: string | null
}

export type OrganizationMappingRecord<TTeamId extends string = string> = {
  clerkOrganizationId: string
  teamId: TTeamId
  createdAt: number
  updatedAt: number
}

export type OrganizationTeamRecord<TTeamId extends string = string> = {
  _id: TTeamId
  name: string
  slug: string
  reportingTimeZone?: string
}

export type OrganizationOwnerRecord<TTeamId extends string = string> = {
  teamId: TTeamId
  clerkUserId: string
  role: "owner"
}

export type OrganizationScopeStore<
  TTeamId extends string = string,
  TTeam extends OrganizationTeamRecord<TTeamId> = OrganizationTeamRecord<TTeamId>,
  TOwner extends OrganizationOwnerRecord<TTeamId> = OrganizationOwnerRecord<TTeamId>,
> = {
  getOrganization: (
    clerkOrganizationId: string
  ) => Promise<OrganizationMappingRecord<TTeamId> | null>
  getTeam: (teamId: TTeamId) => Promise<TTeam | null>
  getOwner: (teamId: TTeamId) => Promise<TOwner | null>
}

export type ActiveOrganizationOwnerState<
  TTeamId extends string = string,
  TTeam extends OrganizationTeamRecord<TTeamId> = OrganizationTeamRecord<TTeamId>,
  TOwner extends OrganizationOwnerRecord<TTeamId> = OrganizationOwnerRecord<TTeamId>,
> =
  | { status: "ready"; clerkOrganizationId: string; team: TTeam; owner: TOwner }
  | { status: "not-owner"; clerkOrganizationId: string; team: TTeam }
  | {
      status:
        | "not-authenticated"
        | "organization-required"
        | "organization-not-configured"
        | "setup-state-invalid"
      clerkOrganizationId: string | null
      team: null
    }

export type OrganizationScopeFailureStatus = Exclude<
  ActiveOrganizationOwnerState["status"],
  "ready"
>

export function clerkOrganizationIdFromIdentity(
  identity: { [key: string]: unknown } | null
) {
  const orgId = identity?.org_id
  return typeof orgId === "string" && orgId.trim() ? orgId.trim() : null
}

export function organizationScopeIdentityFromConvex(
  identity: ({ subject: string } & { [key: string]: unknown }) | null
): OrganizationScopeIdentity | null {
  if (!identity) return null

  return {
    clerkUserId: identity.subject,
    clerkOrganizationId: clerkOrganizationIdFromIdentity(identity),
  }
}

export async function resolveActiveOrganizationOwner<
  TTeamId extends string,
  TTeam extends OrganizationTeamRecord<TTeamId>,
  TOwner extends OrganizationOwnerRecord<TTeamId>,
>(args: {
  identity: OrganizationScopeIdentity | null
  store: OrganizationScopeStore<TTeamId, TTeam, TOwner>
}): Promise<ActiveOrganizationOwnerState<TTeamId, TTeam, TOwner>> {
  if (!args.identity) {
    return { status: "not-authenticated", clerkOrganizationId: null, team: null }
  }

  const clerkOrganizationId = args.identity.clerkOrganizationId
  if (!clerkOrganizationId) {
    return { status: "organization-required", clerkOrganizationId: null, team: null }
  }

  const organization = await args.store.getOrganization(clerkOrganizationId)
  if (!organization) {
    return { status: "organization-not-configured", clerkOrganizationId, team: null }
  }

  const team = await args.store.getTeam(organization.teamId)
  const owner = await args.store.getOwner(organization.teamId)
  if (!team || !owner || owner.teamId !== team._id) {
    return { status: "setup-state-invalid", clerkOrganizationId, team: null }
  }

  if (owner.clerkUserId !== args.identity.clerkUserId) {
    return { status: "not-owner", clerkOrganizationId, team }
  }

  return {
    status: "ready",
    clerkOrganizationId,
    team,
    owner,
  }
}

export async function getActiveOrganizationOwnerState(ctx: QueryCtx | MutationCtx) {
  const identity = organizationScopeIdentityFromConvex(
    await ctx.auth.getUserIdentity()
  )

  return resolveActiveOrganizationOwner<Id<"teams">, Doc<"teams">, Doc<"admins">>({
    identity,
    store: {
      getOrganization: async (clerkOrganizationId) =>
        ctx.db
          .query("organizations")
          .withIndex("by_clerkOrganizationId", (q) =>
            q.eq("clerkOrganizationId", clerkOrganizationId)
          )
          .first(),
      getTeam: async (teamId) => ctx.db.get(teamId),
      getOwner: async (teamId) =>
        ctx.db
          .query("admins")
          .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
          .first(),
    },
  })
}
