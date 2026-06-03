export type Theme = "light" | "dark"

export const THEME_STORAGE_KEY = "eusage-theme"

export function getStoredTheme(): Theme | null {
  if (typeof localStorage === "undefined") return null
  const value = localStorage.getItem(THEME_STORAGE_KEY)
  return value === "light" || value === "dark" ? value : null
}

export function getActiveTheme(): Theme {
  if (typeof document !== "undefined") {
    const attr = document.documentElement.dataset.theme
    if (attr === "light" || attr === "dark") return attr
  }
  return getStoredTheme() ?? "light"
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return
  document.documentElement.dataset.theme = theme
}

export function storeTheme(theme: Theme) {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

// Inlined in <head> so the theme is set before first paint (no flash).
export const themeBootstrapScript = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="dark"||t==="light"){document.documentElement.dataset.theme=t}}catch(e){}`
