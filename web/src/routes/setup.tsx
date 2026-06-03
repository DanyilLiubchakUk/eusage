import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import {
  SignInButton,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/tanstack-react-start"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../convex/_generated/api"
import { SetupClaimView } from "../features/setup/setup-claim-view"

const setupQuery = convexQuery(api.setup.get, {})

export const Route = createFileRoute("/setup")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(setupQuery)
  },
  pendingComponent: SetupLoading,
  component: SetupRoute,
})

function SetupRoute() {
  const { data } = useSuspenseQuery(setupQuery)
  const queryClient = useQueryClient()
  const claimOwner = useConvexMutation(api.setup.claimOwner)
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const userLabel =
    user?.primaryEmailAddress?.emailAddress ?? user?.fullName ?? user?.id ?? null

  return (
    <SetupClaimView
      state={data}
      auth={{
        isLoaded,
        isSignedIn: isSignedIn === true,
        userLabel,
      }}
      signInSlot={
        <SignInButton mode="modal">
          <button className="setup-button" type="button">
            Sign in
          </button>
        </SignInButton>
      }
      userSlot={<UserButton />}
      onClaim={async (input) => {
        const result = await claimOwner(input)
        await queryClient.invalidateQueries({ queryKey: setupQuery.queryKey })
        return result
      }}
    />
  )
}

function SetupLoading() {
  return (
    <main className="setup-page">
      <section className="setup-card" aria-label="Setup loading">
        <strong>Loading setup...</strong>
        <p>Checking backend state.</p>
      </section>
    </main>
  )
}
