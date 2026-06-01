export type SetupTeam = {
  name: string
  slug: string
  setupCompletedAt: number | null
}

export type SetupOwner = {
  clerkUserId: string | null
  email: string | null
  name: string | null
  role: "owner"
  createdAt: number | null
}

export type SetupState =
  | {
      status: "setup-needed"
      reason: "team-missing"
      team: null
      owner: null
    }
  | {
      status: "setup-complete"
      reason: null
      team: SetupTeam
      owner: SetupOwner
    }
  | {
      status: "setup-broken"
      reason: "team-missing" | "owner-missing"
      team: SetupTeam | null
      owner: SetupOwner | null
    }

export type SetupClaimErrorCode =
  | "not-authenticated"
  | "setup-token-not-configured"
  | "team-name-required"
  | "setup-token-required"
  | "invalid-setup-token"
  | "setup-state-invalid"

export type SetupClaimResult =
  | ({
      ok: true
      message: string
    } & Extract<SetupState, { status: "setup-complete" }>)
  | {
      ok: false
      status: "error"
      code: SetupClaimErrorCode
      message: string
    }

export type SetupClaimIdentity = {
  clerkUserId: string
  email: string | null
  name: string | null
}

export type SetupTeamRecord = {
  _id: string
  name: string
  slug: string
  setupCompletedAt?: number
  createdAt: number
  updatedAt: number
}

export type SetupOwnerRecord = {
  teamId: string
  clerkUserId: string
  email?: string
  name?: string
  role: "owner"
  createdAt: number
  updatedAt: number
}

export type NewSetupTeamRecord = Omit<SetupTeamRecord, "_id">
export type NewSetupOwnerRecord = SetupOwnerRecord

export type SetupClaimStore = {
  getTeam: () => Promise<SetupTeamRecord | null>
  getOwner: () => Promise<SetupOwnerRecord | null>
  createTeam: (team: NewSetupTeamRecord) => Promise<SetupTeamRecord>
  createOwner: (owner: NewSetupOwnerRecord) => Promise<void>
}

export type SetupClaimInput = {
  teamName: string
  setupToken: string
}

export function getSetupState(
  team: SetupTeamRecord | null,
  owner: SetupOwnerRecord | null,
  options: { exposeOwnerDetails?: boolean } = {}
): SetupState {
  if (!team && !owner) {
    return {
      status: "setup-needed",
      reason: "team-missing",
      team: null,
      owner: null,
    }
  }

  if (team && owner) {
    return {
      status: "setup-complete",
      reason: null,
      team: publicTeam(team),
      owner: publicOwner(owner, options.exposeOwnerDetails === true),
    }
  }

  return {
    status: "setup-broken",
    reason: team ? "owner-missing" : "team-missing",
    team: team ? publicTeam(team) : null,
    owner: owner ? publicOwner(owner, options.exposeOwnerDetails === true) : null,
  }
}

export async function claimFirstOwner(args: {
  input: SetupClaimInput
  identity: SetupClaimIdentity | null
  expectedSetupToken: string | undefined
  now: number
  store: SetupClaimStore
}): Promise<SetupClaimResult> {
  const existingTeam = await args.store.getTeam()
  const existingOwner = await args.store.getOwner()
  const existingState = getSetupState(existingTeam, existingOwner, {
    exposeOwnerDetails: existingOwner?.clerkUserId === args.identity?.clerkUserId,
  })

  if (existingState.status === "setup-complete") {
    return {
      ok: true,
      message: "Setup is already complete.",
      ...existingState,
    }
  }

  if (existingState.status === "setup-broken") {
    return setupError(
      "setup-state-invalid",
      "Setup data is incomplete. Fix the Convex team/admin rows manually."
    )
  }

  if (!args.identity) {
    return setupError("not-authenticated", "Sign in with Clerk before claiming setup.")
  }

  if (!args.expectedSetupToken) {
    return setupError(
      "setup-token-not-configured",
      "SETUP_TOKEN is missing from Convex environment variables."
    )
  }

  const teamName = args.input.teamName.trim()
  if (!teamName) {
    return setupError("team-name-required", "Team name is required.")
  }

  const setupToken = args.input.setupToken.trim()
  if (!setupToken) {
    return setupError("setup-token-required", "Setup token is required.")
  }

  if (setupToken !== args.expectedSetupToken) {
    return setupError("invalid-setup-token", "Setup token is invalid.")
  }

  const team = await args.store.createTeam({
    name: teamName,
    slug: slugFromTeamName(teamName),
    setupCompletedAt: args.now,
    createdAt: args.now,
    updatedAt: args.now,
  })

  const owner: NewSetupOwnerRecord = {
    teamId: team._id,
    clerkUserId: args.identity.clerkUserId,
    email: args.identity.email ?? undefined,
    name: args.identity.name ?? undefined,
    role: "owner",
    createdAt: args.now,
    updatedAt: args.now,
  }

  await args.store.createOwner(owner)

  return {
    ok: true,
    status: "setup-complete",
    reason: null,
    message: "Setup complete.",
    team: publicTeam(team),
    owner: publicOwner(owner, true),
  }
}

export function slugFromTeamName(teamName: string) {
  const slug = teamName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "team"
}

function publicTeam(team: SetupTeamRecord): SetupTeam {
  return {
    name: team.name,
    slug: team.slug,
    setupCompletedAt: team.setupCompletedAt ?? null,
  }
}

function publicOwner(owner: SetupOwnerRecord, exposeDetails: boolean): SetupOwner {
  return {
    clerkUserId: exposeDetails ? owner.clerkUserId : null,
    email: exposeDetails ? (owner.email ?? null) : null,
    name: exposeDetails ? (owner.name ?? null) : null,
    role: owner.role,
    createdAt: exposeDetails ? owner.createdAt : null,
  }
}

function setupError(code: SetupClaimErrorCode, message: string): SetupClaimResult {
  return {
    ok: false,
    status: "error",
    code,
    message,
  }
}
