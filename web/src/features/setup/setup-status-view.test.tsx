import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { SetupStatusView } from "./setup-status-view"
import type { SetupState } from "./setup-status"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

describe("SetupStatusView", () => {
  it("renders setup-needed from backend state", () => {
    const state: SetupState = {
      status: "setup-needed",
      reason: "team-missing",
      team: null,
      owner: null,
    }

    render(<SetupStatusView state={state} />)

    expect(screen.getByRole("heading", { name: "Setup needed" })).toBeInTheDocument()
    expect(screen.getByText("No team exists in Convex yet.")).toBeInTheDocument()
    expect(screen.getByText("team-missing")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open setup" })).toHaveAttribute(
      "href",
      "/setup"
    )
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
      owner: {
        clerkUserId: "user_123",
        email: "owner@example.com",
        name: "Owner User",
        role: "owner",
        createdAt: 1780320000000,
      },
    }

    render(<SetupStatusView state={state} />)

    expect(screen.getByRole("heading", { name: "Setup complete" })).toBeInTheDocument()
    expect(screen.getByText("Acme Team is ready for the admin dashboard.")).toBeInTheDocument()
    expect(screen.getAllByText("Acme Team")).toHaveLength(1)
    expect(screen.getByText("owner@example.com")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open developers" })).toHaveAttribute(
      "href",
      "/developers"
    )
  })
})
