import { describe, expect, it } from "vitest"
import {
  fingerprintDeveloperToken,
  parseTeamConnectionString,
} from "@/lib/team-connection"

describe("team connection parser", () => {
  it("accepts production and localhost connection strings", () => {
    expect(
      parseTeamConnectionString(
        "eusage://connect?url=https://team.example.com&token=eusage_dev_secret"
      )
    ).toEqual({
      ok: true,
      value: {
        teamUrl: "https://team.example.com",
        token: "eusage_dev_secret",
      },
    })

    expect(
      parseTeamConnectionString(
        "eusage://connect?url=http://localhost:3000&token=eusage_dev_local"
      )
    ).toEqual({
      ok: true,
      value: {
        teamUrl: "http://localhost:3000",
        token: "eusage_dev_local",
      },
    })
  })

  it("rejects missing URL, missing token, wrong scheme, and unsafe URLs", () => {
    expect(parseTeamConnectionString("eusage://connect?token=eusage_dev_secret")).toMatchObject({
      ok: false,
      code: "connection-url-required",
    })
    expect(parseTeamConnectionString("eusage://connect?url=https://team.example.com")).toMatchObject({
      ok: false,
      code: "connection-token-required",
    })
    expect(
      parseTeamConnectionString(
        "https://team.example.com?url=https://team.example.com&token=eusage_dev_secret"
      )
    ).toMatchObject({
      ok: false,
      code: "connection-string-scheme-invalid",
    })
    expect(
      parseTeamConnectionString(
        "eusage://connect?url=http://team.example.com&token=eusage_dev_secret"
      )
    ).toMatchObject({
      ok: false,
      code: "connection-url-unsafe",
    })
    expect(
      parseTeamConnectionString(
        "eusage://connect?url=https://user:pass@team.example.com&token=eusage_dev_secret"
      )
    ).toMatchObject({
      ok: false,
      code: "connection-url-unsafe",
    })
  })

  it("computes the hash-backed developer token fingerprint", async () => {
    await expect(fingerprintDeveloperToken("eusage_dev_secret")).resolves.toMatch(
      /^[a-f0-9]{8}\.\.\.[a-f0-9]{8}$/
    )
  })
})
