import { Card, CardContent } from "@/components/ui/card"
import { DashboardChart } from "./dashboard-chart"
import { AdminDateRangeControls } from "./admin-date-range-controls"
import { AdminProviderVisibilityControls } from "./admin-provider-visibility-controls"
import { AdminReportingTimeZoneControl } from "./admin-reporting-time-zone-control"
import { buildAdminOverviewModel } from "./admin-overview-data"
import { SeedMockDataPanel } from "./admin-overview-seed-panel"
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

type AdminOverviewProps = {
  state: ReadyDashboardState
  now: number
  onDateRangeChange?: (value: MetricDateRangeInput) => Promise<void> | void
  onReportingTimeZoneChange?: (value: string) => Promise<void> | void
  onProviderVisibilityChange?: (visibleProviderIds: string[] | null) => Promise<void> | void
  onClearTeamData?: () => Promise<{ deleted: Record<string, number> }> | void
  onSeedMockData?: () => Promise<{ seeded: Record<string, number> }> | void
}

export function AdminOverview({
  state,
  now,
  onDateRangeChange,
  onReportingTimeZoneChange,
  onProviderVisibilityChange,
  onClearTeamData,
  onSeedMockData,
}: AdminOverviewProps) {
  const model = buildAdminOverviewModel(state, now)
  const tokenPoints = model.tokenSeries.points
  const estimatedCostPoints = model.estimatedCostSeries.points
  const usageDays = chartDays(tokenPoints, estimatedCostPoints)
  const providerRows = model.providerBreakdownRows

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-6 py-8 pb-12 max-md:px-4">
      <header className="grid gap-5">
        <div className="max-w-3xl">
          <p className="mb-3 inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-primary">
            Admin Overview
          </p>
          <h1 className="m-0 text-5xl font-extrabold leading-none text-foreground max-md:text-4xl">
            {model.teamName}
          </h1>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Fixed all-up dashboard for visible team usage, provider health, and sync status.
          </p>
          <p className="mt-2 text-sm font-semibold text-primary">{model.teamMetaLabel}</p>
        </div>
      </header>

      <section
        className="grid grid-cols-4 items-start gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1"
        aria-label="KPI strip"
      >
        {model.kpis.map((item) => (
          <Card key={item.label} className="min-w-0" size="sm">
            <CardContent className="grid min-w-0 content-start gap-3">
              <span className="truncate text-xs font-extrabold uppercase tracking-wide text-primary">
                {item.label}
              </span>
              <div className="grid min-w-0 gap-1">
                <strong className="truncate text-xl font-extrabold leading-6 text-foreground max-xl:text-lg">
                  {item.value}
                </strong>
                <span className="truncate text-sm font-semibold leading-5 text-foreground/80">
                  {item.secondary}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section
        className="grid grid-cols-[minmax(16rem,max-content)_minmax(0,1fr)] items-center justify-between gap-x-16 gap-y-3 max-lg:grid-cols-1 -mb-2.5"
        role="region"
        aria-label="Dashboard filters"
      >
        <div className="grid min-w-0">
          <AdminDateRangeControls
            value={model.dateRange}
            bounds={model.dateBounds}
            onChange={onDateRangeChange}
          />
        </div>
        <div className="grid min-w-0 max-w-full justify-self-end overflow-hidden max-lg:justify-self-auto">
          <AdminProviderVisibilityControls
            providers={model.providerFilters}
            onChange={onProviderVisibilityChange}
          />
        </div>
      </section>

      <section className="grid gap-5">
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
      </section>

      <section className="grid grid-cols-1 gap-5 xl:auto-rows-[16rem] xl:grid-cols-12" aria-label="Overview cards">
        <DashboardPanel
          className="xl:col-span-6 xl:row-span-2 xl:min-h-0 xl:max-h-none"
          title="Provider breakdown"
          meta="Visible provider totals"
          height="tall"
        >
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

        <DashboardPanel
          className="xl:col-span-3 xl:min-h-0 xl:max-h-none"
          title="Cursor budget"
          meta={model.cursorPool.coverage.label}
          height="short"
        >
          <CursorPoolPanel pool={model.cursorPool} />
        </DashboardPanel>

        <DashboardPanel
          className="xl:col-span-3 xl:min-h-0 xl:max-h-none"
          title="Sync health"
          meta={model.syncHealth.status}
          height="short"
        >
          <SyncHealthPanel rows={model.recentSyncRows} />
        </DashboardPanel>

        <DashboardPanel
          className="xl:col-span-6 xl:min-h-0 xl:max-h-none"
          title="Recent Syncs"
          meta="Latest visible devices"
          height="medium"
        >
          <RecentSyncsTable rows={model.recentSyncRows} />
        </DashboardPanel>

        <DashboardPanel
          className="xl:col-span-6 xl:row-span-2 xl:min-h-0 xl:max-h-none"
          title="Quota pressure"
          meta={model.quota.teamCoverage.label}
          height="tall"
        >
          <QuotaPressureTable rows={model.quotaPressureRows} />
        </DashboardPanel>

        <DashboardPanel
          className="xl:col-span-6 xl:row-span-2 xl:min-h-0 xl:max-h-none"
          title="Developer leaderboard"
          meta="Default metric: total visible usage"
          height="tall"
        >
          <DeveloperLeaderboardTable rows={model.developerLeaderboardRows} />
        </DashboardPanel>
      </section>

      <section className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
        <DashboardPanel title="Top Developers" meta="Visible current range" height="medium">
          <DeveloperLeaderboardTable rows={model.developerLeaderboardRows} compact />
        </DashboardPanel>

        <DashboardPanel title="Provider Status" meta="Visible current range" height="medium">
          <ProviderStatusTable rows={model.providerStatusRows} />
        </DashboardPanel>
      </section>

      <section className="grid gap-5">
        <DashboardPanel title="Available Metrics" meta="Definitions and coverage" height="tall">
          <AvailableMetricsTable rows={model.availableMetricRows} />
        </DashboardPanel>
      </section>

      <section className="grid grid-cols-2 items-start gap-5 max-lg:grid-cols-1">
        <DashboardPanel title="Reporting timezone" meta="Team day boundary" height="compact">
          <AdminReportingTimeZoneControl
            value={model.reportingTimeZone}
            onChange={onReportingTimeZoneChange}
          />
        </DashboardPanel>

        <div className="grid gap-5">
          {onSeedMockData ? (
            <DashboardPanel title="Seed mock data" meta="Local dev only" height="compact">
              <SeedMockDataPanel onSeedMockData={onSeedMockData} />
            </DashboardPanel>
          ) : null}

          <DashboardPanel title="Delete data" meta="Clear synced team records" height="compact">
            <ClearTeamDataPanel onClearTeamData={onClearTeamData} />
          </DashboardPanel>
        </div>
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
