import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import {
  checkInDevice,
  disconnectDevice,
  getPublicTeamConfig,
  publicDeviceRow,
  type DesktopApiStore,
} from "./desktopApiCore"
import type { DeveloperTeamRecord } from "./developerTokens"
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

function createQueryStore(ctx: QueryCtx): Pick<DesktopApiStore, "getTeam"> {
  return {
    getTeam: async () =>
      ctx.db.query("teams").first() as Promise<DeveloperTeamRecord | null>,
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
