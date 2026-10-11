import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  PREVIEW_SLIDER_FOLLOW_MS,
  PREVIEW_TRACK_HIT_PAD_PX,
  defaultPreviewRatios,
  derivePreviewSliderDisplay,
  ratioFromClientX,
  springEaseOutBack,
  springResetDurationMs,
  type PreviewSliderConfig,
} from "./preview-slider-utils"

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function usePreviewSliders(config: PreviewSliderConfig) {
  const defaults = useMemo(() => defaultPreviewRatios(config.tracks), [config.tracks])
  const [ratios, setRatios] = useState(defaults)
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null)
  const ratiosRef = useRef(ratios)
  const trackRefs = useRef(new Map<string, HTMLDivElement>())
  const animRef = useRef(0)

  useEffect(() => {
    ratiosRef.current = ratios
  }, [ratios])

  const cancelAnimation = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    animRef.current = 0
  }, [])

  useEffect(() => cancelAnimation, [cancelAnimation])

  const registerTrack = useCallback((trackId: string) => {
    return (node: HTMLDivElement | null) => {
      if (node) trackRefs.current.set(trackId, node)
      else trackRefs.current.delete(trackId)
    }
  }, [])

  const setRatio = useCallback(
    (trackId: string, ratio: number) => {
      cancelAnimation()
      const next = { ...ratiosRef.current, [trackId]: ratio }
      ratiosRef.current = next
      setRatios(next)
    },
    [cancelAnimation]
  )

  const springToDefaults = useCallback(() => {
    cancelAnimation()
    setActiveTrackId(null)

    if (prefersReducedMotion()) {
      ratiosRef.current = defaults
      setRatios(defaults)
      return
    }

    const from = { ...ratiosRef.current }
    const intensity = Math.max(
      ...config.tracks.map((track) =>
        Math.abs((from[track.id] ?? track.defaultRatio) - track.defaultRatio)
      ),
      0
    )
    if (intensity <= 0.001) {
      ratiosRef.current = defaults
      setRatios(defaults)
      return
    }

    const duration = springResetDurationMs(intensity, 0)
    const startedAt = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration)
      const eased = springEaseOutBack(t, intensity)
      const next = { ...defaults }
      for (const track of config.tracks) {
        const start = from[track.id] ?? track.defaultRatio
        next[track.id] = start + (track.defaultRatio - start) * eased
      }
      ratiosRef.current = next
      setRatios(next)
      if (t < 1) animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
  }, [cancelAnimation, config.tracks, defaults])

  const hitTestTrack = useCallback(
    (clientX: number, clientY: number) => {
      for (const track of config.tracks) {
        const node = trackRefs.current.get(track.id)
        if (!node) continue
        const rect = node.getBoundingClientRect()
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top - PREVIEW_TRACK_HIT_PAD_PX &&
          clientY <= rect.bottom + PREVIEW_TRACK_HIT_PAD_PX
        ) {
          return { trackId: track.id, ratio: ratioFromClientX(rect, clientX) }
        }
      }
      return null
    },
    [config.tracks]
  )

  const onPointerMove = useCallback(
    (clientX: number, clientY: number) => {
      const hit = hitTestTrack(clientX, clientY)
      if (!hit) return
      setActiveTrackId(hit.trackId)
      setRatio(hit.trackId, hit.ratio)
    },
    [hitTestTrack, setRatio]
  )

  const onPointerLeave = useCallback(() => {
    springToDefaults()
  }, [springToDefaults])

  const display = useMemo(() => derivePreviewSliderDisplay(config, ratios), [config, ratios])

  const getBarStyle = useCallback(
    (trackId: string, barPct: number) => ({
      width: `${barPct}%`,
      transition:
        activeTrackId === trackId
          ? `width ${PREVIEW_SLIDER_FOLLOW_MS}ms cubic-bezier(0.33, 1, 0.68, 1)`
          : undefined,
    }),
    [activeTrackId]
  )

  const getThumbStyle = useCallback(
    (trackId: string, barPct: number) => ({
      left: `${barPct}%`,
      opacity: activeTrackId === trackId ? 1 : 0,
      transition:
        activeTrackId === trackId
          ? `left ${PREVIEW_SLIDER_FOLLOW_MS}ms cubic-bezier(0.33, 1, 0.68, 1), opacity 120ms ease-out`
          : "opacity 160ms ease-out",
    }),
    [activeTrackId]
  )

  return {
    display,
    registerTrack,
    onPointerMove,
    onPointerLeave,
    activeTrackId,
    getBarStyle,
    getThumbStyle,
  }
}
