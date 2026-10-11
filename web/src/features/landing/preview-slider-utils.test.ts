import { describe, expect, it } from "vitest"
import {
  buildPreviewSliderConfig,
  defaultPreviewRatios,
  derivePreviewSliderDisplay,
  previewSliderUtilsSelfCheck,
  ratioFromClientX,
  springEaseOutBack,
} from "./preview-slider-utils"

describe("preview-slider-utils", () => {
  it("passes self-check", () => {
    expect(() => previewSliderUtilsSelfCheck()).not.toThrow()
  })

  it("maps pointer x to track ratio", () => {
    const rect = new DOMRect(100, 0, 200, 8)
    expect(ratioFromClientX(rect, 100)).toBe(0)
    expect(ratioFromClientX(rect, 300)).toBe(1)
    expect(ratioFromClientX(rect, 200)).toBe(0.5)
  })

  it("flips top provider when a row is scrubbed past the leader", () => {
    const config = buildPreviewSliderConfig({
      cursorLimitUsd: 480,
      cursorUsedUsd: 317.4,
      providerRows: [
        { providerId: "cursor", value: 4_080_000_000, label: "4.08 B" },
        { providerId: "codex", value: 3_520_000_000, label: "3.52 B" },
      ],
      providerCostsUsd: { cursor: 10_000, codex: 8_000 },
    })
    const ratios = defaultPreviewRatios(config.tracks)
    ratios["provider-cursor"] = 0.75
    ratios["provider-codex"] = 1
    expect(derivePreviewSliderDisplay(config, ratios).topProvider?.providerId).toBe("codex")
  })

  it("springs back toward 1 at t=1", () => {
    expect(springEaseOutBack(1, 0.5)).toBeCloseTo(1, 5)
  })
})
