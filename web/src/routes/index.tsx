import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../convex/_generated/api"
import { AdminDashboardPlaceholder } from "../features/dashboard/dashboard-placeholders"
import type { MetricDateRangeInput } from "../lib/metrics"
import { SetupStatusView } from "../features/setup/setup-status-view"

const setupQuery = convexQuery(api.setup.get, {})
const dashboardSourceQuery = convexQuery(api.dashboard.sourceRows, {})

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(setupQuery)
    await context.queryClient.ensureQueryData(dashboardSourceQuery)
  },
  component: Home,
})

function Home() {
  const { data: setupState } = useSuspenseQuery(setupQuery)
  const { data: dashboardState } = useSuspenseQuery(dashboardSourceQuery)
  const queryClient = useQueryClient()
  const updateDashboardSettings = useConvexMutation(api.dashboard.updateDashboardSettings)

  if (setupState.status !== "setup-complete") {
    return <SetupStatusView state={setupState} />
  }

  return (
    <AdminDashboardPlaceholder
      state={dashboardState}
      now={Date.now()}
      onDateRangeChange={async (defaultDateRange: MetricDateRangeInput) => {
        const result = await updateDashboardSettings({ defaultDateRange })
        if (result.status !== "ok") {
          throw new Error(`Dashboard settings update failed: ${result.status}`)
        }
        await queryClient.invalidateQueries({ queryKey: dashboardSourceQuery.queryKey })
      }}
    />
  )
}
