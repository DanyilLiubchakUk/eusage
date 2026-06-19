import {
  publicDeveloperRow,
  type DeveloperRecord,
  type DeveloperTokenRecord,
  type PublicDeveloperRow,
} from "./developerTokens"
import {
  authenticateDesktopTokenHash,
  desktopError,
  publicDesktopTeamMetadata,
  type DesktopApiAuthStore,
  type DesktopApiError,
  type PublicDesktopTeamMetadata,
} from "./desktopApiAuth"
import { displayDeviceName } from "./deviceNames"

export {
  authenticateDesktopTokenHash,
  desktopError,
  getPublicTeamConfig,
  publicDesktopTeamMetadata,
  teamFingerprint,
  type DesktopApiAuthStore,
  type DesktopApiError,
  type DesktopApiErrorCode,
  type DesktopAuthResult,
  type DesktopOrganizationRecord,
  type PublicDesktopTeamMetadata,
  type PublicTeamConfigResult,
} from "./desktopApiAuth"

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
      team: PublicDesktopTeamMetadata
      device: PublicDeviceRow
    }
  | DesktopApiError

export type DeviceDisconnectResult =
  | {
      ok: true
      message: string
      developerId: string
      team: PublicDesktopTeamMetadata
      device: PublicDeviceRow
    }
  | DesktopApiError

export type DesktopApiStore = DesktopApiAuthStore & {
  getDeviceByTeamAndDeviceId: (
    teamId: string,
    deviceId: string
  ) => Promise<DeviceRecord | null>
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

  const existingDevice = await args.store.getDeviceByTeamAndDeviceId(
    auth.team._id,
    deviceInput.deviceId
  )
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
    team: await publicDesktopTeamMetadata(auth.team),
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

  const device = await args.store.getDeviceByTeamAndDeviceId(auth.team._id, deviceId)
  if (!device) {
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
    team: await publicDesktopTeamMetadata(auth.team),
    device: publicDeviceRow(updatedDevice, args.now),
  }
}

export function publicDeviceRow(device: DeviceRecord, now: number): PublicDeviceRow {
  return {
    id: device._id,
    deviceId: device.deviceId,
    deviceName: displayDeviceName(device.deviceName, device.os),
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
    deviceName: displayDeviceName(input.deviceName, os),
    os,
    appVersion,
  }
}

function trimRequired(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}
