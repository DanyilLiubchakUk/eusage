const UNKNOWN_DEVICE_LABEL = "Unknown device"

export function normalizeDeviceName(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === UNKNOWN_DEVICE_LABEL) return null
  return trimmed
}

export function fallbackDeviceName(os: string): string {
  const normalized = os.trim().toLowerCase()
  if (normalized === "macos") return "macOS desktop"
  if (normalized === "windows") return "Windows desktop"
  if (normalized === "linux") return "Linux desktop"
  return "Desktop"
}

export function resolveDeviceName(args: {
  override: string | null
  detected: string | null
  os: string
}): string {
  return (
    normalizeDeviceName(args.override) ??
    normalizeDeviceName(args.detected) ??
    fallbackDeviceName(args.os)
  )
}
