import { dashboardDeviceName } from "./dashboard-device-name"
import type { ReadyDashboardState } from "./dashboard-source"

type TvDeviceStatus = ReadyDashboardState["developers"][number]["devices"][number]["status"]

export type TvSyncHealth = {
  connectedDevices: number
  totalDevices: number
  label: string
  status: string
  timestamps: number[]
  rows: Array<{
    developerName: string
    deviceName: string
    status: TvDeviceStatus
    lastContactAt: number | null
  }>
}

export function buildTvSyncHealth(developers: ReadyDashboardState["developers"]): TvSyncHealth {
  const rows = developers.flatMap((developer) =>
    developer.devices.map((device) => ({
      developerName: developer.displayName,
      deviceName: dashboardDeviceName(device),
      status: device.status,
      lastContactAt: device.lastSyncAt ?? device.lastSeenAt ?? null,
    }))
  )
  const connectedDevices = rows.filter((row) => row.status === "connected").length
  const timestamps = rows
    .map((row) => row.lastContactAt)
    .filter((timestamp): timestamp is number => typeof timestamp === "number")

  if (rows.length === 0) {
    return {
      connectedDevices: 0,
      totalDevices: 0,
      label: "No devices",
      status: "No sync data yet",
      timestamps: [],
      rows: [],
    }
  }

  const latestContactAt = timestamps.length > 0 ? Math.max(...timestamps) : null

  return {
    connectedDevices,
    totalDevices: rows.length,
    label: `${connectedDevices}/${rows.length} connected`,
    status: `Latest ${formatTimestamp(latestContactAt)}`,
    timestamps,
    rows: rows.sort((left, right) => (right.lastContactAt ?? 0) - (left.lastContactAt ?? 0)),
  }
}

function formatTimestamp(value: number | null | undefined) {
  if (!value) return "Never"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value)
}
