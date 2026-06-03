import { describe, expect, it } from "vitest"
import {
  fallbackDeviceName,
  normalizeDeviceName,
  resolveDeviceName,
} from "@/lib/team-device-name"

describe("team device name", () => {
  it("normalizes empty and legacy unknown labels away", () => {
    expect(normalizeDeviceName("  Alex MacBook  ")).toBe("Alex MacBook")
    expect(normalizeDeviceName("")).toBeNull()
    expect(normalizeDeviceName("Unknown device")).toBeNull()
  })

  it("uses override before detected name", () => {
    expect(
      resolveDeviceName({
        override: "Desk Mac",
        detected: "Alex MacBook",
        os: "macos",
      })
    ).toBe("Desk Mac")
  })

  it("falls back to detected name and then OS label", () => {
    expect(
      resolveDeviceName({
        override: null,
        detected: "Alex Windows",
        os: "windows",
      })
    ).toBe("Alex Windows")
    expect(resolveDeviceName({ override: null, detected: null, os: "windows" })).toBe(
      "Windows desktop"
    )
  })

  it("returns friendly OS fallback labels", () => {
    expect(fallbackDeviceName("macos")).toBe("macOS desktop")
    expect(fallbackDeviceName("windows")).toBe("Windows desktop")
    expect(fallbackDeviceName("other")).toBe("Desktop")
  })
})
