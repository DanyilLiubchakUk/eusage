import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SetupStatusView } from "./setup-status-view"
import type { SetupState } from "./setup-status"

describe("SetupStatusView", () => {
  it("renders setup-needed from backend state", () => {
    const state: SetupState = {
      status: "setup-needed",
      reason: "team-missing",
      team: null,
    }

    render(<SetupStatusView state={state} />)

    expect(screen.getByRole("heading", { name: "Setup needed" })).toBeInTheDocument()
    expect(screen.getByText("No team exists in Convex yet.")).toBeInTheDocument()
    expect(screen.getByText("team-missing")).toBeInTheDocument()
  })

  it("renders setup-complete from backend state", () => {
    const state: SetupState = {
      status: "setup-complete",
      reason: null,
      team: {
        name: "Acme Team",
        slug: "acme-team",
        setupCompletedAt: 1780320000000,
      },
    }

    render(<SetupStatusView state={state} />)

    expect(screen.getByRole("heading", { name: "Setup complete" })).toBeInTheDocument()
    expect(screen.getByText("Acme Team is ready for the admin dashboard.")).toBeInTheDocument()
    expect(screen.getAllByText("Acme Team")).toHaveLength(1)
  })
})
