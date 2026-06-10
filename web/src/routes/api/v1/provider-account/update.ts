import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../../../../convex/_generated/api"
import { getConvexHttpClient } from "../../../../lib/desktop-api/convex-client"
import {
  apiJsonError,
  desktopApiJson,
  desktopApiOptions,
  getBearerTokenHash,
  readJsonObject,
  stringField,
} from "../../../../lib/desktop-api/http"

export const Route = createFileRoute("/api/v1/provider-account/update")({
  server: {
    handlers: {
      OPTIONS: () => desktopApiOptions(),
      POST: async ({ request }) => {
        const auth = await getBearerTokenHash(request.headers)
        if (!auth.ok) return apiJsonError(auth)

        const json = await readJsonObject(request)
        if (!json.ok) return apiJsonError(json)

        const result = await getConvexHttpClient().mutation(
          api.desktopApi.updateProviderAccount,
          {
            tokenHash: auth.tokenHash,
            providerId: stringField(json.body, "providerId"),
            providerAccountFingerprint: stringField(
              json.body,
              "providerAccountFingerprint"
            ),
            providerAccountLabel: stringField(json.body, "providerAccountLabel"),
            status: "shared",
          }
        )
        if (!result.ok) return apiJsonError(result)

        return desktopApiJson(result)
      },
    },
  },
})
