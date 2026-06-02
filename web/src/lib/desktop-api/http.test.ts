import { describe, expect, it } from "vitest"
import {
  buildTeamConfigResponse,
  desktopApiJson,
  desktopApiOptions,
  getBearerToken,
  getBearerTokenHash,
} from "./http"
import { hashDeveloperToken } from "../../../../convex/developerTokens"

describe("desktop API HTTP helpers", () => {
  it("builds safe public team config metadata", () => {
    const response = buildTeamConfigResponse({ teamName: "Acme Team" })

    expect(response).toMatchObject({
      teamName: "Acme Team",
      apiVersion: "v1",
      endpoints: {
        teamConfig: "/api/v1/team-config",
        deviceCheckIn: "/api/v1/device/check-in",
        usageBatch: "/api/v1/usage/batch",
        deviceDisconnect: "/api/v1/device/disconnect",
      },
    })
    expect(JSON.stringify(response)).not.toContain("Convex")
    expect(JSON.stringify(response)).not.toContain("Clerk")
    expect(JSON.stringify(response)).not.toContain("token")
    expect(JSON.stringify(response)).not.toContain("admin")
    expect(JSON.stringify(response)).not.toContain("email")
  })

  it("extracts and hashes bearer tokens without accepting malformed auth", async () => {
    const rawToken = "eusage_dev_secret_raw_token"
    const headers = new Headers({
      authorization: `Bearer ${rawToken}`,
    })

    expect(getBearerToken(headers)).toBe(rawToken)
    await expect(getBearerTokenHash(headers)).resolves.toEqual({
      ok: true,
      tokenHash: await hashDeveloperToken(rawToken),
    })
    expect(getBearerToken(new Headers())).toBeNull()
    expect(getBearerToken(new Headers({ authorization: rawToken }))).toBeNull()
    expect(
      getBearerToken(new Headers({ authorization: `Bearer ${rawToken} extra` }))
    ).toBeNull()
  })

  it("adds CORS headers for desktop webview requests", () => {
    const response = desktopApiJson({ ok: true })

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*")
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS")
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "Authorization"
    )
  })

  it("builds a preflight response for authenticated desktop requests", () => {
    const response = desktopApiOptions()

    expect(response.status).toBe(204)
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*")
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "Content-Type"
    )
  })
})
