import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../convex/_generated/api"
import { TvDashboard } from "../features/dashboard/tv-dashboard"

export const Route = createFileRoute("/tv_/display/$token")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(displaySourceQuery(params.token))
  },
  component: TvDisplayRoute,
})

function TvDisplayRoute() {
  const { token } = Route.useParams()
  const { data } = useSuspenseQuery(displaySourceQuery(token))

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
