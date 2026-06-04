import { Check } from "lucide-react"
import { useEffect, useState } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type AdminReportingTimeZoneControlProps = {
  value: string
  onChange?: (value: string) => Promise<void> | void
}

const REPORTING_TIME_ZONE_MAX_LENGTH = 64

export function AdminReportingTimeZoneControl({
  value,
  onChange,
}: AdminReportingTimeZoneControlProps) {
  const helperId = "admin-reporting-time-zone-help"
  const errorId = "admin-reporting-time-zone-error"
  const [draft, setDraft] = useState(value)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const hasPendingChange = draft.trim() !== value

  useEffect(() => {
    setDraft(value)
  }, [value])

  async function save() {
    if (!onChange || !hasPendingChange) return

    const validation = reportingTimeZoneFormSchema.safeParse({
      reportingTimeZone: draft,
    })
    if (!validation.success) {
      setError(reportingTimeZoneFormError(validation.error))
      return
    }

    setIsSaving(true)
    setStatus(null)
    setError(null)
    try {
      await onChange(validation.data.reportingTimeZone)
    } catch (error) {
      console.error(error)
      setStatus("Save failed")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <label className="grid gap-2">
        <span className="text-xs font-extrabold uppercase tracking-wide text-primary">Reporting timezone</span>
        <Input
          value={draft}
          disabled={!onChange || isSaving}
          autoComplete="off"
          maxLength={REPORTING_TIME_ZONE_MAX_LENGTH}
          aria-describedby={error ? `${helperId} ${errorId}` : helperId}
          aria-invalid={Boolean(error)}
          placeholder="America/New_York"
          spellCheck={false}
          onChange={(event) => {
            setDraft(event.target.value)
            setError(null)
          }}
        />
      </label>
      <Button
        className={cn("w-fit", hasPendingChange && "admin-date-range-apply-pending ring-2 ring-primary/30")}
        size="icon-sm"
        variant={hasPendingChange ? "default" : "outline"}
        type="submit"
        aria-label={
          hasPendingChange ? "Apply pending reporting timezone" : "Apply reporting timezone"
        }
        title={hasPendingChange ? "Apply pending reporting timezone" : "Apply reporting timezone"}
        disabled={!onChange || isSaving || !hasPendingChange}
      >
        <Check size={15} aria-hidden="true" />
      </Button>
      <p id={helperId} className="m-0 text-sm text-muted-foreground">
        Use IANA names. Examples: America/New_York, America/Los_Angeles.
      </p>
      {error ? (
        <span id={errorId} className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive" role="alert">
          {error}
        </span>
      ) : null}
      {status ? <span className="text-sm text-destructive">{status}</span> : null}
    </form>
  )
}

const reportingTimeZoneFormSchema = z.object({
  reportingTimeZone: z.string()
    .trim()
    .min(1, "Reporting timezone is required.")
    .max(REPORTING_TIME_ZONE_MAX_LENGTH, "Use 64 characters or fewer.")
    .refine(isValidReportingTimeZone, "Enter a valid IANA timezone."),
})

type ReportingTimeZoneFormInput = z.infer<typeof reportingTimeZoneFormSchema>

function reportingTimeZoneFormError(error: z.ZodError<ReportingTimeZoneFormInput>) {
  return error.issues[0]?.message ?? "Check the reporting timezone."
}

function isValidReportingTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value })
    return true
  } catch {
    return false
  }
}
