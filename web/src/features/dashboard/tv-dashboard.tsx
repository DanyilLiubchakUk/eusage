import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, LogOut, Pause, Play } from "lucide-react"
import { buildTvDashboardModel, type TvSettingsPatch } from "./tv-dashboard-data"
import { NoSlides, TvSlide } from "./tv-dashboard-slides"
import { TvSettingsPanel } from "./tv-dashboard-settings"
import type { ReadyDashboardState } from "./dashboard-source"
import "./tv-dashboard.css"

type TvDashboardProps = {
  state: ReadyDashboardState
  now: number
  onSettingsChange?: (patch: TvSettingsPatch) => Promise<void> | void
}

export function TvDashboard({ state, now, onSettingsChange }: TvDashboardProps) {
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
    <main className="tv-page">
      {activeSlide ? <TvSlide slide={activeSlide} teamName={model.teamName} /> : <NoSlides />}
      <TvPlaybackControls
        paused={paused}
        slideCount={model.slides.length}
        activeSlideTitle={activeSlide?.title ?? "No slides"}
        onPauseToggle={() => setPaused((value) => !value)}
        onPrevious={previousSlide}
        onNext={nextSlide}
      />
      <TvSettingsPanel model={model} onSettingsChange={onSettingsChange} />
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
    <div className="tv-control-bar" aria-label="TV playback controls">
      <span>{activeSlideTitle}</span>
      <button type="button" aria-label="Previous slide" disabled={slideCount < 2} onClick={onPrevious}>
        <ArrowLeft size={18} />
      </button>
      <button
        type="button"
        aria-label={paused ? "Resume auto-rotate" : "Pause auto-rotate"}
        onClick={onPauseToggle}
      >
        {paused ? <Play size={18} /> : <Pause size={18} />}
      </button>
      <button type="button" aria-label="Next slide" disabled={slideCount < 2} onClick={onNext}>
        <ArrowRight size={18} />
      </button>
      <button type="button" aria-label="Exit fullscreen" onClick={() => void exitFullscreen()}>
        <LogOut size={18} />
      </button>
    </div>
  )
}

async function exitFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen()
  }
}
