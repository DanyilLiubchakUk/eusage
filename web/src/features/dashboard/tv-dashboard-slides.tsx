import type { ReactNode } from "react"
import { formatCount, formatUsd } from "./dashboard-formatting"
import type { TvDashboardModel } from "./tv-dashboard-data"
import {
  TvBarList,
  TvDataRows,
  TvEmptyState,
  TvMetricRail,
  TvReservoir,
  TvSignalStrip,
  TvSparkPanel,
} from "./tv-dashboard-visuals"

export function TvSlide({
  slide,
  teamName,
}: {
  slide: TvDashboardModel["slides"][number]
  teamName: string
}) {
  if (slide.kind === "team-overview") return <TeamOverviewSlide slide={slide} teamName={teamName} />
  if (slide.kind === "developer-leaderboard") return <DeveloperLeaderboardSlide slide={slide} />
  if (slide.kind === "provider-breakdown") return <ProviderBreakdownSlide slide={slide} />
  if (slide.kind === "cursor-pool") return <CursorPoolSlide slide={slide} />
  if (slide.kind === "sync-health") return <SyncHealthSlide slide={slide} />
  return null
}

export function NoSlides() {
  return (
    <TvSlideFrame
      title="TV"
      freshnessLabel="Updates: No data yet"
      hero={
        <>
          <h1 id="tv-title" className={tvHeadingClass}>No slides enabled</h1>
          <p className={tvSubtitleClass}>Open TV settings to enable a slide.</p>
        </>
      }
      visual={<TvEmptyState>Open TV settings to enable a slide.</TvEmptyState>}
    />
  )
}

function TeamOverviewSlide({
  slide,
  teamName,
}: {
  slide: Extract<TvDashboardModel["slides"][number], { kind: "team-overview" }>
  teamName: string
}) {
  const latestTokenPoint = lastPoint(slide.trend.tokenPoints)
  const latestCostPoint = lastPoint(slide.trend.estimatedCostPoints)

  return (
    <TvSlideFrame
      title={slide.title}
      freshnessLabel={slide.freshnessLabel}
      hero={
        <>
          <h1 id="tv-title" className={tvHeadingClass}>{slide.headline}</h1>
          <p className={tvSubtitleClass}>
            {teamName} / {slide.subtitle}
          </p>
          <p className={tvDescriptionClass}>
            Sum of visible providers and developers for the selected TV range. Movement charts use daily token and estimated API cost samples.
          </p>
        </>
      }
      visual={
        <div className="grid h-full min-h-0 min-w-0 grid-cols-2 gap-[clamp(0.85rem,1.4vw,1.8rem)] max-lg:grid-cols-1">
          <TvSparkPanel
            title="Tokens movement"
            primary={latestTokenPoint ? `${formatCount(latestTokenPoint.value)} tokens` : slide.headline}
            secondary={slide.subtitle}
            points={slide.trend.tokenPoints}
            tone="green"
            emptyLabel="No token movement yet"
          />
          <TvSparkPanel
            title="Cost movement"
            primary={latestCostPoint ? formatUsd(latestCostPoint.value) : "No cost data"}
            secondary="Estimated API equivalent"
            points={slide.trend.estimatedCostPoints}
            tone="cyan"
            emptyLabel="No cost movement yet"
          />
        </div>
      }
      support={
        <div className="grid min-h-0 gap-[clamp(0.6rem,1vw,1rem)] overflow-hidden">
          <TvSignalStrip items={slide.summary} />
          <TvMetricRail rows={slide.metricRows} />
        </div>
      }
    />
  )
}

function DeveloperLeaderboardSlide({
  slide,
}: {
  slide: Extract<TvDashboardModel["slides"][number], { kind: "developer-leaderboard" }>
}) {
  const topDeveloper = slide.rows[0] ?? null

  return (
    <TvSlideFrame
      title={slide.title}
      freshnessLabel={slide.freshnessLabel}
      hero={
        <>
          <h1 id="tv-title" className={tvHeadingClass}>{topDeveloper ? topDeveloper.developerName : "No data yet"}</h1>
          <p className={tvSubtitleClass}>
            {topDeveloper
              ? `${formatCount(topDeveloper.tokensTotal)} tokens / ${formatUsd(topDeveloper.estimatedCostUsd)} / #1 developer`
              : "No visible developer usage"}
          </p>
          <p className={tvDescriptionClass}>
            Ranked visible developers by estimated cost when available, otherwise by total tokens in the selected TV range.
          </p>
        </>
      }
      visual={
        <TvBarList
          ariaLabel="Developer usage ranking"
          emptyLabel="No developer usage yet"
          rows={slide.rows.map((row, index) => ({
            id: row.developerId,
            label: `${index + 1}. ${row.developerName}`,
            value: row.estimatedCostUsd > 0 ? row.estimatedCostUsd : row.tokensTotal,
            displayValue: row.estimatedCostUsd > 0 ? formatUsd(row.estimatedCostUsd) : `${formatCount(row.tokensTotal)} tokens`,
            meta: `${formatCount(row.tokensTotal)} tokens / ${row.providerCount || 0} providers`,
          }))}
        />
      }
    />
  )
}

function ProviderBreakdownSlide({
  slide,
}: {
  slide: Extract<TvDashboardModel["slides"][number], { kind: "provider-breakdown" }>
}) {
  const topProvider = slide.chartRows[0] ?? null

  return (
    <TvSlideFrame
      title={slide.title}
      freshnessLabel={slide.freshnessLabel}
      hero={
        <>
          <h1 id="tv-title" className={tvHeadingClass}>{topProvider ? topProvider.providerName : "No data yet"}</h1>
          <p className={tvSubtitleClass}>
            {topProvider ? `${topProvider.label} / top provider` : "No visible provider usage"}
          </p>
          <p className={tvDescriptionClass}>
            Across visible providers for the selected TV range. Bars rank usage totals; labels include tokens, credits, cost, synced rows, and quota signals when available.
          </p>
        </>
      }
      visual={
        <TvBarList
          ariaLabel="Provider usage bars"
          emptyLabel="No provider usage yet"
          rows={slide.chartRows.map((row) => ({
            id: row.providerId,
            label: row.providerName,
            value: row.value,
            displayValue: row.label,
            metaLines: providerMetaLines(row.details, slide.rows.find((statusRow) => statusRow.providerId === row.providerId)?.quota),
          }))}
        />
      }
    />
  )
}

function CursorPoolSlide({
  slide,
}: {
  slide: Extract<TvDashboardModel["slides"][number], { kind: "cursor-pool" }>
}) {
  const fill = slide.pool.available
    ? Math.max(0, Math.min(100, (slide.pool.usedUsd / slide.pool.limitUsd) * 100))
    : 0

  return (
    <TvSlideFrame
      title={slide.title}
      freshnessLabel={slide.freshnessLabel}
      hero={
        <>
          <h1 id="tv-title" className={tvHeadingClass}>
            {slide.pool.available ? formatUsd(slide.pool.remainingUsd) : "No data yet"}
          </h1>
          <p className={tvSubtitleClass}>
            {slide.pool.available
              ? `${slide.pool.label} remaining / ${slide.pool.coverage.label}`
              : "Cursor pool needs synced budget rows"}
          </p>
          <p className={tvDescriptionClass}>
            Current Cursor pool budget from the latest synced Cursor rows. The reservoir shows used budget versus remaining budget.
          </p>
        </>
      }
      visual={
        <TvReservoir
          label="Budget reservoir"
          usedPercent={fill}
          ratioLabel={slide.pool.available ? `${formatWholeUsd(slide.pool.remainingUsd)} / ${formatWholeUsd(slide.pool.limitUsd)}` : "No data yet"}
        />
      }
    />
  )
}

function SyncHealthSlide({
  slide,
}: {
  slide: Extract<TvDashboardModel["slides"][number], { kind: "sync-health" }>
}) {
  return (
    <TvSlideFrame
      title={slide.title}
      freshnessLabel={slide.freshnessLabel}
      hero={
        <>
          <h1 id="tv-title" className={tvHeadingClass}>{slide.health.label}</h1>
          <p className={tvSubtitleClass}>{slide.health.status}</p>
          <p className={tvDescriptionClass}>
            Connected devices from visible developers. Rows show each latest device check-in status.
          </p>
        </>
      }
      visual={
        <TvDataRows
          ariaLabel="Device sync rows"
          emptyLabel="No device sync rows yet"
          rows={slide.health.rows.map((row) => ({
            id: `${row.developerName}:${row.deviceName}`,
            label: row.developerName,
            value: row.status,
            meta: row.deviceName,
            tone: syncStatusTone[row.status] ?? "neutral",
          }))}
        />
      }
    />
  )
}

function TvSlideFrame({
  title,
  freshnessLabel,
  hero,
  visual,
  support,
}: {
  title: string
  freshnessLabel: string
  hero: ReactNode
  visual: ReactNode
  support?: ReactNode
}) {
  const hasSupport = Boolean(support)

  return (
    <section className={tvSlideClass} aria-labelledby="tv-title">
      <header className={tvHeaderClass} aria-label="TV slide metadata">
        <p className={tvEyebrowClass}>{title}</p>
        <p className={tvFreshnessClass}>{freshnessLabel}</p>
      </header>
      <div className={hasSupport ? tvStageClass : tvStageWithoutSupportClass}>
        <div className={tvHeroSlotClass} aria-label="Primary slide metric">{hero}</div>
        <div className={tvVisualSlotClass} aria-label="Slide visual detail">{visual}</div>
        {hasSupport ? (
          <div className={tvSupportSlotClass} aria-label="Slide supporting metrics">{support}</div>
        ) : null}
      </div>
    </section>
  )
}

function lastPoint(points: Array<{ value: number }>) {
  return points[points.length - 1] ?? null
}

function providerMetaLines(details: string[], quota?: string) {
  return quota ? [details[0] ?? quota, [details[1], quota].filter(Boolean).join(" / ")] : details
}

function formatWholeUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

const tvSlideClass =
  "grid h-full max-h-dvh min-h-0 w-full grid-rows-[clamp(4.5rem,6vh,7rem)_minmax(0,1fr)] gap-[clamp(0.8rem,1.15vw,1.6rem)] overflow-hidden pb-[clamp(4.5rem,7.5vh,8rem)] pt-[clamp(0.8rem,1.7vh,2.5rem)] pr-0"

const tvHeaderClass =
  "grid h-full min-w-0 grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)] items-center gap-[clamp(1rem,1.4vw,2rem)]"

const tvEyebrowClass =
  "m-0 min-w-0 truncate rounded-full border border-[#9ad0b0]/45 bg-[#9ad0b0]/15 px-[clamp(1rem,1.15vw,1.6rem)] py-[clamp(0.5rem,0.65vw,0.85rem)] text-[clamp(0.95rem,1vw,1.5rem)] font-black uppercase tracking-wide text-[#9ad0b0]"

const tvHeadingClass =
  "m-0 max-w-[12ch] break-words text-[clamp(4rem,8vw,18rem)] font-black leading-[0.86] text-[#eef8f1]"

const tvSubtitleClass =
  "m-0 max-w-[46ch] text-[clamp(1.7rem,2.05vw,4rem)] font-bold leading-tight text-[#cdebd8]"

const tvDescriptionClass =
  "m-0 max-w-[48ch] text-[clamp(1rem,1.15vw,1.9rem)] font-bold leading-snug text-[#9ad0b0]"

const tvFreshnessClass =
  "m-0 min-w-0 truncate text-right text-[clamp(1rem,1.05vw,1.55rem)] font-black uppercase tracking-wide text-[#9ad0b0]"

const tvStageClass =
  "grid min-h-0 min-w-0 grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] grid-rows-[minmax(0,1fr)_minmax(clamp(8rem,19vh,24rem),auto)] gap-[clamp(0.85rem,1.35vw,2.2rem)] overflow-hidden max-lg:grid-cols-1 max-lg:grid-rows-[auto_minmax(0,1fr)_auto]"

const tvStageWithoutSupportClass =
  "grid min-h-0 min-w-0 grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] gap-[clamp(0.85rem,1.35vw,2.2rem)] overflow-hidden max-lg:grid-cols-1 max-lg:grid-rows-[auto_minmax(0,1fr)]"

const tvHeroSlotClass =
  "col-start-1 row-start-1 grid min-h-0 min-w-0 content-start gap-[clamp(0.6rem,0.85vw,1.25rem)] overflow-hidden pt-[clamp(0.75rem,3vh,4rem)] max-lg:col-start-1 max-lg:row-start-1 max-lg:pt-0"

const tvVisualSlotClass =
  "col-start-2 row-start-1 min-h-0 min-w-0 overflow-hidden max-lg:col-start-1 max-lg:row-start-2"

const tvSupportSlotClass =
  "col-span-2 col-start-1 row-start-2 min-h-0 min-w-0 overflow-hidden max-lg:col-span-1 max-lg:row-start-3"

const syncStatusTone: Record<string, "green" | "amber" | "red" | "neutral"> = {
  connected: "green",
  stale: "amber",
  disconnected: "red",
  archived: "red",
}
