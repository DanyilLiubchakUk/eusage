export function displayDeviceName(deviceName: string | undefined, os: string) {
  const trimmed = deviceName?.trim()
  if (trimmed && trimmed !== "Unknown device") return trimmed
  const normalizedOs = os.trim().toLowerCase()
  if (normalizedOs === "macos") return "macOS desktop"
  if (normalizedOs === "windows") return "Windows desktop"
  if (normalizedOs === "linux") return "Linux desktop"
  return "Desktop"
}
