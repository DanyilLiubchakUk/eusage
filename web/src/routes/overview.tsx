import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { SignInButton, useAuth, useOrganization } from "@clerk/tanstack-react-start"
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { api } from "../../../convex/_generated/api"
import {
  AdminDashboardPlaceholder,
  DashboardLoading,
  DashboardSignInRequired,
  DashboardUnavailable,
} from "../features/dashboard/dashboard-placeholders"
import { DASHBOARD_SOURCE_REFETCH_INTERVAL_MS } from "../features/dashboard/dashboard-refresh"
import type { DashboardSourceState } from "../features/dashboard/dashboard"
import type { MetricDateRangeInput } from "../lib/metrics"
import { SetupStatusView } from "../features/setup/setup-status-view"
import { AppShell } from "../features/shell/app-shell"

const setupQuery = convexQuery(api.setup.get, {})

export const Route = createFileRoute("/overview")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(setupQuery)
  },
  pendingComponent: DashboardLoading,
  component: OverviewRoute,
})

function OverviewRoute() {
  const { data: setupState } = useSuspenseQuery(setupQuery)

  return (
    <AppShell>
      {setupState.status !== "setup-complete" ? (
        <SetupStatusView state={setupState} />
      ) : (
        <OverviewDashboard />
      )}
    </AppShell>
  )
}

function OverviewDashboard() {
  const auth = useDashboardAuth()
  const canReadDashboard = auth.isLoaded && auth.isSignedIn && auth.orgId
  const dashboardSourceQuery = convexQuery(
    api.dashboard.sourceRows,
    canReadDashboard ? {} : "skip"
  )
  const dashboardQueryKey = [...dashboardSourceQuery.queryKey, "org", auth.orgId]
  const { data: dashboardState } = useQuery({
    ...dashboardSourceQuery,
    queryKey: dashboardQueryKey,
    refetchInterval: DASHBOARD_SOURCE_REFETCH_INTERVAL_MS,
  })
  const queryClient = useQueryClient()
  const updateDashboardSettings = useConvexMutation(api.dashboard.updateDashboardSettings)
  const clearTeamData = useConvexMutation(api.dashboard.clearTeamData)
  const seedLocalMockData = useConvexMutation(api.dashboard.seedLocalMockData)
  const localSeedOrigin = useLocalSeedOrigin()

  if (!auth.isLoaded) return <DashboardLoading />
  if (!auth.isSignedIn) return <DashboardSignInRequired signInSlot={<DashboardSignInButton />} />
  if (!auth.orgId) {
    return (
      <DashboardUnavailable
        state={{ status: "organization-required" } as DashboardSourceState}
        auth={auth}
        signInSlot={<DashboardSignInButton />}
      />
    )
  }
  if (!dashboardState) return <DashboardLoading />

  return (
    <AdminDashboardPlaceholder
      state={dashboardState}
      now={Date.now()}
      auth={auth}
      signInSlot={<DashboardSignInButton />}
      onDateRangeChange={async (defaultDateRange: MetricDateRangeInput) => {
        const result = await updateDashboardSettings({ defaultDateRange })
        if (result.status !== "ok") {
          throw new Error(`Dashboard settings update failed: ${result.status}`)
        }
        await queryClient.invalidateQueries({ queryKey: dashboardQueryKey })
      }}
      onReportingTimeZoneChange={async (reportingTimeZone) => {
        const result = await updateDashboardSettings({ reportingTimeZone })
        if (result.status !== "ok") {
          throw new Error(`Dashboard settings update failed: ${result.status}`)
        }
        await queryClient.invalidateQueries({ queryKey: dashboardQueryKey })
      }}
      onProviderVisibilityChange={async (visibleProviderIds) => {
        const result = await updateDashboardSettings({ visibleProviderIds })
        if (result.status !== "ok") {
          throw new Error(`Dashboard settings update failed: ${result.status}`)
        }
        await queryClient.invalidateQueries({ queryKey: dashboardQueryKey })
      }}
      onClearTeamData={async () => {
        const result = await clearTeamData({ confirm: "DELETE TEAM DATA" })
        if (result.status !== "ok") {
          throw new Error(`Team data delete failed: ${result.status}`)
        }
        await queryClient.invalidateQueries({ queryKey: dashboardQueryKey })
        return { deleted: result.deleted }
      }}
      onSeedMockData={
        localSeedOrigin
          ? async () => {
              const result = await seedLocalMockData({
                confirm: "SEED LOCAL MOCK DATA",
                clientOrigin: localSeedOrigin,
              })
              if (result.status !== "ok") {
                throw new Error(`Mock data seed failed: ${result.status}`)
              }
              await queryClient.invalidateQueries({ queryKey: dashboardQueryKey })
              return { seeded: result.seeded }
            }
          : undefined
      }
    />
  )
}

function useLocalSeedOrigin() {
  const [origin, setOrigin] = useState<string | null>(null)

  useEffect(() => {
    setOrigin(resolveLocalSeedOrigin())
  }, [])

  return origin
}

function resolveLocalSeedOrigin() {
  if (!import.meta.env.DEV || typeof window === "undefined") return null
  const { protocol, hostname, port, origin } = window.location
  if (protocol !== "http:" || port !== "3000") return null
  if (
    hostname !== "localhost" &&
    hostname !== "127.0.0.1" &&
    hostname !== "::1" &&
    hostname !== "[::1]"
  ) {
    return null
  }
  return origin
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

function DashboardSignInButton() {
  return (
    <SignInButton mode="modal">
      <Button type="button">
        Sign in
      </Button>
    </SignInButton>
  )
}
