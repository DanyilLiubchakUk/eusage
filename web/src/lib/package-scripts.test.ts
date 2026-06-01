import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

type PackageJson = {
  scripts?: Record<string, string>
}

const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8")
) as PackageJson

describe("web command wiring", () => {
  it("keeps web dev and test commands separate from desktop commands", () => {
    expect(packageJson.scripts?.["dev:web"]).toContain("convex dev --start")
    expect(packageJson.scripts?.["dev:web"]).toContain("vite --config web/vite.config.ts")
    expect(packageJson.scripts?.["dev:desktop"]).toBe("bun tauri dev")
    expect(packageJson.scripts?.["test:web"]).toBe("vitest run --config web/vitest.config.ts")
  })
})
