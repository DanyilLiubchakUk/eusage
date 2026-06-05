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

  it("uses non-linear 7-day sample history for the team chart", () => {
    const developers = seedDevelopers(Date.UTC(2026, 5, 4, 12))
    const totalsByDay = new Map<number, number>()

    for (const developer of developers) {
      for (const provider of developer.providers) {
        for (const sample of provider.samples) {
          if (!sample.metricKey.endsWith(".tokens.total")) continue
          totalsByDay.set(sample.dayOffset, (totalsByDay.get(sample.dayOffset) ?? 0) + sample.value)
        }
      }
    }

    const values = [...totalsByDay.entries()].sort(([left], [right]) => left - right).map(([, value]) => value)
    const deltas = values.slice(1).map((value, index) => value - values[index])

    expect(values).toHaveLength(7)
    expect(deltas.some((delta) => delta > 0)).toBe(true)
    expect(deltas.some((delta) => delta < 0)).toBe(true)
  })
})
