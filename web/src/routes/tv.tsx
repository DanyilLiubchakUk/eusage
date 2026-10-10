import { convexQuery, useConvexAuth, useConvexMutation } from "@convex-dev/react-query"
import { useAuth, useOrganization } from "@clerk/tanstack-react-start"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import {
  DashboardLoading,
  DashboardSignInRequired,
  DashboardUnavailable,
} from "../features/dashboard/dashboard-placeholders"
import { DASHBOARD_SOURCE_REFETCH_INTERVAL_MS } from "../features/dashboard/dashboard-refresh"
import type { DashboardSourceState } from "../features/dashboard/dashboard"
import { TvDashboard } from "../features/dashboard/tv-dashboard"
import { SignInButton } from "../features/shell/sign-in-button"
import { ConvexAuthenticationState } from "../features/shell/convex-authentication-state"
import { AppShell } from "../features/shell/app-shell"

export const Route = createFileRoute("/tv")({
  component: TvRoute,
})

function TvRoute() {
  const auth = useDashboardAuth()
  const convexAuth = useConvexAuth()
  const canReadDashboard = auth.isLoaded && auth.isSignedIn && auth.orgId && convexAuth.isAuthenticated
  const dashboardSourceQuery = convexQuery(
    api.dashboard.sourceRows,
    canReadDashboard ? {} : "skip"
  )
  const dashboardQueryKey = dashboardSourceQuery.queryKey
  const tvDisplayLinkQuery = convexQuery(
    api.tvDisplayLinks.get,
    canReadDashboard ? {} : "skip"
  )
  const tvDisplayLinkQueryKey = tvDisplayLinkQuery.queryKey
  const { data } = useQuery({
    ...dashboardSourceQuery,
    refetchInterval: DASHBOARD_SOURCE_REFETCH_INTERVAL_MS,
  })
  const { data: displayLinkState } = useQuery({
    ...tvDisplayLinkQuery,
  })
  const queryClient = useQueryClient()
  const updateTvSettings = useConvexMutation(api.dashboard.updateTvSettings)
  const createDisplayLink = useConvexMutation(api.tvDisplayLinks.create)
  const rotateDisplayLink = useConvexMutation(api.tvDisplayLinks.rotate)
  const revokeDisplayLink = useConvexMutation(api.tvDisplayLinks.revoke)
  const [rawDisplayToken, setRawDisplayToken] = useState<string | null>(null)

  if (!auth.isLoaded) return <DashboardLoading />
  if (!auth.isSignedIn) return <DashboardSignInRequired signInSlot={<SignInButton />} />
  if (!auth.orgId) {
    return (
      <DashboardUnavailable
        state={{ status: "organization-required" } as DashboardSourceState}
        auth={auth}
        signInSlot={<SignInButton />}
      />
    )
  }
  if (!convexAuth.isAuthenticated) return <AppShell><ConvexAuthenticationState /></AppShell>
  if (!data || !displayLinkState) return <DashboardLoading />

  if (data.status !== "ready") {
    return (
      <DashboardUnavailable
        state={data}
        auth={auth}
        signInSlot={<SignInButton />}
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
                await queryClient.invalidateQueries({ queryKey: tvDisplayLinkQueryKey })
              },
              onRotate: async () => {
                const result = await rotateDisplayLink({})
                if (!result.ok) throw new Error(result.message)
                setRawDisplayToken(result.rawToken ?? null)
                await queryClient.invalidateQueries({ queryKey: tvDisplayLinkQueryKey })
              },
              onRevoke: async () => {
                const result = await revokeDisplayLink({})
                if (!result.ok) throw new Error(result.message)
                setRawDisplayToken(null)
                await queryClient.invalidateQueries({ queryKey: tvDisplayLinkQueryKey })
              },
            }
          : undefined
      }
      onSettingsChange={async (patch) => {
        const result = await updateTvSettings(patch)
        if (result.status !== "ok") {
          throw new Error(`TV settings update failed: ${result.status}`)
        }
        await queryClient.invalidateQueries({ queryKey: dashboardQueryKey })
      }}
    />
  )
}

function useDashboardAuth() {
  const { isLoaded, isSignedIn, orgId } = useAuth()
  const { organization } = useOrganization()
  return {
    isLoaded,
    isSignedIn: isSignedIn === true,
    orgId: orgId ?? organization?.id ?? null,
  }
}

function getOrigin() {
  if (typeof window === "undefined") return ""
  return window.location.origin
}
