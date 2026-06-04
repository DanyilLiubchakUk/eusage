import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { formatCount, formatPercent, formatUsd } from "./dashboard-formatting"
import type { TvDashboardModel } from "./tv-dashboard-data"

export function TvSlide({
  slide,
  teamName,
}: {
  slide: TvDashboardModel["slides"][number]
  teamName: string
}) {
  return (
    <section className={tvSlideClass} aria-labelledby="tv-title">
      <p className={tvEyebrowClass}>{slide.title}</p>
      {slide.kind === "team-overview" ? <TeamOverviewSlide slide={slide} teamName={teamName} /> : null}
      {slide.kind === "developer-leaderboard" ? <DeveloperLeaderboardSlide slide={slide} /> : null}
      {slide.kind === "provider-breakdown" ? <ProviderBreakdownSlide slide={slide} /> : null}
      {slide.kind === "cursor-pool" ? <CursorPoolSlide slide={slide} /> : null}
      {slide.kind === "sync-health" ? <SyncHealthSlide slide={slide} /> : null}
      <p className={tvFreshnessClass}>{slide.freshnessLabel}</p>
    </section>
  )
}

export function NoSlides() {
  return (
    <section className={tvSlideClass} aria-labelledby="tv-title">
      <p className={tvEyebrowClass}>TV</p>
      <h1 id="tv-title" className={tvHeadingClass}>No slides enabled</h1>
      <p className={tvSubtitleClass}>Open TV settings to enable a slide.</p>
      <p className={tvFreshnessClass}>Updates: No data yet</p>
    </section>
  )
}

function TeamOverviewSlide({
  slide,
  teamName,
}: {
  slide: Extract<TvDashboardModel["slides"][number], { kind: "team-overview" }>
  teamName: string
}) {
  return (
    <>
      <h1 id="tv-title" className={tvHeadingClass}>{slide.headline}</h1>
      <p className={tvSubtitleClass}>
        {teamName} · {slide.subtitle}
      </p>
      <MetricSummaryGrid items={slide.summary} />
      <TvMetricTable rows={slide.metricRows} />
    </>
  )
}

function DeveloperLeaderboardSlide({
  slide,
}: {
  slide: Extract<TvDashboardModel["slides"][number], { kind: "developer-leaderboard" }>
}) {
  return (
    <>
      <h1 id="tv-title" className={tvHeadingClass}>Developer Leaderboard</h1>
      {slide.rows.length > 0 ? (
        <ol className="m-0 grid max-h-[48dvh] w-full max-w-[70rem] list-none gap-3 overflow-y-auto p-0 pr-1">
          {slide.rows.map((row, index) => (
            <li
              key={row.developerId}
              className="grid min-h-16 grid-cols-[3rem_minmax(0,1fr)_auto_auto] items-center gap-4 rounded-xl border border-white/15 bg-white/10 px-4 py-3 max-md:grid-cols-1"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#9ad0b0]/15 text-lg font-black text-[#9ad0b0]">
                {index + 1}
              </span>
              <strong className="break-words text-xl">{row.developerName}</strong>
              <span className="font-bold text-[#c0d0c7]">{formatCount(row.tokensTotal)} tokens</span>
              <span className="font-bold text-[#c0d0c7]">{formatUsd(row.estimatedCostUsd)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={tvEmptyClass}>No developer usage yet</p>
      )}
    </>
  )
}

function ProviderBreakdownSlide({
  slide,
}: {
  slide: Extract<TvDashboardModel["slides"][number], { kind: "provider-breakdown" }>
}) {
  return (
    <>
      <h1 id="tv-title" className={tvHeadingClass}>Provider Breakdown</h1>
      {slide.rows.length > 0 ? (
        <div className={tvListClass}>
          {slide.rows.map((row) => (
            <div key={row.providerId} className={tvListRowClass}>
              <strong className="break-words text-xl">{row.providerName}</strong>
              <span className="font-bold text-[#c0d0c7]">{row.value}</span>
              <span className="font-bold text-[#c0d0c7]">{row.quota}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className={tvEmptyClass}>No provider usage yet</p>
      )}
    </>
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
    <>
      <h1 id="tv-title" className={tvHeadingClass}>
        {slide.pool.available ? formatUsd(slide.pool.remainingUsd) : "No data yet"}
      </h1>
      <p className={tvSubtitleClass}>
        {slide.pool.available
          ? `${slide.pool.label} remaining · ${slide.pool.coverage.label}`
          : "Cursor pool needs synced budget rows"}
      </p>
      <div
        className="grid h-[min(15rem,30dvh)] w-full max-w-md items-end overflow-hidden rounded-xl border-2 border-[#9ad0b0]/45 bg-white/10"
        aria-label="Cursor pool used"
      >
        <div
          className="min-h-2 bg-[linear-gradient(180deg,_#9ad0b0,_#254434)]"
          style={{ height: `${fill}%` }}
        />
      </div>
      {slide.developerRows.length > 0 ? (
        <div className={tvListClass}>
          {slide.developerRows.map((row) => (
            <div key={row.developerName} className={tvListRowClass}>
              <strong className="break-words text-xl">{row.developerName}</strong>
              <span className="font-bold text-[#c0d0c7]">{formatUsd(row.usedUsd)} used</span>
              <span className="font-bold text-[#c0d0c7]">{formatPercent(row.sharePercent)} of personal limit</span>
            </div>
          ))}
        </div>
      ) : (
        <p className={tvEmptyClass}>No developer Cursor budget rows yet</p>
      )}
    </>
  )
}

function SyncHealthSlide({
  slide,
}: {
  slide: Extract<TvDashboardModel["slides"][number], { kind: "sync-health" }>
}) {
  return (
    <>
      <h1 id="tv-title" className={tvHeadingClass}>{slide.health.label}</h1>
      <p className={tvSubtitleClass}>{slide.health.status}</p>
      {slide.health.rows.length > 0 ? (
        <div className={tvListClass}>
          {slide.health.rows.map((row) => (
            <div key={`${row.developerName}:${row.deviceName}`} className={tvListRowClass}>
              <strong className="break-words text-xl">{row.developerName}</strong>
              <span className="font-bold text-[#c0d0c7]">{row.deviceName}</span>
              <span className={cn("justify-self-end rounded-full px-3 py-1.5 font-extrabold capitalize text-[#06140d]", syncStatusClass[row.status])}>
                {row.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className={tvEmptyClass}>No device sync rows yet</p>
      )}
    </>
  )
}

function TvMetricTable({
  rows,
}: {
  rows: Extract<TvDashboardModel["slides"][number], { kind: "team-overview" }>["metricRows"]
}) {
  return (
    <Table className="w-full max-w-[90rem] text-[#dbe7e0]" aria-label="Available metrics">
      <TableHeader>
        <TableRow className="border-white/15 hover:bg-transparent">
          <TableHead className="text-[#9ad0b0]">Metric</TableHead>
          <TableHead className="text-[#9ad0b0]">Value</TableHead>
          <TableHead className="text-[#9ad0b0]">Source</TableHead>
          <TableHead className="text-[#9ad0b0]">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.metric} className="border-white/10 hover:bg-white/5">
            <TableHead scope="row" className="text-[#dbe7e0]">{row.metric}</TableHead>
            <TableCell>{row.value}</TableCell>
            <TableCell>{row.source}</TableCell>
            <TableCell>{row.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function MetricSummaryGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <section className="grid w-full max-w-[90rem] grid-cols-4 overflow-hidden rounded-xl border border-white/15 bg-white/15 max-md:grid-cols-1" aria-label="Summary metrics">
      {items.map(([label, value]) => (
        <div key={label} className="grid min-w-0 gap-1 bg-[#14211c]/90 p-4">
          <span className="text-xs font-extrabold uppercase tracking-wide text-[#9ad0b0]">{label}</span>
          <strong className="break-words text-xl">{value}</strong>
        </div>
      ))}
    </section>
  )
}

const tvSlideClass =
  "grid min-h-dvh w-full max-w-[min(92rem,100%)] content-center gap-5 py-12 pr-0 max-md:gap-4 max-md:py-8 max-md:pb-40"

const tvEyebrowClass =
  "m-0 inline-flex w-fit rounded-full border border-[#9ad0b0]/40 bg-[#9ad0b0]/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#9ad0b0]"

const tvHeadingClass =
  "m-0 max-w-[14ch] text-7xl font-black leading-[0.92] text-white max-lg:text-6xl max-md:text-5xl"

const tvSubtitleClass = "m-0 text-2xl text-[#b8c8bf] max-md:text-xl"

const tvFreshnessClass = "m-0 text-base font-bold text-[#8aa096]"

const tvEmptyClass = "m-0 text-2xl text-[#c0d0c7]"

const tvListClass = "grid max-h-[48dvh] w-full max-w-[70rem] gap-3 overflow-y-auto pr-1"

const tvListRowClass =
  "grid min-h-16 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 rounded-xl border border-white/15 bg-white/10 px-4 py-3 max-md:grid-cols-1"

const syncStatusClass: Record<string, string> = {
  connected: "bg-[#9ad0b0]",
  stale: "bg-[#f0b252]",
  disconnected: "bg-[#f87171]",
  archived: "bg-[#f87171]",
}
