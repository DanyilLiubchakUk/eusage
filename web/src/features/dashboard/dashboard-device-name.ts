export function dashboardDeviceName(device: { deviceName?: string; deviceId: string; os: string }) {
  const trimmed = device.deviceName?.trim()
  if (trimmed && trimmed !== "Unknown device") return trimmed
  const os = device.os.trim().toLowerCase()
  if (os === "macos") return "macOS desktop"
  if (os === "windows") return "Windows desktop"
  if (os === "linux") return "Linux desktop"
  return "Desktop"
}
