import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import {
  SignInButton,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/tanstack-react-start"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { api } from "../../../convex/_generated/api"
import { SetupClaimView } from "../features/setup/setup-claim-view"
import { AppShell } from "../features/shell/app-shell"
import { PageState } from "../features/shell/page-state"

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
    <AppShell>
      <SetupClaimView
        state={data}
        auth={{
          isLoaded,
          isSignedIn: isSignedIn === true,
          userLabel,
        }}
        signInSlot={
          <SignInButton mode="modal">
            <Button type="button">
              Sign in
            </Button>
          </SignInButton>
        }
        userSlot={<UserButton />}
        onClaim={async (input) => {
          const result = await claimOwner(input)
          await queryClient.invalidateQueries({ queryKey: setupQuery.queryKey })
          return result
        }}
      />
    </AppShell>
  )
}

function SetupLoading() {
  return (
    <AppShell>
      <PageState label="Setup loading" title="Loading setup...">
        <p className="m-0">Checking backend state.</p>
      </PageState>
    </AppShell>
  )
}
