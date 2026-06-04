import { DashboardChart } from "./dashboard-chart"
import { AdminDateRangeControls } from "./admin-date-range-controls"
import { AdminProviderVisibilityControls } from "./admin-provider-visibility-controls"
import { AdminReportingTimeZoneControl } from "./admin-reporting-time-zone-control"
import { buildAdminOverviewModel } from "./admin-overview-data"
import type { ReadyDashboardState } from "./dashboard-source"
import type { MetricDateRangeInput } from "../../lib/metrics"
import { QuotaPressureTable } from "./admin-overview-quota-table"
import { CursorPoolPanel } from "./admin-overview-cursor-pool"
import {
  AvailableMetricsTable,
  ClearTeamDataPanel,
  DashboardPanel,
  DeveloperLeaderboardTable,
  ProviderBreakdownList,
  ProviderStatusTable,
  RecentSyncsTable,
  SyncHealthPanel,
} from "./admin-overview-panels"
import "./admin-overview.css"
import "./admin-overview-controls.css"
import "./admin-overview-interactions.css"

type AdminOverviewProps = {
  state: ReadyDashboardState
  now: number
  onDateRangeChange?: (value: MetricDateRangeInput) => Promise<void> | void
  onReportingTimeZoneChange?: (value: string) => Promise<void> | void
  onProviderVisibilityChange?: (visibleProviderIds: string[] | null) => Promise<void> | void
  onClearTeamData?: () => Promise<{ deleted: Record<string, number> }> | void
}

export function AdminOverview({
  state,
  now,
  onDateRangeChange,
  onReportingTimeZoneChange,
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
        <DashboardPanel title="Reporting timezone" meta="Team day boundary" height="short">
          <AdminReportingTimeZoneControl
            value={model.reportingTimeZone}
            onChange={onReportingTimeZoneChange}
          />
        </DashboardPanel>

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
