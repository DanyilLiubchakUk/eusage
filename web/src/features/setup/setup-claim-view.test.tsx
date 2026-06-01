import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { SetupClaimView } from "./setup-claim-view"
import type { SetupClaimResult, SetupState } from "./setup-status"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

const owner = {
  clerkUserId: "user_123",
  email: "owner@example.com",
  name: "Owner User",
  role: "owner" as const,
  createdAt: 1780320000000,
}

const team = {
  name: "Acme Team",
  slug: "acme-team",
  setupCompletedAt: 1780320000000,
}

const setupNeeded: SetupState = {
  status: "setup-needed",
  reason: "team-missing",
  team: null,
  owner: null,
}

const setupComplete: SetupState = {
  status: "setup-complete",
  reason: null,
  team,
  owner,
}

const successResult: SetupClaimResult = {
  ok: true,
  status: "setup-complete",
  reason: null,
  message: "Setup complete.",
  team,
  owner,
}

function renderClaimView(props: {
  state?: SetupState
  isLoaded?: boolean
  isSignedIn?: boolean
  onClaim?: (input: { teamName: string; setupToken: string }) => Promise<SetupClaimResult>
}) {
  return render(
    <SetupClaimView
      state={props.state ?? setupNeeded}
      auth={{
        isLoaded: props.isLoaded ?? true,
        isSignedIn: props.isSignedIn ?? true,
        userLabel: props.isSignedIn === false ? null : "owner@example.com",
      }}
      signInSlot={<button type="button">Sign in</button>}
      userSlot={<span>owner@example.com</span>}
      onClaim={
        props.onClaim ??
        vi.fn(async () => successResult)
      }
    />
  )
}

describe("SetupClaimView", () => {
  it("submits team name and setup token for a signed-in user", async () => {
    const user = userEvent.setup()
    const onClaim = vi.fn(async () => successResult)

    renderClaimView({ onClaim })

    await user.clear(screen.getByLabelText("Team name"))
    await user.type(screen.getByLabelText("Team name"), "Acme Team")
    await user.type(screen.getByLabelText("Setup token"), "correct")
    await user.click(screen.getByRole("button", { name: "Claim deployment" }))

    expect(onClaim).toHaveBeenCalledWith({
      teamName: "Acme Team",
      setupToken: "correct",
    })
    expect(await screen.findByText("Setup complete.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open dashboard" })).toHaveAttribute(
      "href",
      "/"
    )
  })

  it("shows wrong token errors clearly", async () => {
    const user = userEvent.setup()
    const wrongTokenResult: SetupClaimResult = {
      ok: false,
      status: "error",
      code: "invalid-setup-token",
      message: "Setup token is invalid.",
    }
    const onClaim = vi.fn(async () => wrongTokenResult)

    renderClaimView({ onClaim })

    await user.type(screen.getByLabelText("Setup token"), "wrong")
    await user.click(screen.getByRole("button", { name: "Claim deployment" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Setup token is invalid."
    )
  })

  it("guards duplicate submits while the claim is pending", async () => {
    const user = userEvent.setup()
    const onClaim = vi.fn(
      () => new Promise<SetupClaimResult>(() => undefined)
    )

    renderClaimView({ onClaim })

    await user.type(screen.getByLabelText("Setup token"), "correct")
    await user.click(screen.getByRole("button", { name: "Claim deployment" }))
    await user.click(screen.getByRole("button", { name: "Claiming..." }))

    expect(onClaim).toHaveBeenCalledTimes(1)
  })

  it("does not render the token form after setup is complete", () => {
    renderClaimView({ state: setupComplete })

    expect(screen.getByRole("heading", { name: "Setup complete" })).toBeInTheDocument()
    expect(screen.getByText("Acme Team is claimed.")).toBeInTheDocument()
    expect(screen.queryByLabelText("Setup token")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open dashboard" })).toHaveAttribute(
      "href",
      "/"
    )
  })

  it("asks signed-out users to sign in before claiming setup", () => {
    renderClaimView({ isSignedIn: false })

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Setup token")).not.toBeInTheDocument()
  })
})
