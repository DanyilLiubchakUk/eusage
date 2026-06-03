import { describe, expect, it } from "vitest"
import {
  createTvDisplayLinkCore,
  generateTvDisplayToken,
  hashTvDisplayToken,
  revokeTvDisplayLinkCore,
  rotateTvDisplayLinkCore,
  type NewTvDisplayLinkRecord,
  type TvDisplayLinkRecord,
  type TvDisplayLinkStore,
  type TvDisplayOwnerRecord,
  type TvDisplayTeamRecord,
} from "./tvDisplayLinks"

function createStore(seed?: {
  owner?: TvDisplayOwnerRecord | null
  links?: TvDisplayLinkRecord[]
}) {
  const team: TvDisplayTeamRecord = {
    _id: "team-1",
    name: "Acme Team",
    slug: "acme-team",
  }
  const owner = seed?.owner ?? {
    teamId: "team-1",
    clerkUserId: "user_owner",
    role: "owner" as const,
  }
  const links: TvDisplayLinkRecord[] = seed?.links ? [...seed.links] : []

  const store: TvDisplayLinkStore = {
    getTeam: async () => team,
    getOwner: async () => owner,
    listActiveLinks: async (teamId) =>
      links.filter((link) => link.teamId === teamId && link.status === "active"),
    createLink: async (link: NewTvDisplayLinkRecord) => {
      const created = {
        _id: `tv-link-${links.length + 1}`,
        ...link,
      }
      links.push(created)
      return created
    },
    updateLink: async (linkId, patch) => {
      const link = links.find((row) => row._id === linkId)
      if (!link) throw new Error("Missing TV display link in fake store.")
      Object.assign(link, patch)
    },
  }

  return {
    store,
    links,
  }
}

describe("TV display links", () => {
  it("generates and hashes display tokens without storing raw values", async () => {
    const fake = createStore()
    const rawToken = "eusage_tv_secret_raw_token"

    const result = await createTvDisplayLinkCore({
      identity: { clerkUserId: "user_owner" },
      now: 1780320000000,
      rawToken,
      store: fake.store,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("Expected TV display link creation to succeed.")
    expect(result.rawToken).toBe(rawToken)
    expect(result.link?.fingerprint).toBe(fake.links[0].fingerprint)
    expect(fake.links).toHaveLength(1)
    expect(fake.links[0]).toMatchObject({
      teamId: "team-1",
      status: "active",
      tokenHash: await hashTvDisplayToken(rawToken),
    })
    expect(JSON.stringify(fake.links)).not.toContain(rawToken)
  })

  it("does not re-show raw token when an active link already exists", async () => {
    const rawToken = "eusage_tv_existing_secret"
    const tokenHash = await hashTvDisplayToken(rawToken)
    const fake = createStore({
      links: [
        {
          _id: "tv-link-1",
          teamId: "team-1",
          tokenHash,
          fingerprint: "hash...hash",
          status: "active",
          createdAt: 1780320000000,
        },
      ],
    })

    const result = await createTvDisplayLinkCore({
      identity: { clerkUserId: "user_owner" },
      now: 1780330000000,
      store: fake.store,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("Expected existing TV display link to succeed.")
    expect(result.rawToken).toBeUndefined()
    expect(result.link?.fingerprint).toBe("hash...hash")
    expect(fake.links).toHaveLength(1)
  })

  it("rotates by revoking old active links and showing one new raw token", async () => {
    const oldTokenHash = await hashTvDisplayToken("eusage_tv_old_secret")
    const fake = createStore({
      links: [
        {
          _id: "tv-link-1",
          teamId: "team-1",
          tokenHash: oldTokenHash,
          fingerprint: "old...hash",
          status: "active",
          createdAt: 1780320000000,
        },
      ],
    })
    const rawToken = "eusage_tv_new_secret"

    const result = await rotateTvDisplayLinkCore({
      identity: { clerkUserId: "user_owner" },
      now: 1780330000000,
      rawToken,
      store: fake.store,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("Expected TV display link rotation to succeed.")
    expect(result.rawToken).toBe(rawToken)
    expect(fake.links).toHaveLength(2)
    expect(fake.links[0]).toMatchObject({
      status: "revoked",
      revokedAt: 1780330000000,
      rotatedAt: 1780330000000,
    })
    expect(fake.links[1]).toMatchObject({
      status: "active",
      rotatedAt: 1780330000000,
      tokenHash: await hashTvDisplayToken(rawToken),
    })
  })

  it("revokes the active link without deleting link rows", async () => {
    const fake = createStore({
      links: [
        {
          _id: "tv-link-1",
          teamId: "team-1",
          tokenHash: "hash",
          fingerprint: "hash...hash",
          status: "active",
          createdAt: 1780320000000,
        },
      ],
    })

    const result = await revokeTvDisplayLinkCore({
      identity: { clerkUserId: "user_owner" },
      now: 1780330000000,
      store: fake.store,
    })

    expect(result.ok).toBe(true)
    expect(fake.links).toHaveLength(1)
    expect(fake.links[0]).toMatchObject({
      status: "revoked",
      revokedAt: 1780330000000,
    })
  })

  it("rejects TV display link management from non-owner users", async () => {
    const fake = createStore()

    const result = await createTvDisplayLinkCore({
      identity: { clerkUserId: "user_other" },
      now: 1780320000000,
      rawToken: "eusage_tv_secret_raw_token",
      store: fake.store,
    })

    expect(result).toMatchObject({
      ok: false,
      status: "error",
      code: "not-owner",
    })
    expect(fake.links).toHaveLength(0)
  })

  it("generates long eUsage TV tokens", () => {
    expect(generateTvDisplayToken(new Uint8Array(32))).toMatch(/^eusage_tv_[A-Za-z0-9_-]{43}$/)
  })
})
