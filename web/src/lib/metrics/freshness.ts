const SECOND_MS = 1_000
const MINUTE_MS = 60 * SECOND_MS
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export function formatOldestUpdateLabel(
  timestamps: Array<number | null | undefined>,
  now: number
) {
  const oldest = timestamps
    .filter((timestamp): timestamp is number =>
      typeof timestamp === "number" && Number.isFinite(timestamp)
    )
    .sort((left, right) => left - right)[0]

  if (oldest === undefined) return "Oldest update: No data yet"
  return `Oldest update: ${formatAge(now - oldest)} ago`
}

export function formatAge(ageMs: number) {
  let remainingMs = Math.max(0, Math.floor(ageMs))
  const days = Math.floor(remainingMs / DAY_MS)
  remainingMs -= days * DAY_MS
  const hours = Math.floor(remainingMs / HOUR_MS)
  remainingMs -= hours * HOUR_MS
  const minutes = Math.floor(remainingMs / MINUTE_MS)
  remainingMs -= minutes * MINUTE_MS
  const seconds = Math.floor(remainingMs / SECOND_MS)

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}
