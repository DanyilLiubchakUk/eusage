import { describe, expect, it } from "vitest"
import {
  reenableDeveloper,
  revokeDeveloperToken,
  rotateDeveloperToken,
  type DeveloperTokenLifecycleStore,
} from "./developerTokenLifecycle"
import {
  hashDeveloperToken,
  type DeveloperOwnerRecord,
  type DeveloperRecord,
  type DeveloperTeamRecord,
  type DeveloperTokenRecord,
  type NewDeveloperTokenRecord,
} from "./developerTokens"

function createStore(seed?: {
  developer?: Partial<DeveloperRecord>
  tokens?: DeveloperTokenRecord[]
  owner?: DeveloperOwnerRecord | null
}) {
  const team: DeveloperTeamRecord = {
    _id: "team-1",
    name: "Acme Team",
    slug: "acme-team",
  }
  const owner = seed?.owner ?? {
    teamId: "team-1",
    clerkUserId: "user_owner",
    role: "owner" as const,
  }
  const developers: DeveloperRecord[] = [
    {
      _id: "developer-1",
      teamId: "team-1",
      displayName: "Alex Dev",
      status: "active",
      createdAt: 1780320000000,
      updatedAt: 1780320000000,
      ...seed?.developer,
    },
  ]
  const tokens: DeveloperTokenRecord[] = seed?.tokens
    ? [...seed.tokens]
    : [
        {
          _id: "token-1",
          teamId: "team-1",
          developerId: "developer-1",
          tokenHash: "old_hash",
          fingerprint: "old...hash",
          label: "Alex laptop",
          status: "active",
          createdAt: 1780320000000,
        },
      ]

  const store: DeveloperTokenLifecycleStore = {
    getTeam: async () => team,
    getOwner: async () => owner,
    getDeveloper: async (developerId) =>
      developers.find((developer) => developer._id === developerId) ?? null,
    listActiveTokens: async (developerId) =>
      tokens.filter(
        (token) => token.developerId === developerId && token.status === "active"
      ),
    createToken: async (token: NewDeveloperTokenRecord) => {
      const created = {
        _id: `token-${tokens.length + 1}`,
        ...token,
      }
      tokens.push(created)
      return created
    },
    updateDeveloper: async (developerId, patch) => {
      const developer = developers.find((row) => row._id === developerId)
      if (!developer) throw new Error("Missing developer in fake store.")
      Object.assign(developer, patch)
      return developer
    },
    updateToken: async (tokenId, patch) => {
      const token = tokens.find((row) => row._id === tokenId)
      if (!token) throw new Error("Missing token in fake store.")
      Object.assign(token, patch)
      return token
    },
  }

  return {
    store,
    developers,
    tokens,
  }
}

describe("developer token lifecycle", () => {
  it("rotates a developer token and revokes the old token immediately", async () => {
    const fake = createStore()
    const rawToken = "eusage_dev_new_secret"

    const result = await rotateDeveloperToken({
      developerId: "developer-1",
      tokenLabel: "Alex new laptop",
      identity: { clerkUserId: "user_owner" },
      now: 1780330000000,
      rawToken,
      store: fake.store,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("Expected rotate to succeed.")
    expect(result.rawToken).toBe(rawToken)
    expect(result.developer.status).toBe("active")
    expect(result.developer.token).toMatchObject({
      label: "Alex new laptop",
      status: "active",
      rotatedAt: 1780330000000,
    })
    expect(fake.tokens).toHaveLength(2)
    expect(fake.tokens[0]).toMatchObject({
      status: "revoked",
      revokedAt: 1780330000000,
    })
    expect(fake.tokens[1].tokenHash).toBe(await hashDeveloperToken(rawToken))
    expect(JSON.stringify(fake.tokens)).not.toContain(rawToken)
  })

  it("revokes an active token, marks the developer inactive, and keeps rows", async () => {
    const fake = createStore()

    const result = await revokeDeveloperToken({
      developerId: "developer-1",
      identity: { clerkUserId: "user_owner" },
      now: 1780330000000,
      store: fake.store,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("Expected revoke to succeed.")
    expect(result.rawToken).toBeUndefined()
    expect(result.developer.status).toBe("inactive")
    expect(result.developer.token).toMatchObject({
      status: "revoked",
      revokedAt: 1780330000000,
    })
    expect(fake.developers).toHaveLength(1)
    expect(fake.tokens).toHaveLength(1)
    expect(fake.developers[0].status).toBe("inactive")
    expect(fake.tokens[0].status).toBe("revoked")
  })

  it("re-enables an inactive developer with a new token", async () => {
    const fake = createStore({
      developer: {
        status: "inactive",
        updatedAt: 1780330000000,
      },
      tokens: [
        {
          _id: "token-1",
          teamId: "team-1",
          developerId: "developer-1",
          tokenHash: "old_hash",
          fingerprint: "old...hash",
          label: "Alex laptop",
          status: "revoked",
          createdAt: 1780320000000,
          revokedAt: 1780330000000,
        },
      ],
    })
    const rawToken = "eusage_dev_reenabled_secret"

    const result = await reenableDeveloper({
      developerId: "developer-1",
      tokenLabel: "Alex return laptop",
      identity: { clerkUserId: "user_owner" },
      now: 1780340000000,
      rawToken,
      store: fake.store,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("Expected re-enable to succeed.")
    expect(result.rawToken).toBe(rawToken)
    expect(result.developer.status).toBe("active")
    expect(result.developer.token).toMatchObject({
      label: "Alex return laptop",
      status: "active",
      createdAt: 1780340000000,
    })
    expect(fake.tokens).toHaveLength(2)
    expect(fake.tokens[0].status).toBe("revoked")
    expect(fake.tokens[1].tokenHash).toBe(await hashDeveloperToken(rawToken))
    expect(JSON.stringify(fake.tokens)).not.toContain(rawToken)
  })

  it("rejects lifecycle actions from non-owner users", async () => {
    const fake = createStore()

    const result = await rotateDeveloperToken({
      developerId: "developer-1",
      tokenLabel: "Alex new laptop",
      identity: { clerkUserId: "user_other" },
      now: 1780330000000,
      rawToken: "eusage_dev_new_secret",
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: false,
      status: "error",
      code: "not-owner",
    })
    expect(fake.tokens).toHaveLength(1)
    expect(fake.tokens[0].status).toBe("active")
  })
})
