import { describe, expect, it } from "vitest"
import { defaultTvSlides, isValidTvSlides, normalizeTvSlides } from "./dashboardSettings"

describe("dashboard settings", () => {
  it("accepts default TV slides and normalizes display order", () => {
    const slides = defaultTvSlides()

    expect(isValidTvSlides(slides)).toBe(true)
    expect(normalizeTvSlides([...slides].reverse()).map((slide) => slide.order)).toEqual([
      0, 1, 2, 3, 4,
    ])
  })

  it("rejects TV slides with no enabled slides", () => {
    const slides = defaultTvSlides().map((slide) => ({ ...slide, enabled: false }))

    expect(isValidTvSlides(slides)).toBe(false)
  })

  it("rejects TV slide durations below five seconds", () => {
    const slides = defaultTvSlides().map((slide) =>
      slide.id === "team-overview" ? { ...slide, durationSeconds: 4 } : slide
    )

    expect(isValidTvSlides(slides)).toBe(false)
    expect(normalizeTvSlides(slides).find((slide) => slide.id === "team-overview")?.durationSeconds).toBe(10)
  })
})
