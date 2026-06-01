import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { WindowsTrayGuidance } from "@/components/app/windows-tray-guidance"

describe("WindowsTrayGuidance", () => {
  it("explains tray overflow and pinning", () => {
    render(<WindowsTrayGuidance onDismiss={vi.fn()} />)

    expect(screen.getByText(/Windows taskbar corner/)).toBeInTheDocument()
    expect(screen.getByText(/taskbar overflow/)).toBeInTheDocument()
    expect(screen.getByText(/pin eUsage/)).toBeInTheDocument()
  })

  it("calls dismiss when closed", async () => {
    const onDismiss = vi.fn()
    render(<WindowsTrayGuidance onDismiss={onDismiss} />)

    await userEvent.click(screen.getByRole("button", { name: "Dismiss Windows tray guidance" }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
