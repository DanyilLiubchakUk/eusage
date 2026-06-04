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
  updateDeviceName: vi.fn(),
}))

vi.mock("@/hooks/app/use-team-connection", () => ({
  useTeamConnection: () => ({
    state: teamHook.state,
    connect: teamHook.connect,
    checkIn: teamHook.checkIn,
    disconnect: teamHook.disconnect,
    updateDeviceName: teamHook.updateDeviceName,
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
    teamHook.updateDeviceName.mockReset()
    teamHook.connect.mockResolvedValue({ ok: true })
    teamHook.checkIn.mockResolvedValue({ ok: true })
    teamHook.disconnect.mockResolvedValue({ ok: true })
    teamHook.updateDeviceName.mockResolvedValue({ ok: true })
  })

  it("does not flash the connection form while loading", () => {
    teamHook.state = {
      status: "loading",
      connection: null,
      message: null,
    }

    render(<TeamPage plugins={[]} />)

    expect(screen.getByText("Loading team connection...")).toBeInTheDocument()
    expect(screen.queryByLabelText("Connection string")).not.toBeInTheDocument()
  })

  it("submits the pasted connection string", async () => {
    render(<TeamPage plugins={[]} />)

    expect(screen.getByLabelText("Connection string")).toHaveAttribute("maxlength", "512")

    await userEvent.type(
      screen.getByLabelText("Connection string"),
      "eusage://connect?url=https://team.example.com&token=eusage_dev_secret"
    )
    await userEvent.click(screen.getByRole("button", { name: "Connect" }))

    expect(teamHook.connect).toHaveBeenCalledWith(
      "eusage://connect?url=https://team.example.com&token=eusage_dev_secret"
    )
  })

  it("validates the connection string before connect", async () => {
    render(<TeamPage plugins={[]} />)

    await userEvent.type(screen.getByLabelText("Connection string"), "https://team.example.com")
    await userEvent.click(screen.getByRole("button", { name: "Connect" }))

    expect(teamHook.connect).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Connection string must start with eusage://connect."
    )
  })

  it("calls onConnected after connecting", async () => {
    const onConnected = vi.fn()
    render(<TeamPage plugins={[]} onConnected={onConnected} />)

    await userEvent.type(
      screen.getByLabelText("Connection string"),
      "eusage://connect?url=https://team.example.com&token=eusage_dev_secret"
    )
    await userEvent.click(screen.getByRole("button", { name: "Connect" }))

    expect(onConnected).toHaveBeenCalledTimes(1)
  })

  it("shows connected metadata and requires disconnect confirmation", async () => {
    teamHook.state = {
      status: "connected",
      connection: {
        teamUrl: "https://team.example.com",
        teamName: "Acme Team",
        tokenFingerprint: "abcd1234...wxyz7890",
        deviceId: "device-1",
        deviceName: "Alex MacBook",
        detectedDeviceName: "Alex MacBook",
        deviceNameOverride: null,
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
    expect(screen.getByDisplayValue("Alex MacBook")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Disconnect" }))
    expect(teamHook.disconnect).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }))
    expect(teamHook.disconnect).toHaveBeenCalledTimes(1)
  })

  it("saves and resets the device name override", async () => {
    teamHook.state = {
      status: "connected",
      connection: {
        teamUrl: "https://team.example.com",
        teamName: "Acme Team",
        tokenFingerprint: "abcd1234...wxyz7890",
        deviceId: "device-1",
        deviceName: "Desk Mac",
        detectedDeviceName: "Alex MacBook",
        deviceNameOverride: "Desk Mac",
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
      message: null,
    }

    render(<TeamPage plugins={[]} />)

    expect(screen.getByLabelText("Device name")).toHaveAttribute("maxlength", "80")

    await userEvent.clear(screen.getByLabelText("Device name"))
    await userEvent.type(screen.getByLabelText("Device name"), "Desk Mac Pro")
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(teamHook.updateDeviceName).toHaveBeenCalledWith("Desk Mac Pro")

    await userEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(teamHook.updateDeviceName).toHaveBeenCalledWith(null)
  })
})
