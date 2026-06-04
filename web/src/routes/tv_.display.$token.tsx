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
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,_#08120e,_#10251d_58%,_#07100d)] px-8 text-[#f1f7f3] max-md:px-4">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl content-center justify-items-center gap-5 py-16 text-center" aria-labelledby="tv-title">
        <p className="m-0 inline-flex w-fit rounded-full border border-[#9ad0b0]/40 bg-[#9ad0b0]/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#9ad0b0]">TV</p>
        <h1 id="tv-title" className="m-0 max-w-[14ch] text-7xl font-black leading-[0.92] text-white max-lg:text-6xl max-md:text-5xl">TV link unavailable</h1>
        <p className="m-0 text-2xl text-[#b8c8bf] max-md:text-xl">Ask an admin to rotate the display link.</p>
      </section>
    </main>
  )
}

function TvDisplayLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,_#08120e,_#10251d_58%,_#07100d)] px-8 text-[#f1f7f3] max-md:px-4">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl content-center justify-items-center gap-5 py-16 text-center" aria-labelledby="tv-loading-title">
        <p className="m-0 inline-flex w-fit rounded-full border border-[#9ad0b0]/40 bg-[#9ad0b0]/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#9ad0b0]">TV</p>
        <h1 id="tv-loading-title" className="m-0 max-w-[14ch] text-7xl font-black leading-[0.92] text-white max-lg:text-6xl max-md:text-5xl">Loading TV...</h1>
        <p className="m-0 text-2xl text-[#b8c8bf] max-md:text-xl">Checking display link.</p>
      </section>
    </main>
  )
}
