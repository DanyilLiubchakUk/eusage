import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import {
  useAuth,
  useOrganization,
} from "@clerk/tanstack-react-start"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { DevelopersPageView } from "../features/developers/developers-page-view"
import { AppShell } from "../features/shell/app-shell"
import { PageState } from "../features/shell/page-state"
import { SignInButton } from "../features/shell/sign-in-button"

export const Route = createFileRoute("/developers")({
  component: DevelopersRoute,
})

function DevelopersRoute() {
  const { isLoaded, isSignedIn, orgId } = useAuth()
  const { organization } = useOrganization()
  const auth = {
    isLoaded,
    isSignedIn: isSignedIn === true,
    orgId: orgId ?? organization?.id ?? null,
  }
  const canReadDevelopers = auth.isLoaded && auth.isSignedIn && auth.orgId
  const developersQuery = convexQuery(api.developers.list, canReadDevelopers ? {} : "skip")
  const developersQueryKey = [...developersQuery.queryKey, "org", auth.orgId]
  const { data } = useQuery({
    ...developersQuery,
    queryKey: developersQueryKey,
  })
  const queryClient = useQueryClient()
  const createDeveloper = useConvexMutation(api.developers.create)
  const rotateDeveloperToken = useConvexMutation(api.developers.rotate)
  const revokeDeveloperToken = useConvexMutation(api.developers.revoke)
  const reenableDeveloper = useConvexMutation(api.developers.reenable)
  const signInSlot = <SignInButton />
  const signedOutState = {
    status: "not-authenticated" as const,
    team: null,
    developers: [],
  }
  const noOrganizationState = {
    status: "organization-required" as const,
    team: null,
    developers: [],
  }

  if (!auth.isLoaded) return <DevelopersLoading />
  if (auth.isSignedIn && auth.orgId && !data) return <DevelopersLoading />

  return (
    <AppShell>
      <DevelopersPageView
        state={data ?? (auth.isSignedIn ? noOrganizationState : signedOutState)}
        auth={{
          ...auth,
        }}
        signInSlot={signInSlot}
        teamUrl={browserOrigin()}
        onCreate={async (input) => {
          const result = await createDeveloper(input)
          await queryClient.invalidateQueries({ queryKey: developersQueryKey })
          return result
        }}
        onRotate={async (input) => {
          const result = await rotateDeveloperToken({
            developerId: input.developerId as Id<"developers">,
            tokenLabel: input.tokenLabel,
          })
          await queryClient.invalidateQueries({ queryKey: developersQueryKey })
          return result
        }}
        onRevoke={async (input) => {
          const result = await revokeDeveloperToken({
            developerId: input.developerId as Id<"developers">,
          })
          await queryClient.invalidateQueries({ queryKey: developersQueryKey })
          return result
        }}
        onReenable={async (input) => {
          const result = await reenableDeveloper({
            developerId: input.developerId as Id<"developers">,
            tokenLabel: input.tokenLabel,
          })
          await queryClient.invalidateQueries({ queryKey: developersQueryKey })
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
