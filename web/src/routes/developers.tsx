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
import type { Id } from "../../../convex/_generated/dataModel"
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
  const rotateDeveloperToken = useConvexMutation(api.developers.rotate)
  const revokeDeveloperToken = useConvexMutation(api.developers.revoke)
  const reenableDeveloper = useConvexMutation(api.developers.reenable)
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

function browserOrigin() {
  if (typeof window === "undefined") return ""
  return window.location.origin
}
