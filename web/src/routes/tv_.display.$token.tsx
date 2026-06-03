import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../convex/_generated/api"
import { DASHBOARD_SOURCE_REFETCH_INTERVAL_MS } from "../features/dashboard/dashboard-refresh"
import { TvDashboard } from "../features/dashboard/tv-dashboard"

export const Route = createFileRoute("/tv_/display/$token")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(displaySourceQuery(params.token))
  },
  pendingComponent: TvDisplayLoading,
  component: TvDisplayRoute,
})

function TvDisplayRoute() {
  const { token } = Route.useParams()
  const { data } = useSuspenseQuery({
    ...displaySourceQuery(token),
    refetchInterval: DASHBOARD_SOURCE_REFETCH_INTERVAL_MS,
  })

  if (data.status !== "ready") {
    return <TvLinkUnavailable />
  }

  return <TvDashboard state={data} now={Date.now()} showSettings={false} />
}

function displaySourceQuery(token: string) {
  return convexQuery(api.tvDisplayLinks.displaySource, { token })
}

function TvLinkUnavailable() {
  return (
    <main className="tv-page tv-page--display">
      <section className="tv-slide" aria-labelledby="tv-title">
        <p className="setup-eyebrow">TV</p>
        <h1 id="tv-title">TV link unavailable</h1>
        <p className="tv-subtitle">Ask an admin to rotate the display link.</p>
      </section>
    </main>
  )
}

function TvDisplayLoading() {
  return (
    <main className="tv-page tv-page--display">
      <section className="tv-slide" aria-labelledby="tv-loading-title">
        <p className="setup-eyebrow">TV</p>
        <h1 id="tv-loading-title">Loading TV...</h1>
        <p className="tv-subtitle">Checking display link.</p>
      </section>
    </main>
  )
}
