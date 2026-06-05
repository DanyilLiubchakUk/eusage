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
    <main className={tvDisplayShellClass}>
      <section className={tvDisplayStateClass} aria-labelledby="tv-title">
        <p className={tvDisplayEyebrowClass}>TV</p>
        <h1 id="tv-title" className={tvDisplayHeadingClass}>TV link unavailable</h1>
        <p className={tvDisplaySubtitleClass}>Ask an admin to rotate the display link.</p>
      </section>
    </main>
  )
}

function TvDisplayLoading() {
  return (
    <main className={tvDisplayShellClass}>
      <section className={tvDisplayStateClass} aria-labelledby="tv-loading-title">
        <p className={tvDisplayEyebrowClass}>TV</p>
        <h1 id="tv-loading-title" className={tvDisplayHeadingClass}>Loading TV...</h1>
        <p className={tvDisplaySubtitleClass}>Checking display link.</p>
      </section>
    </main>
  )
}

const tvDisplayShellClass =
  "relative isolate h-screen max-h-screen overflow-hidden bg-[linear-gradient(140deg,_#06100c_0%,_#10251d_54%,_#07100d_100%)] px-[clamp(1rem,3vw,4rem)] text-[#eef8f1] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[repeating-linear-gradient(90deg,_rgba(154,208,176,0.075)_0_1px,_transparent_1px_8rem)] after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:bg-[repeating-linear-gradient(0deg,_rgba(154,208,176,0.055)_0_1px,_transparent_1px_8rem)]"

const tvDisplayStateClass =
  "mx-auto grid min-h-screen w-full max-w-[90rem] content-center justify-items-center gap-[clamp(1rem,1.8vw,2rem)] py-[clamp(2rem,6vh,6rem)] text-center"

const tvDisplayEyebrowClass =
  "m-0 inline-flex w-fit rounded-full border border-[#9ad0b0]/45 bg-[#9ad0b0]/15 px-[clamp(0.75rem,1vw,1.2rem)] py-[clamp(0.35rem,0.5vw,0.55rem)] text-[clamp(0.72rem,0.8vw,1rem)] font-black uppercase tracking-wide text-[#9ad0b0]"

const tvDisplayHeadingClass =
  "m-0 max-w-[12ch] break-words text-[clamp(3.2rem,8.2vw,11rem)] font-black leading-[0.9] text-[#eef8f1]"

const tvDisplaySubtitleClass =
  "m-0 max-w-[42ch] text-[clamp(1.15rem,1.7vw,2.45rem)] font-bold leading-tight text-[#cdebd8]"
