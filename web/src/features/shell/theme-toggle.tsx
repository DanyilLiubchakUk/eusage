import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { applyTheme, getActiveTheme, storeTheme, type Theme } from "../../lib/theme"

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTheme(getActiveTheme())
    setMounted(true)
  }, [])

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark"
    setTheme(next)
    applyTheme(next)
    storeTheme(next)
  }

  const isDark = mounted && theme === "dark"

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
      <span className="theme-toggle-label">{isDark ? "Light" : "Dark"}</span>
    </button>
  )
}
