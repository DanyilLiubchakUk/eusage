import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../../../convex/_generated/api"
import { getConvexHttpClient } from "../../../lib/desktop-api/convex-client"
import {
  apiJsonError,
  buildTeamConfigResponse,
} from "../../../lib/desktop-api/http"

export const Route = createFileRoute("/api/v1/team-config")({
  server: {
    handlers: {
      GET: async () => {
        const result = await getConvexHttpClient().query(api.desktopApi.getTeamConfig, {})
        if (!result.ok) return apiJsonError(result)

        return Response.json(
          buildTeamConfigResponse({
            teamName: result.team.name,
          })
        )
      },
    },
  },
})
