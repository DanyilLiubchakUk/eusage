import {
  calculateCursorPool,
  calculateDashboardUsage,
  calculateQuotaPressure,
  calculateSampledUsage,
  dedupeLatestDeviceSnapshots,
  formatUpdateFreshnessLabel,
  isMetricSampleInWindow,
  isTimestampInWindow,
  percentChange,
  resolveMetricDateRange,
  snapshotRangeTimestamp,
  type MetricDateRangeInput,
  type MetricRangeWindow,
  type UsageMetricSampleSourceRow,
  type UsageSnapshotSourceRow,
} from "../../lib/metrics"
import {
  buildAvailableMetricRows,
  buildDeveloperLeaderboardRows,
  buildProviderStatusRows,
  type AvailableMetricRow,
  type DeveloperLeaderboardRow,
  type ProviderStatusRow,
} from "./admin-overview-tables"
import { formatCount, formatPercentDelta, formatProviderName, formatUsd } from "./dashboard-formatting"
import { buildDashboardDateRangeBounds } from "./dashboard-date-range-bounds"
import { dashboardDeviceName } from "./dashboard-device-name"
import { dashboardSource, type ReadyDashboardState } from "./dashboard-source"

export const TV_SLIDE_DEFINITIONS = [
  { id: "team-overview", title: "Team Overview" },
  { id: "developer-leaderboard", title: "Developer Leaderboard" },
  { id: "provider-breakdown", title: "Provider Breakdown" },
  { id: "cursor-pool", title: "Cursor Budget" },
  { id: "sync-health", title: "Sync Health" },
] as const

export type TvSlideId = (typeof TV_SLIDE_DEFINITIONS)[number]["id"]

export type TvSlideConfig = {
  id: TvSlideId
  enabled: boolean
  order: number
  durationSeconds: number
}

export type TvSlideSetting = TvSlideConfig & {
  title: string
}

export type TvSettingsPatch = {
  dateRange?: MetricDateRangeInput
  slides?: TvSlideConfig[]
}

export type TvDashboardModel = ReturnType<typeof buildTvDashboardModel>

const DEFAULT_DURATION_SECONDS = 10
const MIN_DURATION_SECONDS = 5
const MAX_DURATION_SECONDS = 300

export function buildTvDashboardModel(state: ReadyDashboardState, now: number) {
  const source = dashboardSource(state, "tv")
  const rangeOptions = { reportingTimeZone: source.reportingTimeZone }
  const range = resolveMetricDateRange(source.dateRange, now, rangeOptions)
  const usage = calculateDashboardUsage({
    snapshots: source.snapshots,
    range: source.dateRange,
    now,
    options: rangeOptions,
  })
  const sampledUsage = calculateSampledUsage({
    samples: source.metricSamples,
    window: range.current,
  })
  const previousSampledUsage = range.comparison
    ? calculateSampledUsage({ samples: source.metricSamples, window: range.comparison })
    : null
  const cursorPool = calculateCursorPool({
    snapshots: source.snapshots,
    window: range.current,
    visibleDeveloperIds: source.visibleDeveloperIds,
  })
  const quota = calculateQuotaPressure({
    snapshots: source.snapshots,
    metricSamples: source.metricSamples,
    window: range.current,
    visibleDeveloperIds: source.visibleDeveloperIds,
    visibleProviderIds: source.visibleProviderIds,
  })
  const syncHealth = buildSyncHealth(source.developers)
  const slideSettings = resolveTvSlideSettings(state.tvSettings?.slides)
  const providerRows = buildProviderStatusRows({
    providerIds: source.visibleProviderIds,
    snapshots: source.snapshots,
    providerTotals: sampledUsage.providerTotals,
    quotaProviders: quota.perProvider,
    quotaDetails: quota.details,
    window: range.current,
  })
  const leaderboardRows = buildDeveloperLeaderboardRows(
    source.developers,
    source.snapshots,
    source.metricSamples,
    range.current
  )
  const availableMetricRows = buildAvailableMetricRows({
    usage: usage.comparison.current,
    sampledUsage,
    tokenSamples: source.metricSamples.filter((sample) => sample.metricKey.endsWith(".tokens.total")),
    cursorPool,
    quota,
    syncHealth,
    rangeLabel: range.label,
  })

  const shared = {
    source,
    range: range.current,
    now,
  }
  const slides = slideSettings
    .filter((slide) => slide.enabled)
    .map((slide) => ({
      ...slide,
      ...buildSlideContent(slide.id, {
        ...shared,
        usage,
        sampledUsage,
        previousSampledUsage,
        cursorPool,
        quota,
        syncHealth,
        providerRows,
        leaderboardRows,
        availableMetricRows,
      }),
    }))

  return {
    teamName: state.team.name,
    reportingTimeZone: source.reportingTimeZone,
    dateRange: source.dateRange,
    dateBounds: buildDashboardDateRangeBounds(source.metricSamples, now, source.reportingTimeZone),
    rangeLabel: range.label,
    slideSettings,
    slides,
  }
}

export function resolveTvSlideSettings(value: unknown): TvSlideSetting[] {
  const rawSlides = Array.isArray(value) ? value : []
  const byId = new Map(
    rawSlides
      .filter(isRawSlide)
      .filter((slide) => isTvSlideId(slide.id))
      .map((slide) => [slide.id, slide])
  )

  return TV_SLIDE_DEFINITIONS.map((definition, defaultOrder) => {
    const slide = byId.get(definition.id)
    return {
      id: definition.id,
      title: definition.title,
      enabled: slide?.enabled ?? true,
      order: typeof slide?.order === "number" && Number.isInteger(slide.order) ? slide.order : defaultOrder,
      durationSeconds: validDurationSeconds(slide?.durationSeconds) ?? DEFAULT_DURATION_SECONDS,
    }
  }).sort((left, right) => left.order - right.order)
}

export function normalizeTvSlideConfigs(slides: TvSlideSetting[]): TvSlideConfig[] {
  return slides.map((slide, order) => ({
    id: slide.id,
    enabled: slide.enabled,
    order,
    durationSeconds: slide.durationSeconds,
  }))
}

export function parseTvSlideDuration(value: string | number) {
  const duration = typeof value === "number" ? value : Number(value)
  return validDurationSeconds(duration)
}

type SlideBuildArgs = {
  source: ReturnType<typeof dashboardSource>
  range: MetricRangeWindow
  now: number
  usage: ReturnType<typeof calculateDashboardUsage>
  sampledUsage: ReturnType<typeof calculateSampledUsage>
  previousSampledUsage: ReturnType<typeof calculateSampledUsage> | null
  cursorPool: ReturnType<typeof calculateCursorPool>
  quota: ReturnType<typeof calculateQuotaPressure>
  syncHealth: SyncHealth
  providerRows: ProviderStatusRow[]
  leaderboardRows: DeveloperLeaderboardRow[]
  availableMetricRows: AvailableMetricRow[]
}

function buildSlideContent(id: TvSlideId, args: SlideBuildArgs) {
  if (id === "team-overview") {
    const tokensPercentChange = args.previousSampledUsage
      ? percentChange(args.sampledUsage.tokensTotal, args.previousSampledUsage.tokensTotal)
      : null

    return {
      kind: id,
      headline: `${formatCount(args.sampledUsage.tokensTotal)} tokens`,
      subtitle: `${formatUsd(args.sampledUsage.estimatedCostUsd)} estimated cost · ${formatPercentDelta(tokensPercentChange)}`,
      summary: [
        ["Cursor pool", formatCursorPool(args.cursorPool)],
        ["Top provider", args.sampledUsage.topProvider ? formatProviderName(args.sampledUsage.topProvider.providerId) : "No data yet"],
        ["Active developers", String(args.source.visibleDeveloperIds.length)],
        ["Sync health", args.syncHealth.label],
      ] as Array<[string, string]>,
      metricRows: args.availableMetricRows,
      freshnessLabel: formatUpdateFreshnessLabel(
        [
          ...currentSnapshots(args.source.snapshots, args.range).map((row) => row.updatedAt),
          ...currentSamples(args.source.metricSamples, args.range).map((sample) => sample.updatedAt),
        ],
        args.now
      ),
    }
  }

  if (id === "developer-leaderboard") {
    return {
      kind: id,
      rows: args.leaderboardRows,
      freshnessLabel: formatUpdateFreshnessLabel(
        currentSnapshots(args.source.snapshots, args.range).map((row) => row.updatedAt),
        args.now
      ),
    }
  }

  if (id === "provider-breakdown") {
    return {
      kind: id,
      rows: args.providerRows,
      freshnessLabel: formatUpdateFreshnessLabel(
        currentSnapshots(args.source.snapshots, args.range).map((row) => row.updatedAt),
        args.now
      ),
    }
  }

  if (id === "cursor-pool") {
    const cursorRows = currentSnapshots(args.source.snapshots, args.range).filter(
      (row) => row.providerId === "cursor"
    )

    return {
      kind: id,
      pool: args.cursorPool,
      developerRows: cursorDeveloperRows(cursorRows),
      freshnessLabel: formatUpdateFreshnessLabel(cursorRows.map((row) => row.updatedAt), args.now),
    }
  }

  return {
    kind: id,
    health: args.syncHealth,
    freshnessLabel: formatUpdateFreshnessLabel(args.syncHealth.timestamps, args.now),
  }
}

type SyncHealth = {
  connectedDevices: number
  totalDevices: number
  label: string
  status: string
  timestamps: number[]
  rows: Array<{
    developerName: string
    deviceName: string
    status: string
    lastContactAt: number | null
  }>
}

function buildSyncHealth(developers: ReadyDashboardState["developers"]): SyncHealth {
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

function currentSnapshots(snapshots: UsageSnapshotSourceRow[], window: MetricRangeWindow) {
  return dedupeLatestDeviceSnapshots(snapshots).filter((snapshot) =>
    isTimestampInWindow(snapshotRangeTimestamp(snapshot), window)
  )
}

function currentSamples(samples: UsageMetricSampleSourceRow[], window: MetricRangeWindow) {
  return samples.filter((sample) => isMetricSampleInWindow(sample, window))
}

function cursorDeveloperRows(rows: UsageSnapshotSourceRow[]) {
  return rows
    .map((row) => {
      const cursor = row.summary.provider?.cursor
      const used = cursor?.onDemandUsedUsd ?? cursor?.individualUsedUsd
      const limit = cursor?.onDemandLimitUsd ?? cursor?.individualLimitUsd
      if (typeof used !== "number" || typeof limit !== "number" || limit <= 0) return null
      return {
        developerName: row.developerName ?? row.developerId,
        usedUsd: used,
        sharePercent: (used / limit) * 100,
      }
    })
    .filter((row): row is { developerName: string; usedUsd: number; sharePercent: number } => row !== null)
    .sort((left, right) => right.usedUsd - left.usedUsd)
}

function formatCursorPool(pool: ReturnType<typeof calculateCursorPool>) {
  if (!pool.available) return "No data yet"
  return `${formatUsd(pool.remainingUsd)} remaining`
}

function validDurationSeconds(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < MIN_DURATION_SECONDS ||
    value > MAX_DURATION_SECONDS
  ) {
    return null
  }
  return value
}

function isRawSlide(value: unknown): value is {
  id: string
  enabled: boolean
  order: number
  durationSeconds: number
} {
  if (!value || typeof value !== "object") return false
  const slide = value as Record<string, unknown>
  return (
    typeof slide.id === "string" &&
    typeof slide.enabled === "boolean" &&
    typeof slide.order === "number" &&
    typeof slide.durationSeconds === "number"
  )
}

function isTvSlideId(id: string): id is TvSlideId {
  return TV_SLIDE_DEFINITIONS.some((slide) => slide.id === id)
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
