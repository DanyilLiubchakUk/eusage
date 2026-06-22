import { describe, expect, it } from "vitest"
import { LANDING_COST_ESTIMATE_NOTE, landingMockState } from "./landing-mock-state"

type LandingSample = {
  metricKey: string
  value: number
}

function sampleTotal(suffix: string) {
  const samples = landingMockState.metricSamples as LandingSample[]

  return samples
    .filter((sample) => sample.metricKey.endsWith(suffix))
    .reduce((sum, sample) => sum + sample.value, 0)
}

describe("landing mock state", () => {
  it("keeps the public card estimate marked as rough", () => {
    expect(LANDING_COST_ESTIMATE_NOTE).toContain("Rough estimate")
  })

  it("keeps token and cost samples aligned with the generic token mix", () => {
    expect(sampleTotal(".tokens.total")).toBe(12_520_000_000)
    expect(sampleTotal(".cost.estimated")).toBeCloseTo(28_998.4, 2)
  })
})
