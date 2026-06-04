import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import {
  SignInButton,
  useAuth,
} from "@clerk/tanstack-react-start"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { DevelopersPageView } from "../features/developers/developers-page-view"
import { AppShell } from "../features/shell/app-shell"
import { PageState } from "../features/shell/page-state"

export const Route = createFileRoute("/developers")({
  component: DevelopersRoute,
})

function DevelopersRoute() {
  const { isLoaded, isSignedIn } = useAuth()
  const auth = {
    isLoaded,
    isSignedIn: isSignedIn === true,
  }
  const developersQuery = convexQuery(api.developers.list, auth.isSignedIn ? {} : "skip")
  const { data } = useQuery(developersQuery)
  const queryClient = useQueryClient()
  const createDeveloper = useConvexMutation(api.developers.create)
  const rotateDeveloperToken = useConvexMutation(api.developers.rotate)
  const revokeDeveloperToken = useConvexMutation(api.developers.revoke)
  const reenableDeveloper = useConvexMutation(api.developers.reenable)
  const signInSlot = (
    <SignInButton mode="modal">
      <Button type="button">
        Sign in
      </Button>
    </SignInButton>
  )
  const signedOutState = {
    status: "not-authenticated" as const,
    team: null,
    developers: [],
  }

  if (!auth.isLoaded) return <DevelopersLoading />
  if (auth.isSignedIn && !data) return <DevelopersLoading />

  return (
    <AppShell>
      <DevelopersPageView
        state={data ?? signedOutState}
        auth={{
          ...auth,
        }}
        signInSlot={signInSlot}
        teamUrl={browserOrigin()}
        onCreate={async (input) => {
          const result = await createDeveloper(input)
          await queryClient.invalidateQueries({ queryKey: developersQuery.queryKey })
          return result
        }}
        onRotate={async (input) => {
          const result = await rotateDeveloperToken({
            developerId: input.developerId as Id<"developers">,
            tokenLabel: input.tokenLabel,
          })
          await queryClient.invalidateQueries({ queryKey: developersQuery.queryKey })
          return result
        }}
        onRevoke={async (input) => {
          const result = await revokeDeveloperToken({
            developerId: input.developerId as Id<"developers">,
          })
          await queryClient.invalidateQueries({ queryKey: developersQuery.queryKey })
          return result
        }}
        onReenable={async (input) => {
          const result = await reenableDeveloper({
            developerId: input.developerId as Id<"developers">,
            tokenLabel: input.tokenLabel,
          })
          await queryClient.invalidateQueries({ queryKey: developersQuery.queryKey })
          return result
        }}
      />
    </AppShell>
  )
}

function DevelopersLoading() {
  return (
    <AppShell>
      <PageState label="Developers loading" title="Loading developers...">
        <p className="m-0">Checking sign-in.</p>
      </PageState>
    </AppShell>
  )
}

function browserOrigin() {
  if (typeof window === "undefined") return ""
  return window.location.origin
}
