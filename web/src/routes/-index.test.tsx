import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { LandingPage } from "../features/landing/landing-page"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  createFileRoute: () => (config: unknown) => config,
}))

vi.mock("@clerk/tanstack-react-start", () => ({
  SignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

describe("LandingPage", () => {
  it("renders the public SaaS landing page", () => {
    render(<LandingPage />)

    expect(
      screen.getByRole("heading", {
        name: "eUsage shows where your AI spend is going.",
      })
    ).toBeInTheDocument()
    expect(screen.getByText(/group developers into organizations/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open app" })).toHaveAttribute(
      "href",
      "/overview"
    )
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Start setup" })).toHaveAttribute(
      "href",
      "/setup"
    )
  })
})
