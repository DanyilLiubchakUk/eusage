import { useCallback, useEffect, useRef, useState } from "react"
import { invoke, isTauri } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { getCurrentWindow, PhysicalSize, currentMonitor } from "@tauri-apps/api/window"
import type { ActiveView } from "@/components/side-nav"
import type { DisplayPluginState } from "@/hooks/app/use-app-plugin-views"

const PANEL_WIDTH = 400
const MAX_HEIGHT_FALLBACK_PX = 600
const MAX_HEIGHT_FRACTION_OF_MONITOR = 0.8

type UsePanelArgs = {
  activeView: ActiveView
  setActiveView: (view: ActiveView) => void
  showAbout: boolean
  setShowAbout: (value: boolean) => void
  displayPlugins: DisplayPluginState[]
  isWindows?: boolean
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  if (target.isContentEditable) return true
  if (target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']")) {
    return true
  }

  return false
}

export function usePanel({
  activeView,
  setActiveView,
  showAbout,
  setShowAbout,
  displayPlugins,
  isWindows = false,
}: UsePanelArgs) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollDown, setCanScrollDown] = useState(false)
  const [maxPanelHeightPx, setMaxPanelHeightPx] = useState<number | null>(null)
  const maxPanelHeightPxRef = useRef<number | null>(null)
  const resizeQueueRef = useRef(Promise.resolve())
  const focusContainer = useCallback(() => {
    window.requestAnimationFrame(() => {
      containerRef.current?.focus({ preventScroll: true })
    })
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        focusContainer()
      }
    }

    window.addEventListener("focus", focusContainer)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("focus", focusContainer)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [focusContainer])

  useEffect(() => {
    if (!isTauri()) return
    invoke("init_panel").catch(console.error)
  }, [])

  useEffect(() => {
    if (!isTauri()) return
    if (showAbout) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        invoke("hide_panel")
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [showAbout])

  useEffect(() => {
    if (!isTauri()) return
    let cancelled = false
    const unlisteners: (() => void)[] = []

    async function setup() {
      const u1 = await listen<string>("tray:navigate", (event) => {
        setActiveView(event.payload as ActiveView)
        focusContainer()
      })
      if (cancelled) {
        u1()
        return
      }
      unlisteners.push(u1)

      const u2 = await listen("tray:show-about", () => {
        setShowAbout(true)
        focusContainer()
      })
      if (cancelled) {
        u2()
        return
      }
      unlisteners.push(u2)
    }

    void setup().catch((error) => {
      console.error("Failed to listen for tray events:", error)
      for (const fn of unlisteners.splice(0)) fn()
    })

    return () => {
      cancelled = true
      for (const fn of unlisteners.splice(0)) fn()
    }
  }, [focusContainer, setActiveView, setShowAbout])

  useEffect(() => {
    if (showAbout) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return
      if (isEditableTarget(event.target)) return

      const views: ActiveView[] = ["home", ...displayPlugins.map((plugin) => plugin.meta.id)]
      if (views.length === 0) return

      let nextView: ActiveView | undefined

      if (activeView === "settings") {
        nextView = event.key === "ArrowUp" ? views[views.length - 1] : views[0]
      } else {
        const currentIndex = views.indexOf(activeView)
        if (currentIndex === -1) return
        const offset = event.key === "ArrowUp" ? -1 : 1
        nextView = views[(currentIndex + offset + views.length) % views.length]
      }

      if (!nextView || nextView === activeView) return

      event.preventDefault()
      setActiveView(nextView)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeView, displayPlugins, setActiveView, showAbout])

  useEffect(() => {
    if (!isTauri()) return
    const container = containerRef.current
    if (!container) return
    const currentWindow = getCurrentWindow()
    let cancelled = false
    let resizeRequest = 0
    let unlistenScale: (() => void) | undefined

    const resizeWindow = async (scaleFactor?: number) => {
      const request = ++resizeRequest
      const desiredHeightLogical = Math.max(1, container.scrollHeight)

      let maxHeightPhysical: number | null = null
      let maxHeightLogical: number | null = null
      let maxWidthPhysical: number | null = null
      let monitorScaleFactor: number | undefined

      try {
        const monitor = await currentMonitor()
        if (monitor) {
          const availableHeight = isWindows ? monitor.workArea.size.height : monitor.size.height
          maxHeightPhysical = Math.floor(availableHeight * MAX_HEIGHT_FRACTION_OF_MONITOR)
          if (isWindows) {
            maxWidthPhysical = monitor.workArea.size.width
            monitorScaleFactor = monitor.scaleFactor
          }
        }
      } catch (error) {
        console.error("Failed to read panel monitor:", error)
      }

      if (cancelled || request !== resizeRequest) return
      const factor = scaleFactor ?? monitorScaleFactor ?? window.devicePixelRatio
      const width = Math.min(Math.ceil(PANEL_WIDTH * factor), maxWidthPhysical ?? Infinity)
      if (maxHeightPhysical !== null) {
        maxHeightLogical = Math.floor(maxHeightPhysical / factor)
      }

      if (maxHeightLogical === null) {
        const screenAvailHeight = Number(window.screen?.availHeight) || MAX_HEIGHT_FALLBACK_PX
        maxHeightLogical = Math.floor(screenAvailHeight * MAX_HEIGHT_FRACTION_OF_MONITOR)
        maxHeightPhysical = Math.floor(maxHeightLogical * factor)
      }

      if (maxPanelHeightPxRef.current !== maxHeightLogical) {
        maxPanelHeightPxRef.current = maxHeightLogical
        setMaxPanelHeightPx(maxHeightLogical)
      }

      const desiredHeightPhysical = Math.ceil(desiredHeightLogical * factor)
      const contentHeight = Math.ceil(Math.min(desiredHeightPhysical, maxHeightPhysical!))
      const height = isWindows ? maxHeightPhysical! : contentHeight

      resizeQueueRef.current = resizeQueueRef.current.then(async () => {
        if (cancelled || request !== resizeRequest) return
        try {
          await currentWindow.setSize(new PhysicalSize(width, height))
        } catch (e) {
          console.error("Failed to resize window:", e)
        }
      })
      await resizeQueueRef.current
    }

    void resizeWindow()

    const handleFocus = () => { void resizeWindow() }
    if (isWindows) {
      window.addEventListener("focus", handleFocus)
      currentWindow.onScaleChanged(({ payload }) => {
        void resizeWindow(payload.scaleFactor)
      }).then((unlisten) => {
        if (cancelled) unlisten()
        else unlistenScale = unlisten
      }).catch((error) => {
        console.error("Failed to listen for panel scale changes:", error)
      })
    }

    const observer = new ResizeObserver(() => {
      void resizeWindow()
    })
    observer.observe(container)

    return () => {
      cancelled = true
      observer.disconnect()
      window.removeEventListener("focus", handleFocus)
      unlistenScale?.()
    }
  }, [activeView, displayPlugins, isWindows])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const check = () => {
      setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 1)
    }

    check()
    el.addEventListener("scroll", check, { passive: true })

    const ro = new ResizeObserver(check)
    ro.observe(el)

    const mo = new MutationObserver(check)
    mo.observe(el, { childList: true, subtree: true })

    return () => {
      el.removeEventListener("scroll", check)
      ro.disconnect()
      mo.disconnect()
    }
  }, [activeView])

  return {
    containerRef,
    scrollRef,
    canScrollDown,
    maxPanelHeightPx,
  }
}
