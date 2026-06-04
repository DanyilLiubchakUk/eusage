import { describe, expect, it } from "vitest"
import { seedDevelopers } from "./dashboardSeedRows"

describe("dashboard seed rows", () => {
  it("covers mixed developer metadata, token, provider, and device shapes", () => {
    const developers = seedDevelopers(Date.UTC(2026, 5, 4, 12))

    expect(developers).toHaveLength(7)
    expect(developers.some((developer) => !developer.metadataNotes)).toBe(true)
    expect(developers.some((developer) => developer.metadataNotes)).toBe(true)
    expect(developers.some((developer) => !developer.hasToken)).toBe(true)
    expect(developers.some((developer) => developer.hasToken)).toBe(true)
    expect(developers.some((developer) => developer.tokenStatus === "revoked")).toBe(true)
    expect(developers.some((developer) => developer.status === "inactive")).toBe(true)
    expect(developers.some((developer) => developer.providers.length === 0)).toBe(true)
    expect(developers.filter((developer) => developer.devices.length >= 5)).toHaveLength(2)
    expect(developers.reduce((sum, developer) => sum + developer.devices.length, 0)).toBe(19)
  })
})
