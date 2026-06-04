import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  parseTvSlideDuration,
  TV_SLIDE_DURATION_MAX_SECONDS,
  TV_SLIDE_DURATION_MIN_SECONDS,
} from "./tv-dashboard-data"

type TvSlideDurationInputProps = {
  id: string
  label: string
  value: number
  disabled: boolean
  onCommit: (value: number) => void
}

const DURATION_DEBOUNCE_MS = 450
const durationError = `Allow ${TV_SLIDE_DURATION_MIN_SECONDS}-${TV_SLIDE_DURATION_MAX_SECONDS} seconds`

export function TvSlideDurationInput({
  id,
  label,
  value,
  disabled,
  onCommit,
}: TvSlideDurationInputProps) {
  const [draft, setDraft] = useState(String(value))
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)
  const valueRef = useRef(value)
  const commitRef = useRef(onCommit)
  const errorId = `${id}-duration-error`

  useEffect(() => {
    valueRef.current = value
    setDraft(String(value))
    setError(null)
  }, [value])

  useEffect(() => {
    commitRef.current = onCommit
  }, [onCommit])

  useEffect(() => () => clearTimer(), [])

  function clearTimer() {
    if (timerRef.current === null) return
    window.clearTimeout(timerRef.current)
    timerRef.current = null
  }

  function commitDraft(nextDraft: string) {
    const durationSeconds = parseTvSlideDuration(nextDraft)
    if (durationSeconds === null) {
      setError(durationError)
      return
    }

    setError(null)
    if (durationSeconds !== valueRef.current) {
      commitRef.current(durationSeconds)
    }
  }

  function scheduleCommit(nextDraft: string) {
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      commitDraft(nextDraft)
    }, DURATION_DEBOUNCE_MS)
  }

  return (
    <div className="grid min-h-14 content-start gap-1">
      <Input
        id={id}
        className={cn(
          "h-9 w-20 border-white/20 bg-black/30 text-center font-mono text-sm tabular-nums text-white placeholder:text-white/35",
          "focus-visible:border-[#9ad0b0]/70 focus-visible:ring-[#9ad0b0]/25",
          error && "border-red-400/80 ring-3 ring-red-400/20 focus-visible:border-red-400/80 focus-visible:ring-red-400/25"
        )}
        aria-label={label}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        disabled={disabled}
        inputMode="numeric"
        maxLength={3}
        value={draft}
        onBlur={() => {
          clearTimer()
          commitDraft(draft)
        }}
        onChange={(event) => {
          const nextDraft = event.target.value
          setDraft(nextDraft)
          setError(null)
          scheduleCommit(nextDraft)
        }}
      />
      <p
        id={errorId}
        className="m-0 h-4 text-[11px] font-bold leading-4 text-red-300"
        role={error ? "alert" : undefined}
      >
        {error ?? "\u00a0"}
      </p>
    </div>
  )
}
