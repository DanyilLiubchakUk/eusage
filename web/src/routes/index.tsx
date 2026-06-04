import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { SignInButton, useAuth } from "@clerk/tanstack-react-start"
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { api } from "../../../convex/_generated/api"
import {
  AdminDashboardPlaceholder,
  DashboardLoading,
  DashboardSignInRequired,
} from "../features/dashboard/dashboard-placeholders"
import { DASHBOARD_SOURCE_REFETCH_INTERVAL_MS } from "../features/dashboard/dashboard-refresh"
import type { MetricDateRangeInput } from "../lib/metrics"
import { SetupStatusView } from "../features/setup/setup-status-view"
import { AppShell } from "../features/shell/app-shell"

const setupQuery = convexQuery(api.setup.get, {})

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(setupQuery)
  },
  pendingComponent: DashboardLoading,
  component: Home,
})

function Home() {
  const { data: setupState } = useSuspenseQuery(setupQuery)

  return (
    <AppShell>
      {setupState.status !== "setup-complete" ? (
        <SetupStatusView state={setupState} />
      ) : (
        <HomeDashboard />
      )}
    </AppShell>
  )
}

function HomeDashboard() {
  const auth = useDashboardAuth()
  const dashboardSourceQuery = convexQuery(
    api.dashboard.sourceRows,
    auth.isLoaded && auth.isSignedIn ? {} : "skip"
  )
  const { data: dashboardState } = useQuery({
    ...dashboardSourceQuery,
    refetchInterval: DASHBOARD_SOURCE_REFETCH_INTERVAL_MS,
  })
  const queryClient = useQueryClient()
  const updateDashboardSettings = useConvexMutation(api.dashboard.updateDashboardSettings)
  const clearTeamData = useConvexMutation(api.dashboard.clearTeamData)
  const seedLocalMockData = useConvexMutation(api.dashboard.seedLocalMockData)
  const localSeedOrigin = useLocalSeedOrigin()

  if (!auth.isLoaded) return <DashboardLoading />
  if (!auth.isSignedIn) return <DashboardSignInRequired signInSlot={<DashboardSignInButton />} />
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
        await queryClient.invalidateQueries({ queryKey: dashboardSourceQuery.queryKey })
      }}
      onReportingTimeZoneChange={async (reportingTimeZone) => {
        const result = await updateDashboardSettings({ reportingTimeZone })
        if (result.status !== "ok") {
          throw new Error(`Dashboard settings update failed: ${result.status}`)
        }
        await queryClient.invalidateQueries({ queryKey: dashboardSourceQuery.queryKey })
      }}
      onProviderVisibilityChange={async (visibleProviderIds) => {
        const result = await updateDashboardSettings({ visibleProviderIds })
        if (result.status !== "ok") {
          throw new Error(`Dashboard settings update failed: ${result.status}`)
        }
        await queryClient.invalidateQueries({ queryKey: dashboardSourceQuery.queryKey })
      }}
      onClearTeamData={async () => {
        const result = await clearTeamData({ confirm: "DELETE TEAM DATA" })
        if (result.status !== "ok") {
          throw new Error(`Team data delete failed: ${result.status}`)
        }
        await queryClient.invalidateQueries({ queryKey: dashboardSourceQuery.queryKey })
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
              await queryClient.invalidateQueries({ queryKey: dashboardSourceQuery.queryKey })
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
  const { isLoaded, isSignedIn } = useAuth()
  return {
    isLoaded,
    isSignedIn: isSignedIn === true,
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
