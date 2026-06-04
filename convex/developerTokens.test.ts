import { describe, expect, it } from "vitest"
import {
  buildDeveloperConnectionString,
  createDeveloperWithToken,
  fingerprintDeveloperTokenHash,
  generateDeveloperToken,
  hashDeveloperToken,
  type CreateDeveloperStore,
  type DeveloperOwnerRecord,
  type DeveloperRecord,
  type DeveloperTeamRecord,
  type DeveloperTokenRecord,
  type NewDeveloperRecord,
  type NewDeveloperTokenRecord,
} from "./developerTokens"

function createStore(seed?: {
  team?: DeveloperTeamRecord | null
  owner?: DeveloperOwnerRecord | null
}) {
  const team = seed?.team ?? {
    _id: "team-1",
    name: "Acme Team",
    slug: "acme-team",
  }
  const owner = seed?.owner ?? {
    teamId: "team-1",
    clerkUserId: "user_owner",
    role: "owner" as const,
  }
  const developers: DeveloperRecord[] = []
  const tokens: DeveloperTokenRecord[] = []

  const store: CreateDeveloperStore = {
    getTeam: async () => team,
    getOwner: async () => owner,
    createDeveloper: async (developer: NewDeveloperRecord) => {
      const created = {
        _id: `developer-${developers.length + 1}`,
        ...developer,
      }
      developers.push(created)
      return created
    },
    createToken: async (token: NewDeveloperTokenRecord) => {
      const created = {
        _id: `token-${tokens.length + 1}`,
        ...token,
      }
      tokens.push(created)
      return created
    },
  }

  return {
    store,
    developers,
    tokens,
  }
}

describe("developer tokens", () => {
  it("generates a long eUsage developer token", () => {
    const token = generateDeveloperToken(new Uint8Array(32))

    expect(token).toMatch(/^eusage_dev_[A-Za-z0-9_-]{43}$/)
  })

  it("hashes tokens with SHA-256 and builds a hash-backed fingerprint", async () => {
    const hash = await hashDeveloperToken("eusage_dev_known")

    expect(hash).toHaveLength(64)
    expect(hash).toBe(
      "d7a3a5323c1a8c43e4e6ed53bb2e35936ce53d0be7ab0b52ddf71abff04405be"
    )
    expect(fingerprintDeveloperTokenHash(hash)).toBe("d7a3a532...f04405be")
  })

  it("creates a developer and stores only token hash plus fingerprint", async () => {
    const fake = createStore()
    const rawToken = "eusage_dev_secret_raw_token"

    const result = await createDeveloperWithToken({
      input: {
        displayName: "Alex Dev",
        email: "alex@example.com",
        tokenLabel: "Alex laptop",
        metadataNotes: "Team lead",
      },
      identity: { clerkUserId: "user_owner" },
      now: 1780320000000,
      rawToken,
      store: fake.store,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("Expected developer creation to succeed.")
    expect(result.rawToken).toBe(rawToken)
    expect(result.developer).toMatchObject({
      displayName: "Alex Dev",
      email: "alex@example.com",
      status: "active",
      metadata: { notes: "Team lead" },
      token: {
        label: "Alex laptop",
        status: "active",
      },
    })
    expect(fake.developers).toHaveLength(1)
    expect(fake.tokens).toHaveLength(1)
    expect(fake.tokens[0].tokenHash).toBe(await hashDeveloperToken(rawToken))
    expect(fake.tokens[0].fingerprint).toBe(result.developer.token?.fingerprint)
    expect(JSON.stringify(fake.developers)).not.toContain(rawToken)
    expect(JSON.stringify(fake.tokens)).not.toContain(rawToken)
  })

  it("rejects developer creation when the token label is longer than 16 characters", async () => {
    const fake = createStore()

    const result = await createDeveloperWithToken({
      input: {
        displayName: "Alex Dev",
        tokenLabel: "12345678901234567",
      },
      identity: { clerkUserId: "user_owner" },
      now: 1780320000000,
      rawToken: "eusage_dev_secret_raw_token",
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: false,
      status: "error",
      code: "token-label-too-long",
      message: "Use 16 characters or fewer.",
    })
    expect(fake.developers).toHaveLength(0)
    expect(fake.tokens).toHaveLength(0)
  })

  it("rejects oversized or invalid developer fields before storing rows", async () => {
    const cases = [
      {
        input: {
          displayName: "A".repeat(81),
          tokenLabel: "Laptop",
        },
        code: "developer-name-too-long",
      },
      {
        input: {
          displayName: "Alex Dev",
          email: "not-an-email",
          tokenLabel: "Laptop",
        },
        code: "developer-email-invalid",
      },
      {
        input: {
          displayName: "Alex Dev",
          tokenLabel: "Laptop",
          metadataNotes: "M".repeat(501),
        },
        code: "developer-metadata-too-long",
      },
    ] as const

    for (const testCase of cases) {
      const fake = createStore()
      const result = await createDeveloperWithToken({
        input: testCase.input,
        identity: { clerkUserId: "user_owner" },
        now: 1780320000000,
        rawToken: "eusage_dev_secret_raw_token",
        store: fake.store,
      })

      expect(result).toMatchObject({
        ok: false,
        status: "error",
        code: testCase.code,
      })
      expect(fake.developers).toHaveLength(0)
      expect(fake.tokens).toHaveLength(0)
    }
  })

  it("rejects non-owner developer creation", async () => {
    const fake = createStore()

    const result = await createDeveloperWithToken({
      input: {
        displayName: "Alex Dev",
        tokenLabel: "Alex laptop",
      },
      identity: { clerkUserId: "user_other" },
      now: 1780320000000,
      rawToken: "eusage_dev_secret_raw_token",
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: false,
      status: "error",
      code: "not-owner",
    })
    expect(fake.developers).toHaveLength(0)
    expect(fake.tokens).toHaveLength(0)
  })

  it("builds the approved connection string shape", () => {
    expect(
      buildDeveloperConnectionString({
        teamUrl: "http://localhost:3000/",
        rawToken: "eusage_dev_abc",
      })
    ).toBe("eusage://connect?url=http://localhost:3000&token=eusage_dev_abc")
  })
})
