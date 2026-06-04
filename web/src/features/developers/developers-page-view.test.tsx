import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { DevelopersPageView } from "./developers-page-view"
import type {
  CreateDeveloperResult,
  DevelopersState,
  ReenableDeveloperResult,
  RevokeDeveloperTokenResult,
  RotateDeveloperTokenResult,
} from "./developers"

const developer = {
  id: "developer-1",
  displayName: "Alex Dev",
  email: "alex@example.com",
  status: "active" as const,
  metadata: { notes: "Team lead" },
  createdAt: 1780320000000,
  updatedAt: 1780320000000,
  lastSeenAt: null,
  devices: [
    {
      id: "device-row-1",
      deviceId: "device-1",
      deviceName: "Alex MacBook",
      os: "macos",
      appVersion: "0.6.24",
      status: "connected" as const,
      storedStatus: "connected" as const,
      lastSeenAt: 1780340000000,
      lastSyncAt: null,
      updatedAt: 1780340000000,
    },
  ],
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

const inactiveDeveloper = {
  ...developer,
  id: "developer-2",
  displayName: "Inactive Dev",
  email: "inactive@example.com",
  status: "inactive" as const,
  token: {
    ...developer.token,
    status: "revoked" as const,
    revokedAt: 1780330000000,
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

const rotateResult: RotateDeveloperTokenResult = {
  ok: true,
  message: "Token rotated.",
  developer: {
    ...developer,
    token: {
      ...developer.token,
      fingerprint: "9bd7c84a...51f6cc10",
      rotatedAt: 1780330000000,
    },
  },
  rawToken: "eusage_dev_rotated_raw_token",
}

const revokeResult: RevokeDeveloperTokenResult = {
  ok: true,
  message: "Token revoked. Developer is inactive.",
  developer: inactiveDeveloper,
}

const reenableResult: ReenableDeveloperResult = {
  ok: true,
  message: "Developer re-enabled.",
  developer,
  rawToken: "eusage_dev_reenabled_raw_token",
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
  onRotate?: (input: {
    developerId: string
    tokenLabel: string
  }) => Promise<RotateDeveloperTokenResult>
  onRevoke?: (input: { developerId: string }) => Promise<RevokeDeveloperTokenResult>
  onReenable?: (input: {
    developerId: string
    tokenLabel: string
  }) => Promise<ReenableDeveloperResult>
} = {}) {
  return render(
    <DevelopersPageView
      state={props.state ?? readyState}
      auth={{
        isLoaded: props.isLoaded ?? true,
        isSignedIn: props.isSignedIn ?? true,
      }}
      signInSlot={<button type="button">Sign in</button>}
      teamUrl="http://localhost:3000"
      onCreate={props.onCreate ?? vi.fn(async () => successResult)}
      onRotate={props.onRotate ?? vi.fn(async () => rotateResult)}
      onRevoke={props.onRevoke ?? vi.fn(async () => revokeResult)}
      onReenable={props.onReenable ?? vi.fn(async () => reenableResult)}
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

  it("validates developer fields before create", async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn(async () => successResult)

    renderDevelopersPage({ onCreate })

    await user.clear(screen.getByLabelText("Token label"))
    await user.type(screen.getByLabelText("Email"), "bad-email")
    await user.click(screen.getByRole("button", { name: "Create developer" }))

    expect(onCreate).not.toHaveBeenCalled()
    expect(screen.getByText("Developer name is required.")).toBeInTheDocument()
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument()
    expect(screen.getByText("Token label is required.")).toBeInTheDocument()
  })

  it("rejects token labels longer than 16 characters before create", async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn(async () => successResult)

    renderDevelopersPage({ onCreate })

    await user.type(screen.getByLabelText("Developer name"), "Alex Dev")
    fireEvent.change(screen.getByLabelText("Token label"), {
      target: { value: "12345678901234567" },
    })
    await user.click(screen.getByRole("button", { name: "Create developer" }))

    expect(onCreate).not.toHaveBeenCalled()
    expect(screen.getByText("Use 16 characters or fewer.")).toBeInTheDocument()
  })

  it("renders developer form placeholders", () => {
    renderDevelopersPage()

    expect(screen.getByPlaceholderText("Avery Johnson")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("avery@company.com")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Avery MacBook")).toBeInTheDocument()
    expect(screen.getByLabelText("Token label")).toHaveAttribute("maxlength", "16")
    expect(screen.getByPlaceholderText("Team, device notes, or internal owner context")).toBeInTheDocument()
  })

  it("does not render duplicate admin state or user controls inside the create form", () => {
    renderDevelopersPage()

    expect(screen.queryByText("Backend state")).not.toBeInTheDocument()
    expect(screen.queryByText("Clerk user")).not.toBeInTheDocument()
    expect(screen.queryByText("owner@example.com")).not.toBeInTheDocument()
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
    expect(screen.queryByText("Access token")).not.toBeInTheDocument()
    expect(screen.queryByText("eusage_dev_secret_raw_token")).not.toBeInTheDocument()
  })

  it("shows basic device status under the developer", () => {
    renderDevelopersPage({
      state: {
        ...readyState,
        developers: [developer],
      },
    })

    expect(screen.getByText("Alex MacBook")).toBeInTheDocument()
    expect(screen.getByText("connected - macos - v0.6.24")).toBeInTheDocument()
    expect(
      screen.getByText("Last seen 2026-06-01T18:53:20.000Z")
    ).toBeInTheDocument()
  })

  it("keeps many developer devices in one capped device section", () => {
    const devices = Array.from({ length: 10 }, (_, index) => ({
      ...developer.devices[0],
      id: `device-row-${index + 1}`,
      deviceId: `device-${index + 1}`,
      deviceName: `Alex Device ${index + 1}`,
    }))

    renderDevelopersPage({
      state: {
        ...readyState,
        developers: [{ ...developer, devices }],
      },
    })

    const deviceRegion = screen.getByRole("region", { name: "Devices for Alex Dev" })

    expect(within(deviceRegion).getByText("10 devices")).toBeInTheDocument()
    expect(within(deviceRegion).getByText("Alex Device 1")).toBeInTheDocument()
    expect(within(deviceRegion).getByText("Alex Device 10")).toBeInTheDocument()
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

  it("hides inactive developers until the review control is enabled", async () => {
    const user = userEvent.setup()

    renderDevelopersPage({
      state: {
        ...readyState,
        developers: [developer, inactiveDeveloper],
      },
    })

    expect(screen.getByText("Alex Dev")).toBeInTheDocument()
    expect(screen.queryByText("Inactive Dev")).not.toBeInTheDocument()

    await user.click(screen.getByLabelText("Show inactive developers (1)"))

    expect(screen.getByText("Inactive Dev")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Re-enable" })).toBeInTheDocument()
  })

  it("rotates an active developer token and shows the new raw token once", async () => {
    const user = userEvent.setup()
    const onRotate = vi.fn(async () => rotateResult)

    renderDevelopersPage({
      state: {
        ...readyState,
        developers: [developer],
      },
      onRotate,
    })

    await user.click(screen.getByRole("button", { name: "Rotate" }))

    expect(onRotate).toHaveBeenCalledWith({
      developerId: "developer-1",
      tokenLabel: "Alex laptop",
    })
    expect(await screen.findByText("eusage_dev_rotated_raw_token")).toBeInTheDocument()
    expect(
      screen.getByText(
        "eusage://connect?url=http://localhost:3000&token=eusage_dev_rotated_raw_token"
      )
    ).toBeInTheDocument()
  })

  it("revokes an active developer token without showing a raw token", async () => {
    const user = userEvent.setup()
    const onRevoke = vi.fn(async () => revokeResult)

    renderDevelopersPage({
      state: {
        ...readyState,
        developers: [developer],
      },
      onRevoke,
    })

    await user.click(screen.getByRole("button", { name: "Revoke" }))

    expect(onRevoke).toHaveBeenCalledWith({ developerId: "developer-1" })
    expect(
      await screen.findByText("Token revoked. Developer is inactive.")
    ).toBeInTheDocument()
    expect(screen.queryByText("Connection string")).not.toBeInTheDocument()
  })

  it("re-enables an inactive developer and shows the new raw token once", async () => {
    const user = userEvent.setup()
    const onReenable = vi.fn(async () => reenableResult)

    renderDevelopersPage({
      state: {
        ...readyState,
        developers: [inactiveDeveloper],
      },
      onReenable,
    })

    await user.click(screen.getByLabelText("Show inactive developers (1)"))
    await user.click(screen.getByRole("button", { name: "Re-enable" }))

    expect(onReenable).toHaveBeenCalledWith({
      developerId: "developer-2",
      tokenLabel: "Alex laptop",
    })
    expect(await screen.findByText("eusage_dev_reenabled_raw_token")).toBeInTheDocument()
  })
})
