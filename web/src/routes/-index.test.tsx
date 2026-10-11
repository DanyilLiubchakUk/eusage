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
        name: /see where your AI spend actually goes/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByText(/groups developers into organizations/i)).toBeInTheDocument()

    const openAppLinks = screen.getAllByRole("link", { name: /open app/i })
    expect(openAppLinks.length).toBeGreaterThan(0)
    expect(openAppLinks[0]).toHaveAttribute("href", "/overview")

    const signInButtons = screen.getAllByRole("button", { name: /sign in/i })
    expect(signInButtons.length).toBeGreaterThan(0)

    const setupLinks = screen.getAllByRole("link", { name: /start setup/i })
    expect(setupLinks.length).toBeGreaterThan(0)
    expect(setupLinks[0]).toHaveAttribute("href", "/setup")
  })

  it("links to Overview, Developers, and TV sections", () => {
    render(<LandingPage />)

    const overviewLinks = screen.getAllByRole("link", { name: "Overview" })
    expect(overviewLinks.length).toBeGreaterThan(0)
    expect(overviewLinks[0]).toHaveAttribute("href", "/overview")

    const developerLinks = screen.getAllByRole("link", { name: "Developers" })
    expect(developerLinks.length).toBeGreaterThan(0)
    expect(developerLinks[0]).toHaveAttribute("href", "/developers")

    const tvLinks = screen.getAllByRole("link", { name: "TV" })
    expect(tvLinks.length).toBeGreaterThan(0)
    expect(tvLinks[0]).toHaveAttribute("href", "/tv")
  })
})
