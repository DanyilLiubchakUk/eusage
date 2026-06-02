import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import {
  AdminDashboardPlaceholder,
  TvDashboardPlaceholder,
} from "./dashboard-placeholders"
import type { DashboardSourceState } from "./dashboard"
import {
  now,
  quietState,
  readyState,
  readyStateWithInactiveDeveloper,
} from "./dashboard-test-fixtures"

describe("dashboard placeholders", () => {
  it("renders Admin metrics from shared source rows", () => {
    render(<AdminDashboardPlaceholder state={readyState} now={now} />)

    expect(screen.getByRole("heading", { name: "Acme Team" })).toBeInTheDocument()
    expect(
      screen.getByText("Fixed all-up dashboard for visible team usage, provider health, and sync status.")
    ).toBeInTheDocument()
    expect(screen.getAllByText("225 tokens").length).toBeGreaterThan(0)
    expect(screen.getByText("$5.50 · No comparison")).toBeInTheDocument()
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
    expect(screen.getByLabelText(/Total visible token usage/)).toHaveAttribute(
      "title",
      expect.stringContaining("Source: Canonical provider token samples")
    )
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

  it("renders Admin no-data states", () => {
    render(<AdminDashboardPlaceholder state={quietState()} now={now} />)

    expect(screen.getByRole("heading", { name: "Quiet Team" })).toBeInTheDocument()
    expect(screen.getByText("No token samples yet")).toBeInTheDocument()
    expect(screen.getAllByText("No provider usage yet").length).toBeGreaterThan(0)
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
