import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AdminDashboardPlaceholder } from "./dashboard-placeholders"
import { now, quietState, readyState } from "./dashboard-test-fixtures"

describe("Admin overview empty state", () => {
  it("guides first-run admins to create a developer and connect desktop", () => {
    render(<AdminDashboardPlaceholder state={quietState()} now={now} />)

    expect(screen.getByRole("region", { name: "First sync guide" })).toHaveTextContent(
      "No usage data yet"
    )
    expect(screen.getByRole("link", { name: "Create developer" })).toHaveAttribute(
      "href",
      "/developers"
    )
    expect(screen.getByRole("link", { name: "Connect desktop" })).toHaveAttribute(
      "href",
      "/developers"
    )
  })

  it("hides the first-run guide after usage has synced", () => {
    render(<AdminDashboardPlaceholder state={readyState} now={now} />)

    expect(screen.queryByRole("region", { name: "First sync guide" })).not.toBeInTheDocument()
  })
})
