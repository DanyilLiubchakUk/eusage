import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { SignInButton, useAuth } from "@clerk/tanstack-react-start"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import {
  DashboardLoading,
  DashboardSignInRequired,
  DashboardUnavailable,
} from "../features/dashboard/dashboard-placeholders"
import { TvDashboard } from "../features/dashboard/tv-dashboard"

export const Route = createFileRoute("/tv")({
  component: TvRoute,
})

function TvRoute() {
  const auth = useDashboardAuth()
  const canReadDashboard = auth.isLoaded && auth.isSignedIn
  const dashboardSourceQuery = convexQuery(
    api.dashboard.sourceRows,
    canReadDashboard ? {} : "skip"
  )
  const tvDisplayLinkQuery = convexQuery(
    api.tvDisplayLinks.get,
    canReadDashboard ? {} : "skip"
  )
  const { data } = useQuery(dashboardSourceQuery)
  const { data: displayLinkState } = useQuery(tvDisplayLinkQuery)
  const queryClient = useQueryClient()
  const updateTvSettings = useConvexMutation(api.dashboard.updateTvSettings)
  const createDisplayLink = useConvexMutation(api.tvDisplayLinks.create)
  const rotateDisplayLink = useConvexMutation(api.tvDisplayLinks.rotate)
  const revokeDisplayLink = useConvexMutation(api.tvDisplayLinks.revoke)
  const [rawDisplayToken, setRawDisplayToken] = useState<string | null>(null)

  if (!auth.isLoaded) return <DashboardLoading />
  if (!auth.isSignedIn) return <DashboardSignInRequired signInSlot={<DashboardSignInButton />} />
  if (!data || !displayLinkState) return <DashboardLoading />

  if (data.status !== "ready") {
    return (
      <DashboardUnavailable
        state={data}
        auth={auth}
        signInSlot={<DashboardSignInButton />}
      />
    )
  }

  const displayUrl = rawDisplayToken
    ? `${getOrigin()}/tv/display/${encodeURIComponent(rawDisplayToken)}`
    : null

  return (
    <TvDashboard
      state={data}
      now={Date.now()}
      displayLinkControls={
        displayLinkState.status === "ready"
          ? {
              link: displayLinkState.link,
              rawToken: rawDisplayToken,
              displayUrl,
              onCreate: async () => {
                const result = await createDisplayLink({})
                if (!result.ok) throw new Error(result.message)
                setRawDisplayToken(result.rawToken ?? null)
                await queryClient.invalidateQueries({ queryKey: tvDisplayLinkQuery.queryKey })
              },
              onRotate: async () => {
                const result = await rotateDisplayLink({})
                if (!result.ok) throw new Error(result.message)
                setRawDisplayToken(result.rawToken ?? null)
                await queryClient.invalidateQueries({ queryKey: tvDisplayLinkQuery.queryKey })
              },
              onRevoke: async () => {
                const result = await revokeDisplayLink({})
                if (!result.ok) throw new Error(result.message)
                setRawDisplayToken(null)
                await queryClient.invalidateQueries({ queryKey: tvDisplayLinkQuery.queryKey })
              },
            }
          : undefined
      }
      onSettingsChange={async (patch) => {
        const result = await updateTvSettings(patch)
        if (result.status !== "ok") {
          throw new Error(`TV settings update failed: ${result.status}`)
        }
        await queryClient.invalidateQueries({ queryKey: dashboardSourceQuery.queryKey })
      }}
    />
  )
}

function useDashboardAuth() {
  const { isLoaded, isSignedIn } = useAuth()
  return {
    isLoaded,
    isSignedIn: isSignedIn === true,
  }
}

function DashboardSignInButton() {
  return (
    <SignInButton mode="modal">
      <button className="setup-button" type="button">
        Sign in
      </button>
    </SignInButton>
  )
}

function getOrigin() {
  if (typeof window === "undefined") return ""
  return window.location.origin
}
