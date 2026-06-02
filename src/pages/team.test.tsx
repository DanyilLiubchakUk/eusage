import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TeamPage } from "@/pages/team"
import type { TeamConnectionViewState } from "@/hooks/app/use-team-connection"

const teamHook = vi.hoisted(() => ({
  state: {
    status: "disconnected",
    connection: null,
    message: null,
  } as TeamConnectionViewState,
  connect: vi.fn(),
  checkIn: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock("@/hooks/app/use-team-connection", () => ({
  useTeamConnection: () => ({
    state: teamHook.state,
    connect: teamHook.connect,
    checkIn: teamHook.checkIn,
    disconnect: teamHook.disconnect,
  }),
}))

describe("TeamPage", () => {
  beforeEach(() => {
    teamHook.state = {
      status: "disconnected",
      connection: null,
      message: null,
    }
    teamHook.connect.mockReset()
    teamHook.checkIn.mockReset()
    teamHook.disconnect.mockReset()
    teamHook.connect.mockResolvedValue({ ok: true })
    teamHook.checkIn.mockResolvedValue({ ok: true })
    teamHook.disconnect.mockResolvedValue({ ok: true })
  })

  it("submits the pasted connection string", async () => {
    render(<TeamPage plugins={[]} />)

    await userEvent.type(
      screen.getByLabelText("Connection string"),
      "eusage://connect?url=https://team.example.com&token=eusage_dev_secret"
    )
    await userEvent.click(screen.getByRole("button", { name: "Connect" }))

    expect(teamHook.connect).toHaveBeenCalledWith(
      "eusage://connect?url=https://team.example.com&token=eusage_dev_secret"
    )
  })

  it("shows connected metadata and requires disconnect confirmation", async () => {
    teamHook.state = {
      status: "connected",
      connection: {
        teamUrl: "https://team.example.com",
        teamName: "Acme Team",
        tokenFingerprint: "abcd1234...wxyz7890",
        deviceId: "device-1",
        endpoints: {
          teamConfig: "/api/v1/team-config",
          deviceCheckIn: "/api/v1/device/check-in",
          usageBatch: "/api/v1/usage/batch",
          deviceDisconnect: "/api/v1/device/disconnect",
        },
        syncStatus: "connected",
        lastContactAt: "2026-06-01T12:00:00.000Z",
        deviceStatus: "connected",
        lastError: null,
      },
      message: "Device checked in.",
    }

    render(<TeamPage plugins={[]} />)

    expect(screen.getByText("Acme Team")).toBeInTheDocument()
    expect(screen.getByText("abcd1234...wxyz7890")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Disconnect" }))
    expect(teamHook.disconnect).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }))
    expect(teamHook.disconnect).toHaveBeenCalledTimes(1)
  })
})
