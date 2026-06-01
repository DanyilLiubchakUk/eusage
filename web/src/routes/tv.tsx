import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../convex/_generated/api"
import { TvDashboardPlaceholder } from "../features/dashboard/dashboard-placeholders"

const dashboardSourceQuery = convexQuery(api.dashboard.sourceRows, {})

export const Route = createFileRoute("/tv")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(dashboardSourceQuery)
  },
  component: TvRoute,
})

function TvRoute() {
  const { data } = useSuspenseQuery(dashboardSourceQuery)
  return <TvDashboardPlaceholder state={data} now={Date.now()} />
}
