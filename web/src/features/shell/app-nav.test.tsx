import { render, screen, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import {
  OrganizationShellStatus,
  resolveOrganizationShellState,
  type OrganizationShellState,
} from "./app-nav"

describe("OrganizationShellStatus", () => {
  it("shows the signed-out shell state", () => {
    renderStatus({ status: "signed-out" })

    const context = screen.getByLabelText("Organization context")
    expect(within(context).getByText("Signed out")).toBeInTheDocument()
    expect(
      within(context).getByText("Sign in to choose an Organization")
    ).toBeInTheDocument()
    expect(within(context).queryByLabelText("Organization actions")).not.toBeInTheDocument()
  })

  it("shows the no active Organization shell state", () => {
    renderStatus(
      { status: "no-organization" },
      <button type="button">Switch Organization</button>
    )

    const context = screen.getByLabelText("Organization context")
    expect(within(context).getByText("No Organization selected")).toBeInTheDocument()
    expect(
      within(context).getByText("Create or select an Organization")
    ).toBeInTheDocument()
    expect(
      within(context).getByRole("button", { name: "Switch Organization" })
    ).toBeInTheDocument()
  })

  it("shows the active Organization shell state", () => {
    renderStatus(
      {
        status: "active",
        organizationName: "Acme AI",
        organizationSlug: "acme-ai",
        roleLabel: "admin",
      },
      <button type="button">Switch Organization</button>
    )

    const context = screen.getByLabelText("Organization context")
    expect(within(context).getByText("Acme AI")).toBeInTheDocument()
    expect(within(context).getByText("admin")).toBeInTheDocument()
    expect(
      within(context).getByRole("button", { name: "Switch Organization" })
    ).toBeInTheDocument()
  })
})

describe("resolveOrganizationShellState", () => {
  it("keeps the shell loading until auth and active Organization state are loaded", () => {
    expect(
      resolveOrganizationShellState({
        authLoaded: false,
        isSignedIn: false,
        organizationLoaded: false,
      })
    ).toEqual({ status: "loading" })

    expect(
      resolveOrganizationShellState({
        authLoaded: true,
        isSignedIn: true,
        organizationLoaded: false,
      })
    ).toEqual({ status: "loading" })
  })

  it("resolves signed-out, no active Organization, and active Organization states", () => {
    expect(
      resolveOrganizationShellState({
        authLoaded: true,
        isSignedIn: false,
        organizationLoaded: false,
      })
    ).toEqual({ status: "signed-out" })

    expect(
      resolveOrganizationShellState({
        authLoaded: true,
        isSignedIn: true,
        organizationLoaded: true,
        organizationName: null,
      })
    ).toEqual({ status: "no-organization" })

    expect(
      resolveOrganizationShellState({
        authLoaded: true,
        isSignedIn: true,
        organizationLoaded: true,
        organizationName: "Acme AI",
        organizationSlug: "acme-ai",
        role: "org:admin",
      })
    ).toEqual({
      status: "active",
      organizationName: "Acme AI",
      organizationSlug: "acme-ai",
      roleLabel: "admin",
    })
  })
})

function renderStatus(state: OrganizationShellState, organizationSlot?: ReactNode) {
  render(<OrganizationShellStatus state={state} organizationSlot={organizationSlot} />)
}
