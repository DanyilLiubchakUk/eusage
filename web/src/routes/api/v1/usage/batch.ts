import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../../../../convex/_generated/api"
import { getConvexHttpClient } from "../../../../lib/desktop-api/convex-client"
import {
  apiJsonError,
  desktopApiJson,
  desktopApiOptions,
  getBearerTokenHash,
  readJsonObject,
} from "../../../../lib/desktop-api/http"

export const Route = createFileRoute("/api/v1/usage/batch")({
  server: {
    handlers: {
      OPTIONS: () => desktopApiOptions(),
      POST: async ({ request }) => {
        const auth = await getBearerTokenHash(request.headers)
        if (!auth.ok) return apiJsonError(auth)

        const json = await readJsonObject(request)
        if (!json.ok) return apiJsonError(json)

        const result = await getConvexHttpClient().mutation(api.usageIngest.uploadBatch, {
          tokenHash: auth.tokenHash,
          batch: json.body,
        })
        if (!result.ok) return apiJsonError(result)

        return desktopApiJson(result)
      },
    },
  },
})
