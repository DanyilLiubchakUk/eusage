import { Check } from "lucide-react"
import { useEffect, useState } from "react"

type AdminReportingTimeZoneControlProps = {
  value: string
  onChange?: (value: string) => Promise<void> | void
}

export function AdminReportingTimeZoneControl({
  value,
  onChange,
}: AdminReportingTimeZoneControlProps) {
  const [draft, setDraft] = useState(value)
  const [status, setStatus] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const hasPendingChange = draft.trim() !== value

  useEffect(() => {
    setDraft(value)
  }, [value])

  async function save() {
    if (!onChange || !draft.trim() || !hasPendingChange) return
    setIsSaving(true)
    setStatus(null)
    try {
      await onChange(draft.trim())
      setStatus("Saved")
    } catch (error) {
      console.error(error)
      setStatus("Save failed")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      className="admin-reporting-time-zone"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <label>
        <span className="setup-label">Reporting timezone</span>
        <input
          value={draft}
          disabled={!onChange || isSaving}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>
      <button
        className={`admin-date-range-apply${hasPendingChange ? " admin-date-range-apply-pending" : ""}`}
        type="submit"
        aria-label={
          hasPendingChange ? "Apply pending reporting timezone" : "Apply reporting timezone"
        }
        title={hasPendingChange ? "Apply pending reporting timezone" : "Apply reporting timezone"}
        disabled={!onChange || isSaving || !draft.trim() || !hasPendingChange}
      >
        <Check size={15} aria-hidden="true" />
      </button>
      {status ? <span>{status}</span> : null}
    </form>
  )
}
