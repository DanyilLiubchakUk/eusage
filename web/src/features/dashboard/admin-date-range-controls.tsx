import { useEffect, useState } from "react"
import type { MetricDateRangeInput } from "../../lib/metrics"

type AdminDateRangeControlsProps = {
  value: MetricDateRangeInput
  onChange?: (value: MetricDateRangeInput) => Promise<void> | void
}

const presets = [
  ["last7", "Last 7 days"],
  ["last30", "Last 30 days"],
  ["last90", "Last 90 days"],
  ["allTime", "All time"],
  ["custom", "Custom"],
] as const

export function AdminDateRangeControls({ value, onChange }: AdminDateRangeControlsProps) {
  const [custom, setCustom] = useState(customDays(value))
  const [status, setStatus] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setCustom(customDays(value))
  }, [value])

  async function save(next: MetricDateRangeInput) {
    if (!onChange) return
    setIsSaving(true)
    setStatus(null)
    try {
      await onChange(next)
      setStatus("Saved")
    } catch (error) {
      console.error(error)
      setStatus("Save failed")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="admin-date-range" aria-label="Date range controls">
      <select
        value={value.preset}
        disabled={!onChange || isSaving}
        onChange={(event) => {
          const preset = event.target.value
          if (preset === "custom") {
            void save({ preset, startDay: custom.startDay, endDay: custom.endDay })
            return
          }
          void save({ preset: preset as Exclude<MetricDateRangeInput["preset"], "custom"> })
        }}
      >
        {presets.map(([preset, label]) => (
          <option key={preset} value={preset}>
            {label}
          </option>
        ))}
      </select>

      {value.preset === "custom" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void save({ preset: "custom", startDay: custom.startDay, endDay: custom.endDay })
          }}
        >
          <input
            type="date"
            value={custom.startDay}
            disabled={!onChange || isSaving}
            onChange={(event) => setCustom({ ...custom, startDay: event.target.value })}
          />
          <input
            type="date"
            value={custom.endDay}
            disabled={!onChange || isSaving}
            onChange={(event) => setCustom({ ...custom, endDay: event.target.value })}
          />
          <button type="submit" disabled={!onChange || isSaving}>
            Apply
          </button>
        </form>
      ) : null}

      {status ? <span>{status}</span> : null}
    </div>
  )
}

function customDays(value: MetricDateRangeInput) {
  if (value.preset === "custom") {
    return { startDay: value.startDay, endDay: value.endDay }
  }

  const today = new Date().toISOString().slice(0, 10)
  return { startDay: today, endDay: today }
}
