import { Check, ChevronDown } from "lucide-react"
import { useEffect, useState } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { MetricDateRangeInput } from "../../lib/metrics"
import type { DashboardDateRangeBounds } from "./dashboard-date-range-bounds"

type AdminDateRangeControlsProps = {
  value: MetricDateRangeInput
  bounds?: DashboardDateRangeBounds
  onChange?: (value: MetricDateRangeInput) => Promise<void> | void
  variant?: "default" | "tv"
}

const presets = [
  ["last7", "Last 7 days"],
  ["last30", "Last 30 days"],
  ["last90", "Last 90 days"],
  ["allTime", "All time"],
  ["custom", "Custom"],
] as const

export function AdminDateRangeControls({
  value,
  bounds,
  onChange,
  variant = "default",
}: AdminDateRangeControlsProps) {
  const dateBounds = bounds ?? defaultDateBounds()
  const isTv = variant === "tv"
  const [custom, setCustom] = useState(customDays(value))
  const [status, setStatus] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const formErrorId = "admin-custom-date-range-error"
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
    setFormError(null)
    setCustom(nextCustom)
  }

  function saveCustomDraft(nextCustom = custom) {
    const validation = customDateRangeFormSchema(dateBounds).safeParse(nextCustom)
    if (!validation.success) {
      setFormError(customDateRangeFormError(validation.error))
      return
    }

    setFormError(null)
    const next = normalizeCustomDays(validation.data, dateBounds)
    setCustom(next)
    void save({ preset: "custom", ...next })
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", isTv && "rounded-lg border border-white/10 bg-white/5 p-2")} aria-label="Date range controls">
      <div className="relative inline-flex">
        <select
          className={cn(
            "h-9 appearance-none rounded-md border border-input bg-background py-0 pr-9 pl-3 text-sm font-semibold text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
            isTv && "border-white/20 bg-black/30 text-white [color-scheme:dark] focus-visible:border-[#9ad0b0]/70 focus-visible:ring-[#9ad0b0]/25"
          )}
          value={value.preset}
          aria-label="Date range"
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
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground",
            isTv && "text-white/70"
          )}
        />
      </div>

      {value.preset === "custom" ? (
        <form
          className="flex flex-wrap items-center gap-2"
          aria-label="Custom date range"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            saveCustomDraft()
          }}
        >
          <Input
            className={cn("w-36", isTv && "border-white/20 bg-black/30 text-white [color-scheme:dark] focus-visible:border-[#9ad0b0]/70 focus-visible:ring-[#9ad0b0]/25")}
            aria-label="Custom start date"
            type="date"
            value={custom.startDay}
            min={dateBounds.minDay}
            max={minDay(custom.endDay, dateBounds.maxDay)}
            disabled={!onChange || isSaving}
            placeholder="Start date"
            aria-invalid={Boolean(formError)}
            aria-describedby={formError ? formErrorId : undefined}
            onChange={(event) =>
              setCustomDraft({ ...custom, startDay: event.target.value })
            }
          />
          <Input
            className={cn("w-36", isTv && "border-white/20 bg-black/30 text-white [color-scheme:dark] focus-visible:border-[#9ad0b0]/70 focus-visible:ring-[#9ad0b0]/25")}
            aria-label="Custom end date"
            type="date"
            value={custom.endDay}
            min={maxDay(custom.startDay, dateBounds.minDay)}
            max={dateBounds.maxDay}
            disabled={!onChange || isSaving}
            placeholder="End date"
            aria-invalid={Boolean(formError)}
            aria-describedby={formError ? formErrorId : undefined}
            onChange={(event) =>
              setCustomDraft({ ...custom, endDay: event.target.value })
            }
          />
          <Button
            className={cn(
              hasPendingCustom && "admin-date-range-apply-pending ring-2 ring-primary/30",
              isTv && "border-white/20 bg-white/10 text-white hover:bg-white/20"
            )}
            size="icon-sm"
            variant={hasPendingCustom ? "default" : "outline"}
            type="submit"
            aria-label={hasPendingCustom ? "Apply pending custom date range" : "Apply custom date range"}
            title={hasPendingCustom ? "Apply pending custom date range" : "Apply custom date range"}
            disabled={!onChange || isSaving}
          >
            <Check size={15} aria-hidden="true" />
          </Button>
          {formError ? (
            <span id={formErrorId} className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive" role="alert">
              {formError}
            </span>
          ) : null}
        </form>
      ) : null}

      {status ? <span className="text-sm text-destructive" role="alert">{status}</span> : null}
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

function customDateRangeFormSchema(bounds: DashboardDateRangeBounds) {
  return z.object({
    startDay: z.string().refine(isDayValue, "Enter a valid start date."),
    endDay: z.string().refine(isDayValue, "Enter a valid end date."),
  }).superRefine((value, context) => {
    if (!isDayValue(value.startDay) || !isDayValue(value.endDay)) return
    if (value.endDay < value.startDay) {
      context.addIssue({
        code: "custom",
        path: ["endDay"],
        message: "End date must be on or after start date.",
      })
    }
    if (value.startDay < bounds.minDay || value.endDay > bounds.maxDay) {
      context.addIssue({
        code: "custom",
        message: "Choose dates inside the available data range.",
      })
    }
  })
}

type CustomDateRangeFormInput = z.infer<ReturnType<typeof customDateRangeFormSchema>>

function customDateRangeFormError(error: z.ZodError<CustomDateRangeFormInput>) {
  return error.issues[0]?.message ?? "Check the custom date range."
}
