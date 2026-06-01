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
import { DevelopersPageView } from "../features/developers/developers-page-view"

const developersQuery = convexQuery(api.developers.list, {})

export const Route = createFileRoute("/developers")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(developersQuery)
  },
  component: DevelopersRoute,
})

function DevelopersRoute() {
  const { data } = useSuspenseQuery(developersQuery)
  const queryClient = useQueryClient()
  const createDeveloper = useConvexMutation(api.developers.create)
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const userLabel =
    user?.primaryEmailAddress?.emailAddress ?? user?.fullName ?? user?.id ?? null

  return (
    <DevelopersPageView
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
      teamUrl={browserOrigin()}
      onCreate={async (input) => {
        const result = await createDeveloper(input)
        await queryClient.invalidateQueries({ queryKey: developersQuery.queryKey })
        return result
      }}
    />
  )
}

function browserOrigin() {
  if (typeof window === "undefined") return ""
  return window.location.origin
}
