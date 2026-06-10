import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import {
  checkInDevice,
  disconnectDevice,
  getPublicTeamConfig,
  authenticateDesktopTokenHash,
  publicDeviceRow,
  type DesktopApiError,
  type DesktopApiStore,
} from "./desktopApiCore"
import type { DeveloperTeamRecord } from "./developerTokens"
import type {
  NewProviderAccountRecord,
  ProviderAccountRecord,
} from "./usageIngest"
import { v } from "convex/values"

export {
  DEVICE_STALE_AFTER_MS,
  authenticateDesktopTokenHash,
  checkInDevice,
  disconnectDevice,
  getDeviceStatus,
  getPublicTeamConfig,
  publicDeveloperRowWithDevices,
  publicDeviceRow,
  type DesktopApiError,
  type DesktopApiStore,
  type DeviceRecord,
  type NewDeviceRecord,
  type PublicDeveloperRowWithDevices,
  type PublicDeviceRow,
} from "./desktopApiCore"

export const getTeamConfig = query({
  args: {},
  handler: async (ctx) =>
    getPublicTeamConfig({
      store: createQueryStore(ctx),
    }),
})

export const checkIn = mutation({
  args: {
    tokenHash: v.string(),
    deviceId: v.string(),
    deviceName: v.optional(v.string()),
    os: v.string(),
    appVersion: v.string(),
  },
  handler: async (ctx, input) =>
    checkInDevice({
      input,
      now: Date.now(),
      store: createMutationStore(ctx),
    }),
})

export const disconnect = mutation({
  args: {
    tokenHash: v.string(),
    deviceId: v.string(),
  },
  handler: async (ctx, input) =>
    disconnectDevice({
      input,
      now: Date.now(),
      store: createMutationStore(ctx),
    }),
})

export const updateProviderAccount = mutation({
  args: {
    tokenHash: v.string(),
    providerId: v.string(),
    providerAccountFingerprint: v.string(),
    providerAccountLabel: v.string(),
    status: v.literal("shared"),
  },
  handler: async (ctx, input) =>
    updateProviderAccountMetadata({
      input,
      now: Date.now(),
      store: createProviderAccountMetadataStore(ctx),
    }),
})

export async function listPublicDevicesForDeveloper(args: {
  developerId: string
  now: number
  ctx: QueryCtx
}) {
  const devices = await args.ctx.db
    .query("devices")
    .withIndex("by_developerId_status", (q) =>
      q.eq("developerId", args.developerId as Id<"developers">)
    )
    .collect()

  return devices.map((device) => publicDeviceRow(device, args.now))
}

type ProviderAccountMetadataInput = {
  tokenHash: string
  providerId: string
  providerAccountFingerprint: string
  providerAccountLabel: string
  status: "shared"
}

type ProviderAccountMetadataResult =
  | {
      ok: true
      message: string
      providerId: string
      serverTime: string
    }
  | DesktopApiError

type ProviderAccountMetadataStore = Pick<
  DesktopApiStore,
  "getTeam" | "getTokenByHash" | "getDeveloper" | "updateDeveloper" | "updateToken"
> & {
  getProviderAccount: (
    account: Pick<
      ProviderAccountRecord,
      "teamId" | "developerId" | "providerId" | "teamAccountFingerprint"
    >
  ) => Promise<ProviderAccountRecord | null>
  createProviderAccount: (
    account: NewProviderAccountRecord
  ) => Promise<ProviderAccountRecord>
  updateProviderAccount: (
    accountId: string,
    patch: Partial<NewProviderAccountRecord>
  ) => Promise<ProviderAccountRecord>
}

export async function updateProviderAccountMetadata(args: {
  input: ProviderAccountMetadataInput
  now: number
  store: ProviderAccountMetadataStore
}): Promise<ProviderAccountMetadataResult> {
  const auth = await authenticateDesktopTokenHash({
    tokenHash: args.input.tokenHash,
    store: args.store,
  })
  if (!auth.ok) return auth

  const normalized = normalizeProviderAccountMetadataInput(args.input)
  if (!normalized.ok) return normalized

  const account = {
    teamId: auth.team._id,
    developerId: auth.developer._id,
    providerId: normalized.providerId,
    teamAccountFingerprint: normalized.providerAccountFingerprint,
    label: normalized.providerAccountLabel,
    status: "shared" as const,
    updatedAt: args.now,
  }
  const existing = await args.store.getProviderAccount(account)
  if (existing) {
    await args.store.updateProviderAccount(existing._id, account)
  } else {
    await args.store.createProviderAccount({
      ...account,
      firstSharedAt: args.now,
      lastSharedAt: args.now,
    })
  }

  await args.store.updateDeveloper(auth.developer._id, {
    lastSeenAt: args.now,
    updatedAt: args.now,
  })
  await args.store.updateToken(auth.token._id, { lastUsedAt: args.now })

  return {
    ok: true,
    message: "Provider Account metadata updated.",
    providerId: normalized.providerId,
    serverTime: new Date(args.now).toISOString(),
  }
}

function createQueryStore(ctx: QueryCtx): Pick<DesktopApiStore, "getTeam"> {
  return {
    getTeam: async () =>
      ctx.db.query("teams").first() as Promise<DeveloperTeamRecord | null>,
  }
}

function normalizeProviderAccountMetadataInput(input: ProviderAccountMetadataInput) {
  const providerId = input.providerId.trim()
  const providerAccountFingerprint = input.providerAccountFingerprint.trim()
  const providerAccountLabel = input.providerAccountLabel.trim()
  if (
    !providerId ||
    !providerAccountFingerprint ||
    !providerAccountLabel ||
    input.status !== "shared"
  ) {
    return {
      ok: false as const,
      status: "error" as const,
      code: "invalid-body" as const,
      message: "Provider Account metadata is invalid.",
    }
  }

  return {
    ok: true as const,
    providerId,
    providerAccountFingerprint,
    providerAccountLabel,
  }
}

function createMutationStore(ctx: MutationCtx): DesktopApiStore {
  return {
    getTeam: async () =>
      ctx.db.query("teams").first() as Promise<DeveloperTeamRecord | null>,
    getTokenByHash: async (tokenHash) =>
      ctx.db
        .query("developerTokens")
        .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
        .first(),
    getDeveloper: async (developerId) =>
      ctx.db.get(developerId as Id<"developers">),
    getDeviceByDeviceId: async (deviceId) =>
      ctx.db
        .query("devices")
        .withIndex("by_deviceId", (q) => q.eq("deviceId", deviceId))
        .first(),
    createDevice: async (device) => {
      const id = await ctx.db.insert("devices", {
        ...device,
        teamId: device.teamId as Id<"teams">,
        developerId: device.developerId as Id<"developers">,
      })
      const created = await ctx.db.get(id)
      if (!created) throw new Error("Created device row was not readable.")
      return created
    },
    updateDevice: async (deviceRecordId, patch) => {
      const { developerId, ...rest } = patch
      await ctx.db.patch(deviceRecordId as Id<"devices">, {
        ...rest,
        ...(developerId ? { developerId: developerId as Id<"developers"> } : {}),
      })
      const updated = await ctx.db.get(deviceRecordId as Id<"devices">)
      if (!updated) throw new Error("Updated device row was not readable.")
      return updated
    },
    updateDeveloper: async (developerId, patch) => {
      await ctx.db.patch(developerId as Id<"developers">, patch)
      const updated = await ctx.db.get(developerId as Id<"developers">)
      if (!updated) throw new Error("Updated developer row was not readable.")
      return updated
    },
    updateToken: async (tokenId, patch) => {
      await ctx.db.patch(tokenId as Id<"developerTokens">, patch)
      const updated = await ctx.db.get(tokenId as Id<"developerTokens">)
      if (!updated) throw new Error("Updated developer token row was not readable.")
      return updated
    },
  }
}

function createProviderAccountMetadataStore(
  ctx: MutationCtx
): ProviderAccountMetadataStore {
  return {
    ...createMutationStore(ctx),
    getProviderAccount: async (account) =>
      (await ctx.db
        .query("providerAccounts")
        .withIndex("by_team_developer_provider_account", (q) =>
          q
            .eq("teamId", account.teamId as Id<"teams">)
            .eq("developerId", account.developerId as Id<"developers">)
            .eq("providerId", account.providerId)
            .eq("teamAccountFingerprint", account.teamAccountFingerprint)
        )
        .first()) as ProviderAccountRecord | null,
    createProviderAccount: async (account) => {
      const id = await ctx.db.insert("providerAccounts", {
        teamId: account.teamId as Id<"teams">,
        developerId: account.developerId as Id<"developers">,
        providerId: account.providerId,
        teamAccountFingerprint: account.teamAccountFingerprint,
        label: account.label,
        status: account.status,
        firstSharedAt: account.firstSharedAt,
        lastSharedAt: account.lastSharedAt,
        updatedAt: account.updatedAt,
      })
      const created = await ctx.db.get(id)
      if (!created) throw new Error("Created provider account row was not readable.")
      return created as ProviderAccountRecord
    },
    updateProviderAccount: async (accountId, patch) => {
      await ctx.db.patch(accountId as Id<"providerAccounts">, {
        ...(patch.teamId ? { teamId: patch.teamId as Id<"teams"> } : {}),
        ...(patch.developerId
          ? { developerId: patch.developerId as Id<"developers"> }
          : {}),
        ...(patch.providerId !== undefined ? { providerId: patch.providerId } : {}),
        ...(patch.teamAccountFingerprint !== undefined
          ? { teamAccountFingerprint: patch.teamAccountFingerprint }
          : {}),
        ...(patch.label !== undefined ? { label: patch.label } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.firstSharedAt !== undefined
          ? { firstSharedAt: patch.firstSharedAt }
          : {}),
        ...(patch.lastSharedAt !== undefined ? { lastSharedAt: patch.lastSharedAt } : {}),
        ...(patch.updatedAt !== undefined ? { updatedAt: patch.updatedAt } : {}),
      })
      const updated = await ctx.db.get(accountId as Id<"providerAccounts">)
      if (!updated) throw new Error("Updated provider account row was not readable.")
      return updated as ProviderAccountRecord
    },
  }
}
