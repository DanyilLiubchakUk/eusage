import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import {
  AdminDashboardPlaceholder,
  DashboardUnavailable,
  TvDashboardPlaceholder,
} from "./dashboard-placeholders"
import { buildAdminOverviewModel } from "./admin-overview-data"
import { buildTvDashboardModel } from "./tv-dashboard-data"
import type { DashboardSourceState } from "./dashboard"
import {
  now,
  quietState,
  readyState,
  readyStateWithInactiveDeveloper,
} from "./dashboard-test-fixtures"

describe("dashboard placeholders", () => {
  it("hides transient unauthenticated dashboard state while auth loads", () => {
    const state = { status: "not-authenticated" } as DashboardSourceState

    render(
      <DashboardUnavailable
        state={state}
        auth={{ isLoaded: false, isSignedIn: false }}
      />
    )

    expect(screen.getByText("Loading dashboard...")).toBeInTheDocument()
    expect(screen.queryByText("Dashboard unavailable")).not.toBeInTheDocument()
    expect(screen.queryByText("not-authenticated")).not.toBeInTheDocument()
  })

  it("asks signed-out users to sign in without showing dashboard unavailable", () => {
    const state = { status: "not-authenticated" } as DashboardSourceState

    render(
      <DashboardUnavailable
        state={state}
        auth={{ isLoaded: true, isSignedIn: false }}
        signInSlot={<button type="button">Sign in</button>}
      />
    )

    expect(screen.getByText("Sign in required")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.queryByText("Dashboard unavailable")).not.toBeInTheDocument()
    expect(screen.queryByText("not-authenticated")).not.toBeInTheDocument()
  })

  it("renders Admin metrics from shared source rows", () => {
    render(<AdminDashboardPlaceholder state={readyState} now={now} />)

    expect(screen.getByRole("heading", { name: "Acme Team" })).toBeInTheDocument()
    expect(
      screen.getByText("Fixed all-up dashboard for visible team usage, provider health, and sync status.")
    ).toBeInTheDocument()
    expect(screen.getAllByText("225 tokens").length).toBeGreaterThan(0)
    expect(screen.getByText("$5.50 · No comparison")).toBeInTheDocument()
    expect(screen.getByText("Tokens left · API equivalent right")).toBeInTheDocument()
    expect(screen.getByText("Default metric: total visible usage")).toBeInTheDocument()
    expect(screen.getAllByText("$60.00 remaining").length).toBeGreaterThan(0)
    expect(screen.getByText("51% avg · 70% worst")).toBeInTheDocument()
    expect(screen.getAllByText("4/8 reporting").length).toBeGreaterThan(0)
    expect(screen.getAllByRole("table")).toHaveLength(6)
    expect(screen.getByText("Available Metrics")).toBeInTheDocument()
    expect(screen.getAllByText("Quota pressure").length).toBeGreaterThan(0)
    expect(screen.getByText("Total usage")).toBeInTheDocument()
    expect(screen.getByText("Auto + composer")).toBeInTheDocument()
    expect(screen.getByText("API usage")).toBeInTheDocument()
    expect(screen.getAllByText("Weekly").length).toBeGreaterThan(0)
    expect(screen.getByText("Reviews")).toBeInTheDocument()
    expect(screen.getByText("21%")).toBeInTheDocument()
    expect(screen.getByText("14%")).toBeInTheDocument()
    expect(screen.getByText("45%")).toBeInTheDocument()
    expect(screen.getByText("Provider Status")).toBeInTheDocument()
    expect(screen.getByText("21% total · 45% API")).toBeInTheDocument()
    expect(screen.getByText("25% session · 50% weekly")).toBeInTheDocument()
    expect(screen.getByText("Recent Syncs")).toBeInTheDocument()
    expect(screen.getAllByText("Cursor").length).toBeGreaterThan(0)
    expect(screen.getAllByText("JetBrains AI Assistant").length).toBeGreaterThan(0)
    expect(screen.getByText("Credits")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Total visible token usage/ })).not.toHaveAttribute("title")
    expect(screen.getByText(/Source: Canonical provider token samples/)).toBeInTheDocument()
    expect(screen.getByText("Updates: oldest 12s ago · newest 0s ago")).toBeInTheDocument()
    expect(screen.getAllByText("Alex").length).toBeGreaterThan(0)
    expect(screen.getByText("Alex Mac")).toBeInTheDocument()
  })

  it("lets Admin persist a different date range", async () => {
    const user = userEvent.setup()
    const changes: unknown[] = []
    render(
      <AdminDashboardPlaceholder
        state={readyState}
        now={now}
        onDateRangeChange={async (value) => {
          changes.push(value)
        }}
      />
    )

    await user.selectOptions(screen.getByRole("combobox"), "last30")

    expect(changes).toEqual([{ preset: "last30" }])
    expect(screen.queryByText("Saved")).not.toBeInTheDocument()
  })

  it("lets Admin persist the team reporting timezone", async () => {
    const user = userEvent.setup()
    const changes: string[] = []
    render(
      <AdminDashboardPlaceholder
        state={readyState}
        now={now}
        onReportingTimeZoneChange={async (value) => {
          changes.push(value)
        }}
      />
    )

    const timezoneInput = screen.getByRole("textbox", { name: "Reporting timezone" })
    await user.clear(timezoneInput)
    await user.type(timezoneInput, "America/New_York")
    await user.click(screen.getByRole("button", { name: "Apply pending reporting timezone" }))

    expect(changes).toEqual(["America/New_York"])
    expect(
      screen.getByText("Use IANA names. Examples: America/New_York, America/Los_Angeles.")
    ).toBeInTheDocument()
    expect(screen.queryByText("Saved")).not.toBeInTheDocument()
  })

  it("uses the team reporting timezone for Admin and TV ranges", () => {
    const state = {
      ...(readyState as Extract<DashboardSourceState, { status: "ready" }>),
      team: {
        ...(readyState as Extract<DashboardSourceState, { status: "ready" }>).team,
        reportingTimeZone: "America/New_York",
      },
    } as Extract<DashboardSourceState, { status: "ready" }>
    const lateNightUtc = Date.UTC(2026, 5, 1, 2)

    const admin = buildAdminOverviewModel(state, lateNightUtc)
    const tv = buildTvDashboardModel(state, lateNightUtc)

    expect(admin.reportingTimeZone).toBe("America/New_York")
    expect(tv.reportingTimeZone).toBe("America/New_York")
    expect(admin.dateBounds.maxDay).toBe("2026-05-31")
    expect(tv.dateBounds.maxDay).toBe("2026-05-31")
    expect(admin.kpis[0].value).toBe("0 tokens")
    expect(tv.slides[0]).toMatchObject({
      kind: "team-overview",
      headline: "0 tokens",
    })
  })

  it("limits custom Admin date inputs to visible metric days", () => {
    render(
      <AdminDashboardPlaceholder
        state={{
          ...(readyState as Extract<DashboardSourceState, { status: "ready" }>),
          dashboardSettings: {
            defaultDateRange: { preset: "custom", startDay: "2026-05-01", endDay: "2026-06-01" },
            visibleProviderIds: null,
            hiddenDeveloperIds: [],
            includeInactiveDevelopers: false,
          },
        }}
        now={now}
        onDateRangeChange={() => undefined}
      />
    )

    expect(screen.getByLabelText("Custom start date")).toHaveAttribute("min", "2026-06-01")
    expect(screen.getByLabelText("Custom start date")).toHaveAttribute("max", "2026-06-01")
    expect(screen.getByLabelText("Custom end date")).toHaveAttribute("min", "2026-06-01")
    expect(screen.getByLabelText("Custom end date")).toHaveAttribute("max", "2026-06-01")
    expect(screen.queryByText("Apply")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Apply custom date range" })).toBeInTheDocument()
  })

  it("persists custom Admin date changes from the icon apply button", async () => {
    const user = userEvent.setup()
    const changes: unknown[] = []
    const ready = readyState as Extract<DashboardSourceState, { status: "ready" }>
    render(
      <AdminDashboardPlaceholder
        state={{
          ...ready,
          dashboardSettings: {
            defaultDateRange: { preset: "custom", startDay: "2026-05-30", endDay: "2026-06-01" },
            visibleProviderIds: null,
            hiddenDeveloperIds: [],
            includeInactiveDevelopers: false,
          },
          metricSamples: [
            ...ready.metricSamples,
            {
              ...ready.metricSamples[0],
              id: "metric-old-day" as (typeof ready.metricSamples)[number]["id"],
              sampleDay: "2026-05-30",
              value: 1,
            },
          ],
        }}
        now={now}
        onDateRangeChange={async (value) => {
          changes.push(value)
        }}
      />
    )

    await user.clear(screen.getByLabelText("Custom start date"))
    await user.type(screen.getByLabelText("Custom start date"), "2026-05-31")
    expect(changes).toEqual([])
    expect(
      screen.getByRole("button", { name: "Apply pending custom date range" })
    ).toHaveClass("admin-date-range-apply-pending")

    await user.click(screen.getByRole("button", { name: "Apply pending custom date range" }))

    expect(changes.at(-1)).toEqual({
      preset: "custom",
      startDay: "2026-05-31",
      endDay: "2026-06-01",
    })
  })

  it("lets Admin persist visible providers", async () => {
    const user = userEvent.setup()
    const changes: unknown[] = []
    render(
      <AdminDashboardPlaceholder
        state={readyState}
        now={now}
        onProviderVisibilityChange={async (value) => {
          changes.push(value)
        }}
      />
    )

    await user.click(screen.getByLabelText("Claude"))

    expect(changes).toEqual([["cursor", "codex", "jetbrains-ai-assistant"]])
  })

  it("confirms before clearing team data", async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true)
    const clearTeamData = vi.fn(async () => ({
      deleted: {
        developers: 1,
        developerTokens: 1,
        devices: 1,
        metricSamples: 1,
        providers: 1,
        rawPayloads: 1,
        syncErrors: 1,
        usageSnapshots: 1,
      },
    }))

    render(
      <AdminDashboardPlaceholder
        state={readyState}
        now={now}
        onClearTeamData={clearTeamData}
      />
    )

    await user.click(screen.getByRole("button", { name: "Delete data" }))

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("This cannot be undone"))
    expect(clearTeamData).toHaveBeenCalledOnce()
    expect(await screen.findByText("Deleted 8 rows.")).toBeInTheDocument()
    confirm.mockRestore()
  })

  it("renders Admin no-data states", () => {
    render(<AdminDashboardPlaceholder state={quietState()} now={now} />)

    expect(screen.getByRole("heading", { name: "Quiet Team" })).toBeInTheDocument()
    expect(screen.getByText("No token or cost samples yet").closest(".admin-chart-frame-empty")).not.toBeNull()
    expect(screen.getAllByText("No provider usage yet")).toHaveLength(1)
    expect(screen.getByText("No provider usage yet").closest(".admin-chart-frame-empty")).not.toBeNull()
    expect(screen.getAllByText("No developer usage yet").length).toBeGreaterThan(0)
    expect(screen.getAllByText("No device sync rows yet").length).toBeGreaterThan(0)
    expect(screen.getByText("No providers visible")).toBeInTheDocument()
    expect(screen.getAllByLabelText(/No sample data yet/).length).toBeGreaterThan(0)
  })

  it("hides globally disabled providers from views without removing stored rows", () => {
    const state = {
      ...readyState,
      providers: [
        {
          providerId: "claude",
          name: "Claude",
          status: "disabled",
          brandColor: "#d97757",
        },
      ],
    } as unknown as DashboardSourceState

    expect(
      (state as Extract<DashboardSourceState, { status: "ready" }>).snapshots.some(
        (snapshot) => snapshot.providerId === "claude"
      )
    ).toBe(true)

    render(<AdminDashboardPlaceholder state={state} now={now} />)

    expect(screen.getAllByText("175 tokens").length).toBeGreaterThan(0)
    expect(screen.getByText("$4.75 · No comparison")).toBeInTheDocument()
    expect(screen.getAllByText("JetBrains AI Assistant").length).toBeGreaterThan(0)
    expect(screen.queryByText("Claude")).not.toBeInTheDocument()
  })

  it("hides inactive developers by default and includes them for admin review", () => {
    const inactiveState = readyStateWithInactiveDeveloper()

    const tv = render(<TvDashboardPlaceholder state={inactiveState} now={now} />)
    expect(screen.getByRole("heading", { name: "225 tokens" })).toBeInTheDocument()
    tv.unmount()

    const reviewState = {
      ...inactiveState,
      dashboardSettings: {
        defaultDateRange: { preset: "last7" },
        visibleProviderIds: null,
        hiddenDeveloperIds: [],
        includeInactiveDevelopers: true,
      },
    } as unknown as DashboardSourceState

    render(<AdminDashboardPlaceholder state={reviewState} now={now} />)
    expect(screen.getAllByText("255 tokens").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Lee").length).toBeGreaterThan(0)
    expect(screen.getAllByText("inactive").length).toBeGreaterThan(0)
  })
})
