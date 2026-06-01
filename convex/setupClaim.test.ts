import { describe, expect, it } from "vitest"
import {
  claimFirstOwner,
  type NewSetupOwnerRecord,
  type NewSetupTeamRecord,
  type SetupClaimStore,
  type SetupOwnerRecord,
  type SetupTeamRecord,
} from "./setupClaim"

function createStore(seed?: {
  team?: SetupTeamRecord | null
  owner?: SetupOwnerRecord | null
}) {
  let team = seed?.team ?? null
  let owner = seed?.owner ?? null
  let nextTeamId = 1
  const createdOwners: NewSetupOwnerRecord[] = []

  const store: SetupClaimStore = {
    getTeam: async () => team,
    getOwner: async () => owner,
    createTeam: async (newTeam: NewSetupTeamRecord) => {
      team = {
        _id: `team-${nextTeamId++}`,
        ...newTeam,
      }
      return team
    },
    createOwner: async (newOwner: NewSetupOwnerRecord) => {
      createdOwners.push(newOwner)
      owner = newOwner
    },
  }

  return {
    store,
    get team() {
      return team
    },
    get owner() {
      return owner
    },
    get createdOwners() {
      return createdOwners
    },
  }
}

const identity = {
  clerkUserId: "user_123",
  email: "owner@example.com",
  name: "Owner User",
}

const existingOwnerIdentity = {
  clerkUserId: "user_existing",
  email: "existing@example.com",
  name: "Existing Owner",
}

describe("claimFirstOwner", () => {
  it("creates the team and owner with the correct setup token", async () => {
    const fake = createStore()

    const result = await claimFirstOwner({
      input: { teamName: "Acme Team", setupToken: "correct" },
      identity,
      expectedSetupToken: "correct",
      now: 1780320000000,
      store: fake.store,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("Expected setup claim to succeed.")
    expect(result.status).toBe("setup-complete")
    expect(result.team.name).toBe("Acme Team")
    expect(result.owner.clerkUserId).toBe("user_123")
    expect(fake.team?.slug).toBe("acme-team")
    expect(fake.createdOwners).toHaveLength(1)
  })

  it("rejects a wrong setup token without creating rows", async () => {
    const fake = createStore()

    const result = await claimFirstOwner({
      input: { teamName: "Acme Team", setupToken: "wrong" },
      identity,
      expectedSetupToken: "correct",
      now: 1780320000000,
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: false,
      status: "error",
      code: "invalid-setup-token",
    })
    expect(fake.team).toBeNull()
    expect(fake.owner).toBeNull()
  })

  it("rejects a missing setup token without creating rows", async () => {
    const fake = createStore()

    const result = await claimFirstOwner({
      input: { teamName: "Acme Team", setupToken: "" },
      identity,
      expectedSetupToken: "correct",
      now: 1780320000000,
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: false,
      status: "error",
      code: "setup-token-required",
    })
    expect(fake.team).toBeNull()
    expect(fake.owner).toBeNull()
  })

  it("only creates one owner on duplicate submit", async () => {
    const fake = createStore()
    const claim = {
      input: { teamName: "Acme Team", setupToken: "correct" },
      identity,
      expectedSetupToken: "correct",
      now: 1780320000000,
      store: fake.store,
    }

    const first = await claimFirstOwner(claim)
    const second = await claimFirstOwner(claim)

    expect(first.ok).toBe(true)
    expect(second).toMatchObject({
      ok: true,
      status: "setup-complete",
      message: "Setup is already complete.",
    })
    expect(fake.createdOwners).toHaveLength(1)
  })

  it("does not accept the setup token after setup is complete", async () => {
    const fake = createStore({
      team: {
        _id: "team-1",
        name: "Existing Team",
        slug: "existing-team",
        setupCompletedAt: 1780310000000,
        createdAt: 1780310000000,
        updatedAt: 1780310000000,
      },
      owner: {
        teamId: "team-1",
        clerkUserId: "user_existing",
        email: "existing@example.com",
        name: "Existing Owner",
        role: "owner",
        createdAt: 1780310000000,
        updatedAt: 1780310000000,
      },
    })

    const result = await claimFirstOwner({
      input: { teamName: "New Team", setupToken: "correct" },
      identity: existingOwnerIdentity,
      expectedSetupToken: "correct",
      now: 1780320000000,
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: true,
      status: "setup-complete",
      message: "Setup is already complete.",
      team: { name: "Existing Team" },
      owner: { clerkUserId: "user_existing" },
    })
    expect(fake.createdOwners).toHaveLength(0)
  })

  it("redacts existing owner details for non-owner callers", async () => {
    const fake = createStore({
      team: {
        _id: "team-1",
        name: "Existing Team",
        slug: "existing-team",
        setupCompletedAt: 1780310000000,
        createdAt: 1780310000000,
        updatedAt: 1780310000000,
      },
      owner: {
        teamId: "team-1",
        clerkUserId: "user_existing",
        email: "existing@example.com",
        name: "Existing Owner",
        role: "owner",
        createdAt: 1780310000000,
        updatedAt: 1780310000000,
      },
    })

    const result = await claimFirstOwner({
      input: { teamName: "New Team", setupToken: "correct" },
      identity,
      expectedSetupToken: "correct",
      now: 1780320000000,
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: true,
      status: "setup-complete",
      owner: {
        clerkUserId: null,
        email: null,
        name: null,
        role: "owner",
        createdAt: null,
      },
    })
    expect(fake.createdOwners).toHaveLength(0)
  })
})
