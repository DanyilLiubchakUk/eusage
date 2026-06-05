import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, LogOut, Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { buildTvDashboardModel, type TvSettingsPatch } from "./tv-dashboard-data"
import { NoSlides, TvSlide } from "./tv-dashboard-slides"
import { TvSettingsPanel, type TvDisplayLinkControls } from "./tv-dashboard-settings"
import type { ReadyDashboardState } from "./dashboard-source"

type TvDashboardProps = {
  state: ReadyDashboardState
  now: number
  onSettingsChange?: (patch: TvSettingsPatch) => Promise<void> | void
  displayLinkControls?: TvDisplayLinkControls
  showSettings?: boolean
}

export function TvDashboard({
  state,
  now,
  onSettingsChange,
  displayLinkControls,
  showSettings = true,
}: TvDashboardProps) {
  const [clock, setClock] = useState(now)
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const model = buildTvDashboardModel(state, clock)
  const activeSlide = model.slides[activeIndex] ?? null
  const durationSeconds = activeSlide?.durationSeconds ?? 10

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const previousRootOverflow = root.style.overflow
    const previousBodyOverflow = body.style.overflow
    const previousBodyHeight = body.style.height

    root.style.overflow = "hidden"
    body.style.overflow = "hidden"
    body.style.height = "100dvh"

    return () => {
      root.style.overflow = previousRootOverflow
      body.style.overflow = previousBodyOverflow
      body.style.height = previousBodyHeight
    }
  }, [])

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(model.slides.length - 1, 0)))
  }, [model.slides.length])

  useEffect(() => {
    if (paused || model.slides.length <= 1) return
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % model.slides.length)
    }, durationSeconds * 1_000)
    return () => window.clearTimeout(timer)
  }, [activeIndex, durationSeconds, model.slides.length, paused])

  function previousSlide() {
    if (model.slides.length === 0) return
    setActiveIndex((current) => (current - 1 + model.slides.length) % model.slides.length)
  }

  function nextSlide() {
    if (model.slides.length === 0) return
    setActiveIndex((current) => (current + 1) % model.slides.length)
  }

  return (
    <main
      className={cn(
        "relative isolate h-dvh max-h-dvh overflow-hidden bg-[linear-gradient(140deg,_#06100c_0%,_#10251d_54%,_#07100d_100%)] px-[clamp(1rem,3vw,4rem)] text-[#eef8f1] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[repeating-linear-gradient(90deg,_rgba(154,208,176,0.075)_0_1px,_transparent_1px_8rem)] after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:bg-[repeating-linear-gradient(0deg,_rgba(154,208,176,0.055)_0_1px,_transparent_1px_8rem)]"
      )}
    >
      {activeSlide ? <TvSlide slide={activeSlide} teamName={model.teamName} /> : <NoSlides />}
      <TvPlaybackControls
        paused={paused}
        slideCount={model.slides.length}
        activeSlideTitle={activeSlide?.title ?? "No slides"}
        onPauseToggle={() => setPaused((value) => !value)}
        onPrevious={previousSlide}
        onNext={nextSlide}
      />
      {showSettings ? (
        <TvSettingsPanel
          model={model}
          onSettingsChange={onSettingsChange}
          displayLinkControls={displayLinkControls}
        />
      ) : null}
    </main>
  )
}

function TvPlaybackControls({
  paused,
  slideCount,
  activeSlideTitle,
  onPauseToggle,
  onPrevious,
  onNext,
}: {
  paused: boolean
  slideCount: number
  activeSlideTitle: string
  onPauseToggle: () => void
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div
      className="fixed bottom-4 right-4 z-10 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-[#9ad0b0]/25 bg-[#07120f]/85 p-2 text-white opacity-75 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-opacity hover:opacity-100 focus-within:opacity-100 max-md:bottom-3 max-md:right-3"
      aria-label="TV playback controls"
    >
      <span className="max-w-72 overflow-hidden text-ellipsis whitespace-nowrap pl-2 text-sm font-black uppercase tracking-wide text-[#cdebd8]">
        {activeSlideTitle}
      </span>
      <Button className={tvControlButtonClass} type="button" aria-label="Previous slide" disabled={slideCount < 2} onClick={onPrevious}>
        <ArrowLeft size={18} />
      </Button>
      <Button
        className={tvControlButtonClass}
        type="button"
        aria-label={paused ? "Resume auto-rotate" : "Pause auto-rotate"}
        disabled={slideCount < 2}
        onClick={onPauseToggle}
      >
        {paused ? <Play size={18} /> : <Pause size={18} />}
      </Button>
      <Button className={tvControlButtonClass} type="button" aria-label="Next slide" disabled={slideCount < 2} onClick={onNext}>
        <ArrowRight size={18} />
      </Button>
      <Button className={tvControlButtonClass} type="button" aria-label="Exit fullscreen" onClick={() => void exitFullscreen()}>
        <LogOut size={18} />
      </Button>
    </div>
  )
}

const tvControlButtonClass =
  "size-8 rounded-full border-[#9ad0b0]/25 bg-[#9ad0b0]/10 p-0 text-white hover:bg-[#9ad0b0]/20 disabled:opacity-45"

async function exitFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen()
  }
}
