import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { DevelopersPageView } from "./developers-page-view"
import type { CreateDeveloperResult, DevelopersState } from "./developers"

const developer = {
  id: "developer-1",
  displayName: "Alex Dev",
  email: "alex@example.com",
  status: "active" as const,
  metadata: { notes: "Team lead" },
  createdAt: 1780320000000,
  updatedAt: 1780320000000,
  lastSeenAt: null,
  token: {
    fingerprint: "2f8a7f04...e2498b5e",
    label: "Alex laptop",
    status: "active" as const,
    createdAt: 1780320000000,
    rotatedAt: null,
    revokedAt: null,
    lastUsedAt: null,
  },
}

const readyState: DevelopersState = {
  status: "ready",
  team: {
    name: "Acme Team",
    slug: "acme-team",
  },
  developers: [],
}

const successResult: CreateDeveloperResult = {
  ok: true,
  message: "Developer created.",
  developer,
  rawToken: "eusage_dev_secret_raw_token",
}

function renderDevelopersPage(props: {
  state?: DevelopersState
  isLoaded?: boolean
  isSignedIn?: boolean
  onCreate?: (input: {
    displayName: string
    email?: string
    tokenLabel: string
    metadataNotes?: string
  }) => Promise<CreateDeveloperResult>
} = {}) {
  return render(
    <DevelopersPageView
      state={props.state ?? readyState}
      auth={{
        isLoaded: props.isLoaded ?? true,
        isSignedIn: props.isSignedIn ?? true,
        userLabel: props.isSignedIn === false ? null : "owner@example.com",
      }}
      signInSlot={<button type="button">Sign in</button>}
      userSlot={<span>owner@example.com</span>}
      teamUrl="http://localhost:3000"
      onCreate={props.onCreate ?? vi.fn(async () => successResult)}
    />
  )
}

describe("DevelopersPageView", () => {
  it("submits developer fields and shows the raw token once after create", async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn(async () => successResult)

    renderDevelopersPage({ onCreate })

    await user.type(screen.getByLabelText("Developer name"), "Alex Dev")
    await user.type(screen.getByLabelText("Email"), "alex@example.com")
    await user.clear(screen.getByLabelText("Token label"))
    await user.type(screen.getByLabelText("Token label"), "Alex laptop")
    await user.type(screen.getByLabelText("Metadata"), "Team lead")
    await user.click(screen.getByRole("button", { name: "Create developer" }))

    expect(onCreate).toHaveBeenCalledWith({
      displayName: "Alex Dev",
      email: "alex@example.com",
      tokenLabel: "Alex laptop",
      metadataNotes: "Team lead",
    })
    expect(await screen.findByText("eusage_dev_secret_raw_token")).toBeInTheDocument()
    expect(
      screen.getByText(
        "eusage://connect?url=http://localhost:3000&token=eusage_dev_secret_raw_token"
      )
    ).toBeInTheDocument()
  })

  it("shows fingerprint metadata without raw token on a fresh render", async () => {
    const user = userEvent.setup()
    const { unmount } = renderDevelopersPage()

    await user.type(screen.getByLabelText("Developer name"), "Alex Dev")
    await user.click(screen.getByRole("button", { name: "Create developer" }))
    expect(await screen.findByText("eusage_dev_secret_raw_token")).toBeInTheDocument()

    unmount()

    renderDevelopersPage({
      state: {
        ...readyState,
        developers: [developer],
      },
    })

    expect(screen.getByText("Alex Dev")).toBeInTheDocument()
    expect(screen.getByText("2f8a7f04...e2498b5e")).toBeInTheDocument()
    expect(screen.getByText("Team lead")).toBeInTheDocument()
    expect(screen.queryByText("eusage_dev_secret_raw_token")).not.toBeInTheDocument()
  })

  it("asks signed-out users to sign in before managing developers", () => {
    renderDevelopersPage({
      state: {
        status: "not-authenticated",
        team: null,
        developers: [],
      },
      isSignedIn: false,
    })

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Developer name")).not.toBeInTheDocument()
  })

  it("does not render the form for non-owner users", () => {
    renderDevelopersPage({
      state: {
        status: "not-owner",
        team: {
          name: "Acme Team",
          slug: "acme-team",
        },
        developers: [],
      },
    })

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Only the setup owner can manage developers."
    )
    expect(screen.queryByLabelText("Developer name")).not.toBeInTheDocument()
  })
})
