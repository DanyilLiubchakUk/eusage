import { useState } from "react"
import { HeroPreview } from "../../web/src/features/landing/landing-page"

export function LandingPreview() {
  const [theme, setTheme] = useState<"dark" | "light">("light")

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    document.documentElement.dataset.theme = next
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <button
        type="button"
        onClick={toggleTheme}
        style={{
          padding: "0.4rem 0.8rem",
          fontSize: "0.75rem",
          fontFamily: "Geist Mono, monospace",
          background: "var(--card)",
          border: "1px solid var(--surface-hairline)",
          color: "var(--foreground)",
          borderRadius: "0.5rem",
          cursor: "pointer",
        }}
      >
        {theme === "dark" ? "light" : "dark"}
      </button>
      <div className="w-full max-w-md">
        <HeroPreview />
      </div>
    </div>
  )
}
