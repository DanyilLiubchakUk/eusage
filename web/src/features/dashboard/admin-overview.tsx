import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { Info } from "lucide-react"
import { DashboardChart } from "./dashboard-chart"
import { AdminDateRangeControls } from "./admin-date-range-controls"
import { AdminProviderVisibilityControls } from "./admin-provider-visibility-controls"
import {
  buildAdminOverviewModel,
  formatTimestamp,
  type AvailableMetricRow,
  type DeveloperLeaderboardRow,
  type ProviderBreakdownRow,
  type ProviderStatusRow,
  type RecentSyncRow,
} from "./admin-overview-data"
import { formatCount, formatProviderName, formatUsd } from "./dashboard-formatting"
import type { ReadyDashboardState } from "./dashboard-source"
import type { MetricDateRangeInput } from "../../lib/metrics"
import { QuotaPressureTable } from "./admin-overview-quota-table"
import { CursorPoolPanel } from "./admin-overview-cursor-pool"
import "./admin-overview.css"
import "./admin-overview-interactions.css"

type AdminOverviewProps = {
  state: ReadyDashboardState
  now: number
  onDateRangeChange?: (value: MetricDateRangeInput) => Promise<void> | void
  onProviderVisibilityChange?: (visibleProviderIds: string[] | null) => Promise<void> | void
  onClearTeamData?: () => Promise<{ deleted: Record<string, number> }> | void
}

export function AdminOverview({
  state,
  now,
  onDateRangeChange,
  onProviderVisibilityChange,
  onClearTeamData,
}: AdminOverviewProps) {
  const model = buildAdminOverviewModel(state, now)
  const tokenPoints = model.tokenSeries.points
  const estimatedCostPoints = model.estimatedCostSeries.points
  const usageDays = chartDays(tokenPoints, estimatedCostPoints)
  const providerRows = model.providerBreakdownRows

  return (
    <main className="admin-page admin-overview">
      <header className="admin-overview-header">
        <div>
          <p className="setup-eyebrow">Admin Overview</p>
          <h1>{model.teamName}</h1>
          <p className="admin-overview-subtitle">
            Fixed all-up dashboard for visible team usage, provider health, and sync status.
          </p>
          <p className="admin-overview-freshness">{model.freshnessLabel}</p>
        </div>
        <div className="admin-overview-meta" aria-label="Dashboard filters">
          <div className="admin-overview-filter-row">
            <AdminDateRangeControls
              value={model.dateRange}
              bounds={model.dateBounds}
              onChange={onDateRangeChange}
            />
            <span>{model.rangeLabel}</span>
          </div>
          <div className="admin-overview-filter-row">
            <AdminProviderVisibilityControls
              providers={model.providerFilters}
              onChange={onProviderVisibilityChange}
            />
            <span>{model.filterSummary}</span>
          </div>
        </div>
      </header>

      <section className="admin-kpi-strip" aria-label="KPI strip">
        {model.kpis.map((item) => (
          <div key={item.label} className="admin-kpi">
            <span className="setup-label">{item.label}</span>
            <strong>{item.value}</strong>
            <span>{item.meta}</span>
          </div>
        ))}
      </section>

      <section className="admin-overview-grid admin-overview-grid-main">
        <DashboardPanel title="Team usage over time" meta="Tokens left · API equivalent right" height="chart">
          <DashboardChart
            type="line"
            ariaLabel="Team usage over time chart"
            labels={usageDays}
            datasets={[
              {
                label: "Tokens",
                data: chartValues(usageDays, tokenPoints),
                borderColor: "#0f766e",
                backgroundColor: "rgba(15, 118, 110, 0.16)",
                yAxisID: "y",
              },
              {
                label: "API equivalent",
                data: chartValues(usageDays, estimatedCostPoints),
                borderColor: "#b45309",
                backgroundColor: "rgba(180, 83, 9, 0.12)",
                yAxisID: "y1",
              },
            ]}
            emptyLabel="No token or cost samples yet"
          />
        </DashboardPanel>

        <DashboardPanel title="Provider breakdown" meta="Visible provider totals" height="chart">
          <DashboardChart
            type="bar"
            ariaLabel="Provider breakdown chart"
            labels={providerRows.map((row) => row.providerName)}
            datasets={[
              {
                label: "Usage",
                data: providerRows.map((row) => row.value),
                backgroundColor: "rgba(37, 99, 235, 0.72)",
              },
            ]}
            emptyLabel="No provider usage yet"
          />
          <ProviderBreakdownList rows={providerRows} />
        </DashboardPanel>
      </section>

      <section className="admin-overview-grid admin-overview-grid-support">
        <DashboardPanel title="Quota pressure" meta={model.quota.teamCoverage.label} height="tall">
          <QuotaPressureTable rows={model.quotaPressureRows} />
        </DashboardPanel>

        <div className="admin-overview-stack">
          <DashboardPanel title="Cursor budget" meta={model.cursorPool.coverage.label} height="short">
            <CursorPoolPanel pool={model.cursorPool} />
          </DashboardPanel>

          <DashboardPanel title="Sync health" meta={model.syncHealth.status} height="short">
            <SyncHealthPanel rows={model.recentSyncRows} />
          </DashboardPanel>

          <DashboardPanel title="Recent Syncs" meta="Latest visible devices" height="medium">
            <RecentSyncsTable rows={model.recentSyncRows} />
          </DashboardPanel>
        </div>
      </section>

      <section className="admin-overview-grid admin-overview-grid-tables">
        <DashboardPanel title="Developer leaderboard" meta="Default metric: total visible usage" height="medium">
          <DeveloperLeaderboardTable rows={model.developerLeaderboardRows} />
        </DashboardPanel>

        <DashboardPanel title="Top Developers" meta="Visible current range" height="medium">
          <DeveloperLeaderboardTable rows={model.developerLeaderboardRows} compact />
        </DashboardPanel>
      </section>

      <section className="admin-overview-grid">
        <DashboardPanel title="Provider Status" meta="Visible current range" height="medium">
          <ProviderStatusTable rows={model.providerStatusRows} />
        </DashboardPanel>
      </section>

      <section className="admin-overview-grid">
        <DashboardPanel title="Available Metrics" meta="Definitions and coverage" height="tall">
          <AvailableMetricsTable rows={model.availableMetricRows} />
        </DashboardPanel>
      </section>

      <section className="admin-overview-grid">
        <DashboardPanel title="Delete data" meta="Clear synced team records" height="short">
          <ClearTeamDataPanel onClearTeamData={onClearTeamData} />
        </DashboardPanel>
      </section>
    </main>
  )
}

type ChartPoint = {
  day: string
  value: number
}

function chartDays(...series: ChartPoint[][]) {
  return [...new Set(series.flatMap((points) => points.map((point) => point.day)))].sort()
}

function chartValues(days: string[], points: ChartPoint[]) {
  const valuesByDay = new Map(points.map((point) => [point.day, point.value]))
  return days.map((day) => valuesByDay.get(day) ?? 0)
}

function DashboardPanel({
  title,
  meta,
  children,
  height = "medium",
}: {
  title: string
  meta: string
  children: ReactNode
  height?: "short" | "medium" | "tall" | "chart"
}) {
  return (
    <section className={`admin-panel admin-panel-${height}`} aria-label={title}>
      <div className="admin-panel-header">
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <div className="admin-panel-body">{children}</div>
    </section>
  )
}

function ProviderBreakdownList({ rows }: { rows: ProviderBreakdownRow[] }) {
  if (rows.length === 0) return null

  return (
    <ul className="admin-provider-list">
      {rows.map((row) => (
        <li key={row.providerId}>
          <span>{row.providerName}</span>
          <strong>{row.label}</strong>
        </li>
      ))}
    </ul>
  )
}

function DeveloperLeaderboardTable({
  rows,
  compact = false,
}: {
  rows: DeveloperLeaderboardRow[]
  compact?: boolean
}) {
  return (
    <table className="admin-compact-table">
      <thead>
        <tr>
          <th>Developer</th>
          <th>Usage</th>
          {!compact && <th>Providers</th>}
          <th>Last update</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <NoDataRow colSpan={compact ? 3 : 4} label="No developer usage yet" />
        ) : (
          rows.map((row) => (
            <tr key={row.developerId}>
              <td>
                <strong>{row.developerName}</strong>
                <span>{row.developerStatus}</span>
              </td>
              <td>
                <strong>{formatCount(row.tokensTotal)} tokens</strong>
                <span>{formatUsd(row.estimatedCostUsd)} · {formatCount(row.creditsUsed)} credits</span>
              </td>
              {!compact && <td>{row.providerCount}</td>}
              <td>{formatTimestamp(row.latestUpdatedAt)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

function SyncHealthPanel({ rows }: { rows: RecentSyncRow[] }) {
  if (rows.length === 0) return <p className="admin-empty-row">No device sync rows yet</p>

  return (
    <ul className="admin-sync-list">
      {rows.slice(0, 4).map((row) => (
        <li key={`${row.developerName}:${row.deviceName}`}>
          <strong>{row.developerName}</strong>
          <span>
            {row.deviceName} · {row.status} · {formatTimestamp(row.lastContactAt)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ProviderStatusTable({ rows }: { rows: ProviderStatusRow[] }) {
  return (
    <table className="admin-compact-table">
      <thead>
        <tr>
          <th>Provider</th>
          <th>Usage</th>
          <th>Quota</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <NoDataRow colSpan={4} label="No providers visible" />
        ) : (
          rows.map((row) => (
            <tr key={row.providerId}>
              <td>
                <strong>{formatProviderName(row.providerId)}</strong>
              </td>
              <td>{row.value}</td>
              <td>{row.quota}</td>
              <td>
                <strong>{row.status}</strong>
                <span>{formatTimestamp(row.lastUpdatedAt)}</span>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

function RecentSyncsTable({ rows }: { rows: RecentSyncRow[] }) {
  return (
    <table className="admin-compact-table">
      <thead>
        <tr>
          <th>Developer</th>
          <th>Device</th>
          <th>Status</th>
          <th>Last contact</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <NoDataRow colSpan={4} label="No device sync rows yet" />
        ) : (
          rows.map((row) => (
            <tr key={`${row.developerName}:${row.deviceName}`}>
              <td>{row.developerName}</td>
              <td>{row.deviceName}</td>
              <td>{row.status}</td>
              <td>{formatTimestamp(row.lastContactAt)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

function AvailableMetricsTable({ rows }: { rows: AvailableMetricRow[] }) {
  return (
    <table className="admin-compact-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
          <th>Source</th>
          <th>Status</th>
          <th>Info</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.metric}>
            <td>{row.metric}</td>
            <td>
              <strong>{row.value}</strong>
            </td>
            <td>{row.source}</td>
            <td>{row.status}</td>
            <td>
              <MetricInfo row={row} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MetricInfo({ row }: { row: AvailableMetricRow }) {
  const tooltipId = useId()
  const tooltipRef = useRef<HTMLSpanElement | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties>({})

  function showTooltip(target: HTMLElement) {
    const tooltip = tooltipRef.current
    if (!tooltip) return

    const rect = target.getBoundingClientRect()
    const width = 352
    const left = Math.min(window.innerWidth - width - 16, Math.max(16, rect.right - width))
    const opensAbove = rect.top > 150
    setTooltipStyle({
      left,
      top: opensAbove ? rect.top - 10 : rect.bottom + 10,
      transform: opensAbove ? "translateY(-100%)" : "translateY(0)",
    })
    if ("showPopover" in tooltip) tooltip.showPopover()
  }

  function hideTooltip() {
    const tooltip = tooltipRef.current
    if (tooltip && "hidePopover" in tooltip) tooltip.hidePopover()
  }

  return (
    <span className="admin-metric-tooltip-wrap">
      <button
        className="admin-metric-info"
        type="button"
        aria-label={row.tooltip}
        aria-describedby={tooltipId}
        onFocus={(event) => showTooltip(event.currentTarget)}
        onBlur={hideTooltip}
        onMouseEnter={(event) => showTooltip(event.currentTarget)}
        onMouseLeave={hideTooltip}
      >
        <Info size={14} aria-hidden="true" />
      </button>
      <span
        className="admin-metric-tooltip"
        id={tooltipId}
        ref={tooltipRef}
        role="tooltip"
        popover="manual"
        style={tooltipStyle}
      >
        {row.tooltip}
      </span>
    </span>
  )
}

function ClearTeamDataPanel({
  onClearTeamData,
}: {
  onClearTeamData?: () => Promise<{ deleted: Record<string, number> }> | void
}) {
  const [status, setStatus] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleClick() {
    if (!onClearTeamData || isDeleting) return

    const confirmed = window.confirm(
      "Delete Developers, Tokens, Devices, Usage, Providers, Raw payloads, and Sync errors? This cannot be undone."
    )
    if (!confirmed) return

    setIsDeleting(true)
    setStatus(null)
    try {
      const result = await onClearTeamData()
      const total = Object.values(result?.deleted ?? {}).reduce((sum, count) => sum + count, 0)
      setStatus(`Deleted ${formatCount(total)} rows.`)
    } catch (error) {
      console.error(error)
      setStatus("Delete failed.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="admin-data-reset">
      <p className="admin-helper-text">
        Deletes: Developers, Tokens, Devices, Usage, Providers, Raw payloads, Sync errors.
      </p>
      <button type="button" disabled={!onClearTeamData || isDeleting} onClick={() => void handleClick()}>
        {isDeleting ? "Deleting..." : "Delete data"}
      </button>
      {status ? <span>{status}</span> : null}
    </div>
  )
}

function NoDataRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="admin-empty-row">
        {label}
      </td>
    </tr>
  )
}
