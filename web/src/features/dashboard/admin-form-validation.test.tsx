import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { AdminDateRangeControls } from "./admin-date-range-controls"
import { AdminReportingTimeZoneControl } from "./admin-reporting-time-zone-control"

describe("admin form validation", () => {
  it("rejects invalid reporting timezones before save", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AdminReportingTimeZoneControl value="UTC" onChange={onChange} />)

    const timezoneInput = screen.getByRole("textbox", { name: "Reporting timezone" })
    expect(timezoneInput).toHaveAttribute("maxlength", "64")
    await user.clear(timezoneInput)
    await user.type(timezoneInput, "Mars/Base")
    await user.click(screen.getByRole("button", { name: "Apply pending reporting timezone" }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid IANA timezone.")
  })

  it("rejects custom ranges where end is before start", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <AdminDateRangeControls
        value={{ preset: "custom", startDay: "2026-06-10", endDay: "2026-06-12" }}
        bounds={{ minDay: "2026-06-01", maxDay: "2026-06-30" }}
        onChange={onChange}
      />
    )

    fireEvent.change(screen.getByLabelText("Custom end date"), {
      target: { value: "2026-06-09" },
    })
    await user.click(screen.getByRole("button", { name: "Apply pending custom date range" }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(
      "End date must be on or after start date."
    )
  })
})
