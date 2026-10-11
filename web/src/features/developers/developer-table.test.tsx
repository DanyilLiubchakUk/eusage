import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DeveloperTable } from "./developer-table"
import type { DevelopersState } from "./developers"

const emptyState: Extract<DevelopersState, { status: "ready" }> = {
  status: "ready",
  team: {
    name: "Acme Team",
    slug: "acme-team",
  },
  developers: [],
}

describe("DeveloperTable", () => {
  it("explains developer tokens and connection strings when empty", () => {
    render(
      <DeveloperTable
        state={emptyState}
        showInactive={false}
        pendingAction={null}
        onShowInactiveChange={vi.fn()}
        onRotate={vi.fn()}
        onRevoke={vi.fn()}
        onReenable={vi.fn()}
      />
    )

    expect(screen.getByRole("region", { name: "Developers" })).toHaveTextContent(
      "No developers yet"
    )
    expect(screen.getByText(/one-time token and eUsage connection string/)).toBeInTheDocument()
    expect(screen.getByText(/attach one device to this Organization/)).toBeInTheDocument()
  })
})
