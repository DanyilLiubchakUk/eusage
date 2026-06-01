import { useCallback, useEffect, useState } from "react"
import { invoke, isTauri } from "@tauri-apps/api/core"
import {
  loadWindowsTrayGuidanceSeen,
  saveWindowsTrayGuidanceSeen,
} from "@/lib/settings"

export function useWindowsTrayGuidance() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isTauri()) return

    let cancelled = false

    async function loadGuidanceState() {
      const platform = await invoke<string>("get_desktop_platform")
      if (platform !== "windows") return

      const seen = await loadWindowsTrayGuidanceSeen()
      if (!cancelled && !seen) {
        setVisible(true)
      }
    }

    void loadGuidanceState().catch((error) => {
      console.error("Failed to load Windows tray guidance:", error)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    void saveWindowsTrayGuidanceSeen(true).catch((error) => {
      console.error("Failed to save Windows tray guidance:", error)
    })
  }, [])

  return { visible, dismiss }
}
