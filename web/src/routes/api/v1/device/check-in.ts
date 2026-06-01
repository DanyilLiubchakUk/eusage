import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../../../../convex/_generated/api"
import { getConvexHttpClient } from "../../../../lib/desktop-api/convex-client"
import {
  apiJsonError,
  getBearerTokenHash,
  optionalStringField,
  readJsonObject,
  stringField,
} from "../../../../lib/desktop-api/http"

export const Route = createFileRoute("/api/v1/device/check-in")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await getBearerTokenHash(request.headers)
        if (!auth.ok) return apiJsonError(auth)

        const json = await readJsonObject(request)
        if (!json.ok) return apiJsonError(json)

        const result = await getConvexHttpClient().mutation(api.desktopApi.checkIn, {
          tokenHash: auth.tokenHash,
          deviceId: stringField(json.body, "deviceId"),
          deviceName: optionalStringField(json.body, "deviceName"),
          os: stringField(json.body, "os"),
          appVersion: stringField(json.body, "appVersion"),
        })
        if (!result.ok) return apiJsonError(result)

        return Response.json(result)
      },
    },
  },
})
