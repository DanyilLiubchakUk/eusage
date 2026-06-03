import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import {
  SignInButton,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/tanstack-react-start"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { DevelopersPageView } from "../features/developers/developers-page-view"

export const Route = createFileRoute("/developers")({
  component: DevelopersRoute,
})

function DevelopersRoute() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
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
  const userLabel =
    user?.primaryEmailAddress?.emailAddress ?? user?.fullName ?? user?.id ?? null
  const signInSlot = (
    <SignInButton mode="modal">
      <button className="setup-button" type="button">
        Sign in
      </button>
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
    <DevelopersPageView
      state={data ?? signedOutState}
      auth={{
        ...auth,
        userLabel,
      }}
      signInSlot={signInSlot}
      userSlot={<UserButton />}
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
  )
}

function DevelopersLoading() {
  return (
    <main className="admin-page">
      <section className="setup-card" aria-label="Developers loading">
        <strong>Loading developers...</strong>
        <p>Checking sign-in.</p>
      </section>
    </main>
  )
}

function browserOrigin() {
  if (typeof window === "undefined") return ""
  return window.location.origin
}
