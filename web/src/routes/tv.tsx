import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../convex/_generated/api"
import { TvDashboard } from "../features/dashboard/tv-dashboard"

const dashboardSourceQuery = convexQuery(api.dashboard.sourceRows, {})

export const Route = createFileRoute("/tv")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(dashboardSourceQuery)
  },
  component: TvRoute,
})

function TvRoute() {
  const { data } = useSuspenseQuery(dashboardSourceQuery)
  const queryClient = useQueryClient()
  const updateTvSettings = useConvexMutation(api.dashboard.updateTvSettings)

  if (data.status !== "ready") {
    return (
      <main className="setup-page">
        <section className="setup-card" aria-label="Dashboard unavailable">
          <strong>Dashboard unavailable</strong>
          <p>{data.status}</p>
        </section>
      </main>
    )
  }

  return (
    <TvDashboard
      state={data}
      now={Date.now()}
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
