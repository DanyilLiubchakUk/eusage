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
    <section className="tv-slide" aria-labelledby="tv-title">
      <p className="setup-eyebrow">{slide.title}</p>
      {slide.kind === "team-overview" ? <TeamOverviewSlide slide={slide} teamName={teamName} /> : null}
      {slide.kind === "developer-leaderboard" ? <DeveloperLeaderboardSlide slide={slide} /> : null}
      {slide.kind === "provider-breakdown" ? <ProviderBreakdownSlide slide={slide} /> : null}
      {slide.kind === "cursor-pool" ? <CursorPoolSlide slide={slide} /> : null}
      {slide.kind === "sync-health" ? <SyncHealthSlide slide={slide} /> : null}
      <p className="tv-freshness">{slide.freshnessLabel}</p>
    </section>
  )
}

export function NoSlides() {
  return (
    <section className="tv-slide" aria-labelledby="tv-title">
      <p className="setup-eyebrow">TV</p>
      <h1 id="tv-title">No slides enabled</h1>
      <p className="tv-subtitle">Open TV settings to enable a slide.</p>
      <p className="tv-freshness">Updates: No data yet</p>
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
      <h1 id="tv-title">{slide.headline}</h1>
      <p className="tv-subtitle">
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
      <h1 id="tv-title">Developer Leaderboard</h1>
      {slide.rows.length > 0 ? (
        <ol className="tv-rank-list">
          {slide.rows.map((row) => (
            <li key={row.developerId}>
              <strong>{row.developerName}</strong>
              <span>{formatCount(row.tokensTotal)} tokens</span>
              <span>{formatUsd(row.estimatedCostUsd)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="tv-empty">No developer usage yet</p>
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
      <h1 id="tv-title">Provider Breakdown</h1>
      {slide.rows.length > 0 ? (
        <div className="tv-provider-list">
          {slide.rows.map((row) => (
            <div key={row.providerId}>
              <strong>{row.providerName}</strong>
              <span>{row.value}</span>
              <span>{row.quota}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="tv-empty">No provider usage yet</p>
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
      <h1 id="tv-title">
        {slide.pool.available ? formatUsd(slide.pool.remainingUsd) : "No data yet"}
      </h1>
      <p className="tv-subtitle">
        {slide.pool.available
          ? `${slide.pool.label} remaining · ${slide.pool.coverage.label}`
          : "Cursor pool needs synced budget rows"}
      </p>
      <div className="tv-reservoir" aria-label="Cursor pool used">
        <div style={{ height: `${fill}%` }} />
      </div>
      {slide.developerRows.length > 0 ? (
        <div className="tv-provider-list">
          {slide.developerRows.map((row) => (
            <div key={row.developerName}>
              <strong>{row.developerName}</strong>
              <span>{formatUsd(row.usedUsd)} used</span>
              <span>{formatPercent(row.sharePercent)} of personal limit</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="tv-empty">No developer Cursor budget rows yet</p>
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
      <h1 id="tv-title">{slide.health.label}</h1>
      <p className="tv-subtitle">{slide.health.status}</p>
      {slide.health.rows.length > 0 ? (
        <div className="tv-sync-list">
          {slide.health.rows.map((row) => (
            <div key={`${row.developerName}:${row.deviceName}`}>
              <strong>{row.developerName}</strong>
              <span>{row.deviceName}</span>
              <span className={`tv-sync-status tv-sync-status-${row.status}`}>{row.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="tv-empty">No device sync rows yet</p>
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
    <table className="tv-metric-table" aria-label="Available metrics">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
          <th>Source</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.metric}>
            <th scope="row">{row.metric}</th>
            <td>{row.value}</td>
            <td>{row.source}</td>
            <td>{row.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MetricSummaryGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <section className="tv-metric-grid" aria-label="Summary metrics">
      {items.map(([label, value]) => (
        <div key={label}>
          <span className="setup-label">{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  )
}
