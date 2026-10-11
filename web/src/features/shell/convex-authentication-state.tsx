import { SignOutButton } from "@clerk/tanstack-react-start"
import { useConvexAuth } from "convex/react"
import { PageState } from "./page-state"

export function ConvexAuthenticationState() {
  const { isLoading } = useConvexAuth()
  return (
    <PageState
      tone={isLoading ? "default" : "error"}
      label={isLoading ? "Workspace loading" : "Backend authentication failed"}
      title={isLoading ? "Loading workspace..." : "Unable to authenticate with the backend"}
    >
      {isLoading ? <p className="m-0">Checking sign-in.</p> : (
        <div className="flex gap-3">
          <button type="button" onClick={() => window.location.reload()}>Retry</button>
          <SignOutButton><button type="button">Sign out</button></SignOutButton>
        </div>
      )}
    </PageState>
  )
}
