import { Check } from "lucide-react"
import { useEffect, useState } from "react"
import type { MetricDateRangeInput } from "../../lib/metrics"
import type { DashboardDateRangeBounds } from "./dashboard-date-range-bounds"

type AdminDateRangeControlsProps = {
  value: MetricDateRangeInput
  bounds?: DashboardDateRangeBounds
  onChange?: (value: MetricDateRangeInput) => Promise<void> | void
}

const presets = [
  ["last7", "Last 7 days"],
  ["last30", "Last 30 days"],
  ["last90", "Last 90 days"],
  ["allTime", "All time"],
  ["custom", "Custom"],
] as const

export function AdminDateRangeControls({ value, bounds, onChange }: AdminDateRangeControlsProps) {
  const dateBounds = bounds ?? defaultDateBounds()
  const [custom, setCustom] = useState(customDays(value))
  const [status, setStatus] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const savedCustom = normalizeCustomDays(customDays(value), dateBounds)
  const hasPendingCustom =
    value.preset === "custom" &&
    isDayValue(custom.startDay) &&
    isDayValue(custom.endDay) &&
    (custom.startDay !== savedCustom.startDay || custom.endDay !== savedCustom.endDay)

  useEffect(() => {
    setCustom(normalizeCustomDays(customDays(value), dateBounds))
  }, [value, dateBounds.minDay, dateBounds.maxDay])

  async function save(next: MetricDateRangeInput) {
    if (!onChange) return
    setIsSaving(true)
    setStatus(null)
    try {
      await onChange(next)
    } catch (error) {
      console.error(error)
      setStatus("Save failed")
    } finally {
      setIsSaving(false)
    }
  }

  function setCustomDraft(nextCustom: { startDay: string; endDay: string }) {
    setCustom(nextCustom)
  }

  function saveCustomDraft(nextCustom = custom) {
    if (!isDayValue(nextCustom.startDay) || !isDayValue(nextCustom.endDay)) {
      return
    }

    const next = normalizeCustomDays(nextCustom, dateBounds)
    setCustom(next)
    void save({ preset: "custom", ...next })
  }

  return (
    <div className="admin-date-range" aria-label="Date range controls">
      <select
        value={value.preset}
        disabled={!onChange || isSaving}
        onChange={(event) => {
          const preset = event.target.value
          if (preset === "custom") {
            const next = normalizeCustomDays(custom, dateBounds)
            setCustom(next)
            void save({ preset, ...next })
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
          className="admin-date-range-custom"
          onSubmit={(event) => {
            event.preventDefault()
            saveCustomDraft()
          }}
        >
          <input
            aria-label="Custom start date"
            type="date"
            value={custom.startDay}
            min={dateBounds.minDay}
            max={minDay(custom.endDay, dateBounds.maxDay)}
            disabled={!onChange || isSaving}
            onChange={(event) =>
              setCustomDraft({ ...custom, startDay: event.target.value })
            }
          />
          <input
            aria-label="Custom end date"
            type="date"
            value={custom.endDay}
            min={maxDay(custom.startDay, dateBounds.minDay)}
            max={dateBounds.maxDay}
            disabled={!onChange || isSaving}
            onChange={(event) =>
              setCustomDraft({ ...custom, endDay: event.target.value })
            }
          />
          <button
            className={`admin-date-range-apply${hasPendingCustom ? " admin-date-range-apply-pending" : ""}`}
            type="submit"
            aria-label={hasPendingCustom ? "Apply pending custom date range" : "Apply custom date range"}
            title={hasPendingCustom ? "Apply pending custom date range" : "Apply custom date range"}
            disabled={!onChange || isSaving}
          >
            <Check size={15} aria-hidden="true" />
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

function defaultDateBounds() {
  const today = new Date().toISOString().slice(0, 10)
  return { minDay: today, maxDay: today }
}

function normalizeCustomDays(
  value: { startDay: string; endDay: string },
  bounds: DashboardDateRangeBounds
) {
  const startDay = clampDay(value.startDay, bounds)
  const endDay = maxDay(clampDay(value.endDay, bounds), startDay)
  return { startDay, endDay }
}

function clampDay(day: string, bounds: DashboardDateRangeBounds) {
  if (day < bounds.minDay) return bounds.minDay
  if (day > bounds.maxDay) return bounds.maxDay
  return day
}

function isDayValue(day: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day)
}

function minDay(left: string, right: string) {
  return left < right ? left : right
}

function maxDay(left: string, right: string) {
  return left > right ? left : right
}
