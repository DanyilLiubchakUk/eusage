import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../convex/_generated/api"
import { SetupStatusView } from "../features/setup/setup-status-view"

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(convexQuery(api.setup.get, {}))
  },
  component: Home,
})

function Home() {
  const { data } = useSuspenseQuery(convexQuery(api.setup.get, {}))
  return <SetupStatusView state={data} />
}
