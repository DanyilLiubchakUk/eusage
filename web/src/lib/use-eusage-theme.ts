import { useEffect, useState } from "react"
import { getActiveTheme, type Theme } from "./theme"

export function useEusageTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document === "undefined" ? "light" : getActiveTheme()
  )

  useEffect(() => {
    const root = document.documentElement
    const syncTheme = () => {
      setTheme(root.dataset.theme === "dark" ? "dark" : "light")
    }

    syncTheme()
    const observer = new MutationObserver(syncTheme)
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] })
    return () => observer.disconnect()
  }, [])

  return theme
}
