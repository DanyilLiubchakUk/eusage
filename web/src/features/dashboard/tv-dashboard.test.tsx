import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { DashboardSourceState } from "./dashboard"
import { TvDashboardPlaceholder } from "./dashboard-placeholders"
import { now, quietState, readyState } from "./dashboard-test-fixtures"
import { TvDashboard } from "./tv-dashboard"

afterEach(() => {
  vi.useRealTimers()
})

describe("tv dashboard", () => {
  it("renders metrics from the same source rows", () => {
    render(<TvDashboardPlaceholder state={readyState} now={now} />)

    expect(screen.getByRole("heading", { name: "225 tokens" })).toBeInTheDocument()
    expect(screen.getByText("Acme Team · $5.50 estimated cost · No comparison")).toBeInTheDocument()
    expect(screen.getByText("$60.00 remaining")).toBeInTheDocument()
    expect(screen.getByRole("table", { name: "Available metrics" })).toBeInTheDocument()
    expect(screen.getByRole("row", { name: /Quota pressure/ })).toBeInTheDocument()
    expect(screen.getByText("Updates: oldest 12s ago · newest 0s ago")).toBeInTheDocument()
  })

  it("supports playback controls", () => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    render(<TvDashboardPlaceholder state={readyState} now={now} />)

    expect(screen.getByRole("heading", { name: "225 tokens" })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(screen.getByRole("heading", { name: "Developer Leaderboard" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Pause auto-rotate" }))
    expect(screen.getByRole("button", { name: "Resume auto-rotate" })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(screen.getByRole("heading", { name: "Developer Leaderboard" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Next slide" }))
    expect(screen.getByRole("heading", { name: "Provider Breakdown" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Previous slide" }))
    expect(screen.getByRole("heading", { name: "Developer Leaderboard" })).toBeInTheDocument()
  })

  it("persists slide settings, order, and date range changes", async () => {
    const changes: unknown[] = []
    render(
      <TvDashboard
        state={readyState as Extract<DashboardSourceState, { status: "ready" }>}
        now={now}
        onSettingsChange={(patch) => {
          changes.push(patch)
        }}
      />
    )

    fireEvent.click(screen.getByText("TV settings"))
    fireEvent.click(screen.getByRole("button", { name: "Move Developer Leaderboard up" }))
    await waitFor(() => expect(changes).toHaveLength(1))

    expect(
      (changes[0] as { slides: Array<{ id: string }> }).slides.map((slide) => slide.id)
    ).toEqual([
      "developer-leaderboard",
      "team-overview",
      "provider-breakdown",
      "cursor-pool",
      "sync-health",
    ])

    const cursorDuration = screen.getByLabelText("Cursor Budget duration seconds")
    fireEvent.change(cursorDuration, {
      target: { value: "2" },
    })
    fireEvent.change(cursorDuration, {
      target: { value: "25" },
    })
    await waitFor(() => expect(changes).toHaveLength(2))
    expect(
      (changes[1] as { slides: Array<{ id: string; durationSeconds: number }> }).slides.find(
        (slide) => slide.id === "cursor-pool"
      )?.durationSeconds
    ).toBe(25)

    fireEvent.click(screen.getByLabelText("Provider Breakdown"))
    await waitFor(() => expect(changes).toHaveLength(3))
    expect(
      (changes[2] as { slides: Array<{ id: string; enabled: boolean }> }).slides.find(
        (slide) => slide.id === "provider-breakdown"
      )?.enabled
    ).toBe(false)

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "last30" } })
    await waitFor(() => expect(changes).toHaveLength(4))
    expect(changes[3]).toEqual({ dateRange: { preset: "last30" } })
  })

  it("validates slide duration before saving", () => {
    vi.useFakeTimers()
    const changes: unknown[] = []
    render(
      <TvDashboard
        state={readyState as Extract<DashboardSourceState, { status: "ready" }>}
        now={now}
        onSettingsChange={(patch) => {
          changes.push(patch)
        }}
      />
    )

    fireEvent.click(screen.getByText("TV settings"))
    const durationInput = screen.getByLabelText("Team Overview duration seconds")
    fireEvent.change(durationInput, {
      target: { value: "4" },
    })

    act(() => {
      vi.advanceTimersByTime(450)
    })

    expect(screen.getByRole("alert")).toHaveTextContent("Allow 5-300 seconds")
    expect(durationInput).toHaveAttribute("aria-invalid", "true")
    expect(changes).toEqual([])
  })

  it("prevents disabling the last enabled slide", () => {
    const state = {
      ...readyState,
      tvSettings: {
        dateRange: { preset: "last7" },
        visibleProviderIds: null,
        visibleDeveloperIds: null,
        slides: [
          { id: "team-overview", enabled: true, order: 0, durationSeconds: 10 },
          { id: "developer-leaderboard", enabled: false, order: 1, durationSeconds: 10 },
          { id: "provider-breakdown", enabled: false, order: 2, durationSeconds: 10 },
          { id: "cursor-pool", enabled: false, order: 3, durationSeconds: 10 },
          { id: "sync-health", enabled: false, order: 4, durationSeconds: 10 },
        ],
      },
    } as unknown as Extract<DashboardSourceState, { status: "ready" }>
    const changes: unknown[] = []

    render(
      <TvDashboard
        state={state}
        now={now}
        onSettingsChange={(patch) => {
          changes.push(patch)
        }}
      />
    )

    fireEvent.click(screen.getByText("TV settings"))

    expect(screen.getByLabelText("Team Overview")).toBeDisabled()
    expect(changes).toEqual([])
  })

  it("hides admin settings on public display mode", () => {
    render(
      <TvDashboard
        state={readyState as Extract<DashboardSourceState, { status: "ready" }>}
        now={now}
        showSettings={false}
      />
    )

    expect(screen.queryByText("TV settings")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pause auto-rotate" })).toBeInTheDocument()
  })

  it("uses per-slide freshness sources", () => {
    render(<TvDashboardPlaceholder state={readyState} now={now} />)

    expect(screen.getByText("Updates: oldest 12s ago · newest 0s ago")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }))
    expect(screen.getByRole("heading", { name: "Developer Leaderboard" })).toBeInTheDocument()
    expect(screen.getByText("Updates: oldest 12s ago · newest 2s ago")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }))
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }))
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }))
    expect(screen.getByRole("heading", { name: "1/1 connected" })).toBeInTheDocument()
    expect(screen.getByText("Updates: 12s ago")).toBeInTheDocument()
  })

  it("renders no-data states for empty slides", () => {
    render(<TvDashboardPlaceholder state={quietState()} now={now} />)

    expect(screen.getAllByText("No data yet").length).toBeGreaterThan(0)
    expect(screen.getByText("Updates: No data yet")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }))
    expect(screen.getByText("No developer usage yet")).toBeInTheDocument()
  })

  it("can hide a globally visible provider only from TV", () => {
    const state = {
      ...readyState,
      tvSettings: {
        dateRange: { preset: "last7" },
        visibleProviderIds: ["cursor", "codex", "jetbrains-ai-assistant"],
        visibleDeveloperIds: null,
      },
    } as unknown as DashboardSourceState

    render(<TvDashboardPlaceholder state={state} now={now} />)

    expect(screen.getByRole("heading", { name: "175 tokens" })).toBeInTheDocument()
    expect(screen.queryByText(/Claude/)).not.toBeInTheDocument()
  })
})
