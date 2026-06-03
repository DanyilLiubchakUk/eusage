import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import { TvDashboard } from "../features/dashboard/tv-dashboard"

const dashboardSourceQuery = convexQuery(api.dashboard.sourceRows, {})
const tvDisplayLinkQuery = convexQuery(api.tvDisplayLinks.get, {})

export const Route = createFileRoute("/tv")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(dashboardSourceQuery)
    await context.queryClient.ensureQueryData(tvDisplayLinkQuery)
  },
  component: TvRoute,
})

function TvRoute() {
  const { data } = useSuspenseQuery(dashboardSourceQuery)
  const { data: displayLinkState } = useSuspenseQuery(tvDisplayLinkQuery)
  const queryClient = useQueryClient()
  const updateTvSettings = useConvexMutation(api.dashboard.updateTvSettings)
  const createDisplayLink = useConvexMutation(api.tvDisplayLinks.create)
  const rotateDisplayLink = useConvexMutation(api.tvDisplayLinks.rotate)
  const revokeDisplayLink = useConvexMutation(api.tvDisplayLinks.revoke)
  const [rawDisplayToken, setRawDisplayToken] = useState<string | null>(null)

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
                await queryClient.invalidateQueries({ queryKey: tvDisplayLinkQuery.queryKey })
              },
              onRotate: async () => {
                const result = await rotateDisplayLink({})
                if (!result.ok) throw new Error(result.message)
                setRawDisplayToken(result.rawToken ?? null)
                await queryClient.invalidateQueries({ queryKey: tvDisplayLinkQuery.queryKey })
              },
              onRevoke: async () => {
                const result = await revokeDisplayLink({})
                if (!result.ok) throw new Error(result.message)
                setRawDisplayToken(null)
                await queryClient.invalidateQueries({ queryKey: tvDisplayLinkQuery.queryKey })
              },
            }
          : undefined
      }
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

function getOrigin() {
  if (typeof window === "undefined") return ""
  return window.location.origin
}
