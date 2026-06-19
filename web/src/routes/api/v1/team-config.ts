import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../../../convex/_generated/api"
import { getConvexHttpClient } from "../../../lib/desktop-api/convex-client"
import {
  apiJsonError,
  buildTeamConfigResponse,
  desktopApiJson,
  desktopApiOptions,
  getOptionalBearerTokenHash,
} from "../../../lib/desktop-api/http"

export const Route = createFileRoute("/api/v1/team-config")({
  server: {
    handlers: {
      OPTIONS: () => desktopApiOptions(),
      GET: async ({ request }) => {
        const auth = await getOptionalBearerTokenHash(request.headers)
        if (!auth.ok) return apiJsonError(auth)

        const result = await getConvexHttpClient().query(api.desktopApi.getTeamConfig, {
          ...(auth.tokenHash ? { tokenHash: auth.tokenHash } : {}),
        })
        if (!result.ok) return apiJsonError(result)

        return desktopApiJson(
          buildTeamConfigResponse({
            teamName: result.team.name,
            organizationName: result.team.organizationName,
            reportingTimeZone: result.team.reportingTimeZone,
            teamFingerprint: result.team.teamFingerprint,
            organizationFingerprint: result.team.organizationFingerprint,
          })
        )
      },
    },
  },
})
