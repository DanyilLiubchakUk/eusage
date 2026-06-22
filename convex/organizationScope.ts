import type { Doc, Id } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"

export type OrganizationScopeIdentity = {
  clerkUserId: string
  clerkOrganizationId: string | null
  clerkOrganizationRole: OrganizationRole | null
}

export type OrganizationRole = "owner" | "admin" | "developer"
export type OrganizationManagerRole = Extract<OrganizationRole, "owner" | "admin">

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
  getOrganizationByTeamId?: (
    teamId: TTeamId
  ) => Promise<OrganizationMappingRecord<TTeamId> | null>
  getTeam: (teamId: TTeamId) => Promise<TTeam | null>
  getOwner: (teamId: TTeamId) => Promise<TOwner | null>
  getOwnerByClerkUserId?: (clerkUserId: string) => Promise<TOwner | null>
}

export type ActiveOrganizationManagerState<
  TTeamId extends string = string,
  TTeam extends OrganizationTeamRecord<TTeamId> = OrganizationTeamRecord<TTeamId>,
  TOwner extends OrganizationOwnerRecord<TTeamId> = OrganizationOwnerRecord<TTeamId>,
> =
  | {
      status: "ready"
      clerkUserId: string
      clerkOrganizationId: string
      role: OrganizationManagerRole
      team: TTeam
      owner: TOwner
    }
  | {
      status: "role-not-authorized"
      clerkOrganizationId: string
      role: OrganizationRole | null
      team: TTeam
    }
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
  ActiveOrganizationManagerState["status"],
  "ready"
>

export function clerkOrganizationIdFromIdentity(
  identity: { [key: string]: unknown } | null
) {
  const orgId = identity?.org_id
  if (typeof orgId === "string" && orgId.trim()) return orgId.trim()

  const organization = objectClaim(identity?.o)
  const v2OrgId = organization?.id
  return typeof v2OrgId === "string" && v2OrgId.trim() ? v2OrgId.trim() : null
}

export function clerkOrganizationRoleFromIdentity(
  identity: { [key: string]: unknown } | null
) {
  const orgRole = identity?.org_role
  if (typeof orgRole === "string") return normalizeOrganizationRole(orgRole)

  const organization = objectClaim(identity?.o)
  const v2Role = organization?.rol
  return typeof v2Role === "string" ? normalizeOrganizationRole(v2Role) : null
}

export function organizationScopeIdentityFromConvex(
  identity: ({ subject: string } & { [key: string]: unknown }) | null
): OrganizationScopeIdentity | null {
  if (!identity) return null

  return {
    clerkUserId: identity.subject,
    clerkOrganizationId: clerkOrganizationIdFromIdentity(identity),
    clerkOrganizationRole: clerkOrganizationRoleFromIdentity(identity),
  }
}

export function isOrganizationManagerRole(
  role: OrganizationRole | null | undefined
): role is OrganizationManagerRole {
  return role === "owner" || role === "admin"
}

export async function resolveActiveOrganizationManager<
  TTeamId extends string,
  TTeam extends OrganizationTeamRecord<TTeamId>,
  TOwner extends OrganizationOwnerRecord<TTeamId>,
>(args: {
  identity: OrganizationScopeIdentity | null
  store: OrganizationScopeStore<TTeamId, TTeam, TOwner>
}): Promise<ActiveOrganizationManagerState<TTeamId, TTeam, TOwner>> {
  if (!args.identity) {
    return { status: "not-authenticated", clerkOrganizationId: null, team: null }
  }

  const clerkOrganizationId = args.identity.clerkOrganizationId
  if (!clerkOrganizationId) {
    const ownerScope = await resolveOwnerScopeWithoutOrganizationClaim({
      identity: args.identity,
      store: args.store,
    })
    if (ownerScope) return ownerScope
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

  if (!isOrganizationManagerRole(args.identity.clerkOrganizationRole)) {
    return {
      status: "role-not-authorized",
      clerkOrganizationId,
      role: args.identity.clerkOrganizationRole,
      team,
    }
  }

  return {
    status: "ready",
    clerkUserId: args.identity.clerkUserId,
    clerkOrganizationId,
    role: args.identity.clerkOrganizationRole,
    team,
    owner,
  }
}

async function resolveOwnerScopeWithoutOrganizationClaim<
  TTeamId extends string,
  TTeam extends OrganizationTeamRecord<TTeamId>,
  TOwner extends OrganizationOwnerRecord<TTeamId>,
>(args: {
  identity: OrganizationScopeIdentity
  store: OrganizationScopeStore<TTeamId, TTeam, TOwner>
}): Promise<ActiveOrganizationManagerState<TTeamId, TTeam, TOwner> | null> {
  if (!args.store.getOwnerByClerkUserId || !args.store.getOrganizationByTeamId) {
    return null
  }

  const owner = await args.store.getOwnerByClerkUserId(args.identity.clerkUserId)
  if (!owner) return null

  const team = await args.store.getTeam(owner.teamId)
  const organization = await args.store.getOrganizationByTeamId(owner.teamId)
  if (!team || owner.teamId !== team._id) {
    return { status: "setup-state-invalid", clerkOrganizationId: null, team: null }
  }

  return {
    status: "ready",
    clerkUserId: args.identity.clerkUserId,
    clerkOrganizationId: organization?.clerkOrganizationId ?? `owner:${owner.teamId}`,
    role: "owner",
    team,
    owner,
  }
}

export async function getActiveOrganizationManagerState(ctx: QueryCtx | MutationCtx) {
  const identity = organizationScopeIdentityFromConvex(
    await ctx.auth.getUserIdentity()
  )

  return resolveActiveOrganizationManager<Id<"teams">, Doc<"teams">, Doc<"admins">>({
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
      getOwnerByClerkUserId: async (clerkUserId) =>
        ctx.db
          .query("admins")
          .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
          .first(),
      getOrganizationByTeamId: async (teamId) =>
        ctx.db
          .query("organizations")
          .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
          .first(),
    },
  })
}

function normalizeOrganizationRole(role: string): OrganizationRole | null {
  const normalized = role.trim().toLowerCase().replace(/^org:/, "")
  if (normalized === "owner" || normalized === "admin") return normalized
  if (normalized === "developer" || normalized === "member") return "developer"
  return null
}

function objectClaim(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}
