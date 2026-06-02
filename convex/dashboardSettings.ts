export type DashboardSettingsRow = {
  defaultDateRange: unknown
  visibleProviderIds?: string[]
  hiddenDeveloperIds: string[]
  includeInactiveDevelopers?: boolean
}

export type TvSlideRow = {
  id: string
  enabled: boolean
  order: number
  durationSeconds: number
}

export type TvSettingsRow = {
  dateRange: unknown
  visibleProviderIds?: string[]
  visibleDeveloperIds?: string[]
  slides?: TvSlideRow[]
  theme?: string
}

const TV_SLIDE_IDS = [
  "team-overview",
  "developer-leaderboard",
  "provider-breakdown",
  "cursor-pool",
  "sync-health",
] as const

type TvSlideId = (typeof TV_SLIDE_IDS)[number]

export function defaultDashboardSettings() {
  return {
    defaultDateRange: { preset: "last7" as const },
    visibleProviderIds: null,
    hiddenDeveloperIds: [],
    includeInactiveDevelopers: false,
  }
}

export function publicDashboardSettings(settings: DashboardSettingsRow | null) {
  if (!settings) return defaultDashboardSettings()

  return {
    defaultDateRange: settings.defaultDateRange,
    visibleProviderIds: settings.visibleProviderIds ?? null,
    hiddenDeveloperIds: settings.hiddenDeveloperIds,
    includeInactiveDevelopers: settings.includeInactiveDevelopers ?? false,
  }
}

export function defaultTvSettings() {
  return {
    dateRange: { preset: "last7" as const },
    visibleProviderIds: null,
    visibleDeveloperIds: null,
    slides: defaultTvSlides(),
    theme: "dark",
  }
}

export function publicTvSettings(settings: TvSettingsRow | null) {
  if (!settings) return defaultTvSettings()

  return {
    dateRange: settings.dateRange,
    visibleProviderIds: settings.visibleProviderIds ?? null,
    visibleDeveloperIds: settings.visibleDeveloperIds ?? null,
    slides: normalizeTvSlides(settings.slides ?? defaultTvSlides()),
    theme: settings.theme ?? "dark",
  }
}

export function defaultTvSlides() {
  return TV_SLIDE_IDS.map((id, order) => ({
    id,
    enabled: true,
    order,
    durationSeconds: 10,
  }))
}

export function normalizeTvSlides(slides: TvSlideRow[]) {
  const byId = new Map(slides.map((slide) => [slide.id, slide]))
  return TV_SLIDE_IDS.map((id, defaultOrder) => {
    const slide = byId.get(id)
    return {
      id,
      enabled: slide?.enabled ?? true,
      order: finiteInteger(slide?.order) ?? defaultOrder,
      durationSeconds: validDurationSeconds(slide?.durationSeconds) ?? 10,
    }
  }).sort((left, right) => left.order - right.order)
}

export function isValidDateRange(value: unknown) {
  if (!value || typeof value !== "object") return false
  const range = value as { preset?: unknown; startDay?: unknown; endDay?: unknown }
  if (
    range.preset === "last7" ||
    range.preset === "last30" ||
    range.preset === "last90" ||
    range.preset === "allTime"
  ) {
    return true
  }
  if (
    range.preset !== "custom" ||
    typeof range.startDay !== "string" ||
    typeof range.endDay !== "string"
  ) {
    return false
  }
  return isValidUtcDay(range.startDay) && isValidUtcDay(range.endDay) && range.endDay >= range.startDay
}

export function isValidTvSlides(
  slides: Array<{ id: string; order: number; durationSeconds: number }>
) {
  if (slides.length !== TV_SLIDE_IDS.length) return false
  const ids = new Set<TvSlideId>()

  for (const slide of slides) {
    if (!isTvSlideId(slide.id)) return false
    if (ids.has(slide.id)) return false
    if (!Number.isInteger(slide.order)) return false
    if (validDurationSeconds(slide.durationSeconds) === null) return false
    ids.add(slide.id)
  }

  return TV_SLIDE_IDS.every((id) => ids.has(id))
}

function isValidUtcDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const date = new Date(`${day}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day
}

function isTvSlideId(id: string): id is TvSlideId {
  return (TV_SLIDE_IDS as readonly string[]).includes(id)
}

function validDurationSeconds(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 300) {
    return null
  }
  return value
}

function finiteInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null
  return value
}
