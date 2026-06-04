import { describe, expect, it } from "vitest"
import { isLocalSeedOrigin } from "./dashboardSeed"

describe("dashboard local seed guard", () => {
  it("allows only the local bun dev:web origin", () => {
    expect(isLocalSeedOrigin("http://localhost:3000")).toBe(true)
    expect(isLocalSeedOrigin("http://127.0.0.1:3000")).toBe(true)
    expect(isLocalSeedOrigin("http://[::1]:3000")).toBe(true)
  })

  it("rejects production and non-dev origins", () => {
    expect(isLocalSeedOrigin("https://eusage.vercel.app")).toBe(false)
    expect(isLocalSeedOrigin("http://localhost:5173")).toBe(false)
    expect(isLocalSeedOrigin("https://localhost:3000")).toBe(false)
    expect(isLocalSeedOrigin("not a url")).toBe(false)
  })
})
