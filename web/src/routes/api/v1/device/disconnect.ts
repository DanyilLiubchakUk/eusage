import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../../../../convex/_generated/api"
import { getConvexHttpClient } from "../../../../lib/desktop-api/convex-client"
import {
  apiJsonError,
  getBearerTokenHash,
  readJsonObject,
  stringField,
} from "../../../../lib/desktop-api/http"

export const Route = createFileRoute("/api/v1/device/disconnect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await getBearerTokenHash(request.headers)
        if (!auth.ok) return apiJsonError(auth)

        const json = await readJsonObject(request)
        if (!json.ok) return apiJsonError(json)

        const result = await getConvexHttpClient().mutation(api.desktopApi.disconnect, {
          tokenHash: auth.tokenHash,
          deviceId: stringField(json.body, "deviceId"),
        })
        if (!result.ok) return apiJsonError(result)

        return Response.json(result)
      },
    },
  },
})
