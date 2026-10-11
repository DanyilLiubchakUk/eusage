import { render, screen, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { expect, it, vi } from "vitest"
import { ConvexAuthenticationState } from "./convex-authentication-state"

const auth = vi.hoisted(() => ({ isLoading: true }))
vi.mock("convex/react", () => ({ useConvexAuth: () => auth }))
vi.mock("@clerk/tanstack-react-start", () => ({
  SignOutButton: ({ children }: { children: ReactNode }) => children,
}))

it("announces backend authentication failure and keeps recovery controls", () => {
  const view = render(<ConvexAuthenticationState />)
  expect(screen.getByRole("region", { name: "Workspace loading" })).toBeInTheDocument()
  expect(screen.queryByRole("alert")).toBeNull()

  auth.isLoading = false
  view.rerender(<ConvexAuthenticationState />)

  const failure = screen.getByRole("alert", { name: "Backend authentication failed" })
  expect(within(failure).getByRole("button", { name: "Retry" })).toBeInTheDocument()
  expect(within(failure).getByRole("button", { name: "Sign out" })).toBeInTheDocument()
})
