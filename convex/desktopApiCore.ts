import {
  publicDeveloperRow,
  type DeveloperRecord,
  type DeveloperTeamRecord,
  type DeveloperTokenRecord,
  type PublicDeveloperRow,
} from "./developerTokens"

export const DEVICE_STALE_AFTER_MS = 72 * 60 * 60 * 1000

export type DeviceStatus = "connected" | "stale" | "disconnected" | "archived"

export type DeviceRecord = {
  _id: string
  teamId: string
  developerId: string
  deviceId: string
  deviceName: string
  os: string
  appVersion: string
  status: DeviceStatus
  lastSeenAt: number
  lastSyncAt?: number
  createdAt: number
  updatedAt: number
}

export type NewDeviceRecord = Omit<DeviceRecord, "_id">

export type PublicDeviceRow = {
  id: string
  deviceId: string
  deviceName: string
  os: string
  appVersion: string
  status: DeviceStatus
  storedStatus: DeviceStatus
  lastSeenAt: number
  lastSyncAt: number | null
  updatedAt: number
}

export type PublicDeveloperRowWithDevices = PublicDeveloperRow & {
  devices: PublicDeviceRow[]
}

export type PublicTeamConfigResult =
  | {
      ok: true
      team: {
        name: string
      }
    }
  | DesktopApiError

export type DesktopApiErrorCode =
  | "setup-state-invalid"
  | "missing-bearer-auth"
  | "invalid-token"
  | "revoked-token"
  | "inactive-developer"
  | "invalid-json"
  | "invalid-body"
  | "device-id-required"
  | "device-os-required"
  | "device-app-version-required"
  | "device-not-found"

export type DesktopApiError = {
  ok: false
  status: "error"
  code: DesktopApiErrorCode
  message: string
}

type DesktopAuthResult =
  | {
      ok: true
      team: DeveloperTeamRecord
      developer: DeveloperRecord
      token: DeveloperTokenRecord
    }
  | DesktopApiError

export type DeviceCheckInInput = {
  tokenHash: string
  deviceId: string
  deviceName?: string
  os: string
  appVersion: string
}

export type DeviceDisconnectInput = {
  tokenHash: string
  deviceId: string
}

export type DeviceCheckInResult =
  | {
      ok: true
      message: string
      developerId: string
      device: PublicDeviceRow
    }
  | DesktopApiError

export type DeviceDisconnectResult =
  | {
      ok: true
      message: string
      developerId: string
      device: PublicDeviceRow
    }
  | DesktopApiError

export type DesktopApiStore = {
  getTeam: () => Promise<DeveloperTeamRecord | null>
  getTokenByHash: (tokenHash: string) => Promise<DeveloperTokenRecord | null>
  getDeveloper: (developerId: string) => Promise<DeveloperRecord | null>
  getDeviceByDeviceId: (deviceId: string) => Promise<DeviceRecord | null>
  createDevice: (device: NewDeviceRecord) => Promise<DeviceRecord>
  updateDevice: (
    deviceRecordId: string,
    patch: Partial<
      Pick<
        DeviceRecord,
        | "developerId"
        | "deviceName"
        | "os"
        | "appVersion"
        | "status"
        | "lastSeenAt"
        | "lastSyncAt"
        | "updatedAt"
      >
    >
  ) => Promise<DeviceRecord>
  updateDeveloper: (
    developerId: string,
    patch: Partial<Pick<DeveloperRecord, "lastSeenAt" | "updatedAt">>
  ) => Promise<DeveloperRecord>
  updateToken: (
    tokenId: string,
    patch: Partial<Pick<DeveloperTokenRecord, "lastUsedAt">>
  ) => Promise<DeveloperTokenRecord>
}

export async function getPublicTeamConfig(args: {
  store: Pick<DesktopApiStore, "getTeam">
}): Promise<PublicTeamConfigResult> {
  const team = await args.store.getTeam()
  if (!team) {
    return desktopError("setup-state-invalid", "Team setup is not complete.")
  }

  return {
    ok: true,
    team: {
      name: team.name,
    },
  }
}

export async function authenticateDesktopTokenHash(args: {
  tokenHash: string | null
  store: Pick<DesktopApiStore, "getTeam" | "getTokenByHash" | "getDeveloper">
}): Promise<DesktopAuthResult> {
  const tokenHash = args.tokenHash?.trim()
  if (!tokenHash) {
    return desktopError(
      "missing-bearer-auth",
      "Authorization bearer token is required."
    )
  }

  const team = await args.store.getTeam()
  if (!team) {
    return desktopError("setup-state-invalid", "Team setup is not complete.")
  }

  const token = await args.store.getTokenByHash(tokenHash)
  if (!token || token.teamId !== team._id) {
    return desktopError("invalid-token", "Developer token is invalid.")
  }

  if (token.status !== "active") {
    return desktopError("revoked-token", "Developer token is revoked.")
  }

  const developer = await args.store.getDeveloper(token.developerId)
  if (!developer || developer.teamId !== team._id) {
    return desktopError("invalid-token", "Developer token is invalid.")
  }

  if (developer.status !== "active") {
    return desktopError("inactive-developer", "Developer is inactive.")
  }

  return { ok: true, team, developer, token }
}

export async function checkInDevice(args: {
  input: DeviceCheckInInput
  now: number
  store: DesktopApiStore
}): Promise<DeviceCheckInResult> {
  const auth = await authenticateDesktopTokenHash({
    tokenHash: args.input.tokenHash,
    store: args.store,
  })
  if (!auth.ok) return auth

  const deviceInput = normalizeCheckInInput(args.input)
  if (!deviceInput.ok) return deviceInput

  const existingDevice = await args.store.getDeviceByDeviceId(deviceInput.deviceId)
  const devicePatch = {
    developerId: auth.developer._id,
    deviceName: deviceInput.deviceName,
    os: deviceInput.os,
    appVersion: deviceInput.appVersion,
    status: "connected" as const,
    lastSeenAt: args.now,
    updatedAt: args.now,
  }

  const device =
    existingDevice && existingDevice.teamId === auth.team._id
      ? await args.store.updateDevice(existingDevice._id, devicePatch)
      : await args.store.createDevice({
          teamId: auth.team._id,
          deviceId: deviceInput.deviceId,
          createdAt: args.now,
          ...devicePatch,
        })

  await args.store.updateDeveloper(auth.developer._id, {
    lastSeenAt: args.now,
    updatedAt: args.now,
  })
  await args.store.updateToken(auth.token._id, { lastUsedAt: args.now })

  return {
    ok: true,
    message: "Device checked in.",
    developerId: auth.developer._id,
    device: publicDeviceRow(device, args.now),
  }
}

export async function disconnectDevice(args: {
  input: DeviceDisconnectInput
  now: number
  store: DesktopApiStore
}): Promise<DeviceDisconnectResult> {
  const auth = await authenticateDesktopTokenHash({
    tokenHash: args.input.tokenHash,
    store: args.store,
  })
  if (!auth.ok) return auth

  const deviceId = trimRequired(args.input.deviceId)
  if (!deviceId) {
    return desktopError("device-id-required", "Device ID is required.")
  }

  const device = await args.store.getDeviceByDeviceId(deviceId)
  if (!device || device.teamId !== auth.team._id) {
    return desktopError("device-not-found", "Device was not found.")
  }

  const updatedDevice = await args.store.updateDevice(device._id, {
    status: "disconnected",
    updatedAt: args.now,
  })
  await args.store.updateToken(auth.token._id, { lastUsedAt: args.now })

  return {
    ok: true,
    message: "Device disconnected.",
    developerId: auth.developer._id,
    device: publicDeviceRow(updatedDevice, args.now),
  }
}

export function publicDeviceRow(device: DeviceRecord, now: number): PublicDeviceRow {
  return {
    id: device._id,
    deviceId: device.deviceId,
    deviceName: device.deviceName,
    os: device.os,
    appVersion: device.appVersion,
    status: getDeviceStatus(device, now),
    storedStatus: device.status,
    lastSeenAt: device.lastSeenAt,
    lastSyncAt: device.lastSyncAt ?? null,
    updatedAt: device.updatedAt,
  }
}

export function getDeviceStatus(
  device: Pick<DeviceRecord, "status" | "lastSeenAt">,
  now: number
): DeviceStatus {
  if (device.status !== "connected") return device.status
  return now - device.lastSeenAt > DEVICE_STALE_AFTER_MS ? "stale" : "connected"
}

export function publicDeveloperRowWithDevices(
  developer: DeveloperRecord,
  token: DeveloperTokenRecord | null,
  devices: PublicDeviceRow[]
): PublicDeveloperRowWithDevices {
  return {
    ...publicDeveloperRow(developer, token),
    devices,
  }
}

function normalizeCheckInInput(input: DeviceCheckInInput) {
  const deviceId = trimRequired(input.deviceId)
  if (!deviceId) {
    return desktopError("device-id-required", "Device ID is required.")
  }

  const os = trimRequired(input.os)
  if (!os) {
    return desktopError("device-os-required", "Device OS is required.")
  }

  const appVersion = trimRequired(input.appVersion)
  if (!appVersion) {
    return desktopError(
      "device-app-version-required",
      "Device app version is required."
    )
  }

  return {
    ok: true as const,
    deviceId,
    deviceName: trimRequired(input.deviceName) ?? "Unknown device",
    os,
    appVersion,
  }
}

function trimRequired(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function desktopError(code: DesktopApiErrorCode, message: string): DesktopApiError {
  return {
    ok: false,
    status: "error",
    code,
    message,
  }
}
