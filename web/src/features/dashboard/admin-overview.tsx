import type { CSSProperties, ReactNode } from "react"
import { Info } from "lucide-react"
import { DashboardChart } from "./dashboard-chart"
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
import "./admin-overview.css"

type AdminOverviewProps = {
  state: ReadyDashboardState
  now: number
}

export function AdminOverview({ state, now }: AdminOverviewProps) {
  const model = buildAdminOverviewModel(state, now)
  const tokenPoints = model.tokenSeries.points
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
        </div>
        <div className="admin-overview-meta" aria-label="Dashboard filters">
          <span>{model.rangeLabel}</span>
          <span>{model.freshnessLabel}</span>
          <span>{model.filterSummary}</span>
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
        <DashboardPanel title="Team usage over time" meta="Visible token samples by day">
          <DashboardChart
            type="line"
            ariaLabel="Team usage over time chart"
            labels={tokenPoints.map((point) => point.day)}
            datasets={[
              {
                label: "Tokens",
                data: tokenPoints.map((point) => point.value),
                borderColor: "#0f766e",
                backgroundColor: "rgba(15, 118, 110, 0.16)",
              },
            ]}
            emptyLabel="No token samples yet"
          />
          <ChartDataList
            rows={tokenPoints.map((point) => [point.day, `${formatCount(point.value)} tokens`])}
          />
        </DashboardPanel>

        <DashboardPanel title="Provider breakdown" meta="Visible provider totals">
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
        <DashboardPanel title="Developer leaderboard" meta="Default metric: total visible usage">
          <DeveloperLeaderboardTable rows={model.developerLeaderboardRows} />
        </DashboardPanel>

        <DashboardPanel title="Cursor pool" meta={model.cursorPool.coverage.label}>
          <CursorPoolPanel pool={model.cursorPool} />
        </DashboardPanel>

        <DashboardPanel title="Sync health" meta={model.syncHealth.status}>
          <SyncHealthPanel rows={model.recentSyncRows} />
        </DashboardPanel>
      </section>

      <section className="admin-overview-grid admin-overview-grid-tables">
        <DashboardPanel title="Top Developers" meta="Visible current range">
          <DeveloperLeaderboardTable rows={model.developerLeaderboardRows} compact />
        </DashboardPanel>

        <DashboardPanel title="Provider Status" meta="Visible current range">
          <ProviderStatusTable rows={model.providerStatusRows} />
        </DashboardPanel>

        <DashboardPanel title="Recent Syncs" meta="Latest visible devices">
          <RecentSyncsTable rows={model.recentSyncRows} />
        </DashboardPanel>

        <DashboardPanel title="Available Metrics" meta="Definitions and coverage">
          <AvailableMetricsTable rows={model.availableMetricRows} />
        </DashboardPanel>
      </section>
    </main>
  )
}

function DashboardPanel({
  title,
  meta,
  children,
}: {
  title: string
  meta: string
  children: ReactNode
}) {
  return (
    <section className="admin-panel" aria-label={title}>
      <div className="admin-panel-header">
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      {children}
    </section>
  )
}

function ChartDataList({ rows }: { rows: Array<[string, string]> }) {
  if (rows.length === 0) return null

  return (
    <dl className="admin-chart-data">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ProviderBreakdownList({ rows }: { rows: ProviderBreakdownRow[] }) {
  if (rows.length === 0) return <p className="admin-empty-row">No provider usage yet</p>

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

function CursorPoolPanel({
  pool,
}: {
  pool: ReturnType<typeof buildAdminOverviewModel>["cursorPool"]
}) {
  const usedPercent = pool.available && pool.limitUsd > 0 ? (pool.usedUsd / pool.limitUsd) * 100 : 0
  const width = `${Math.max(0, Math.min(100, usedPercent))}%`

  if (!pool.available) return <p className="admin-empty-row">No Cursor pool data yet</p>

  return (
    <div className="admin-cursor-pool">
      <div
        className="admin-cursor-pool-bar"
        style={{ "--cursor-pool-used": width } as CSSProperties}
        aria-label={`${Math.round(usedPercent)} percent used`}
      >
        <span />
      </div>
      <div className="admin-cursor-pool-values">
        <strong>{formatUsd(pool.remainingUsd)} remaining</strong>
        <span>
          {formatUsd(pool.usedUsd)} used of {formatUsd(pool.limitUsd)} · {pool.label}
        </span>
      </div>
    </div>
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
  return (
    <span className="admin-metric-info" aria-label={row.tooltip} title={row.tooltip}>
      <Info size={14} aria-hidden="true" />
    </span>
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
