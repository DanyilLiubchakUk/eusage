import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { DashboardSourceState } from "./dashboard"
import { readyState, now } from "./dashboard-test-fixtures"
import { TvDashboard } from "./tv-dashboard"

describe("TV display link empty state", () => {
  it("guides admins to create a read-only display link without showing a token", () => {
    render(
      <TvDashboard
        state={readyState as Extract<DashboardSourceState, { status: "ready" }>}
        now={now}
        displayLinkControls={{
          link: null,
          rawToken: null,
          displayUrl: null,
          onCreate: vi.fn(),
          onRotate: vi.fn(),
          onRevoke: vi.fn(),
        }}
      />
    )

    fireEvent.click(screen.getByText("TV settings"))

    expect(screen.getByRole("region", { name: "TV display link" })).toHaveTextContent(
      "Create a read-only display link"
    )
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument()
    expect(screen.queryByText("New link")).not.toBeInTheDocument()
  })
})
