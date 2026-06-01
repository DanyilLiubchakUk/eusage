import { X } from "lucide-react"

type WindowsTrayGuidanceProps = {
  onDismiss: () => void
}

export function WindowsTrayGuidance({ onDismiss }: WindowsTrayGuidanceProps) {
  return (
    <div className="flex items-start gap-2 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <div className="min-w-0 flex-1 leading-snug">
        eUsage lives in the Windows taskbar corner. If it is hidden, open taskbar
        overflow and pin eUsage for faster access.
      </div>
      <button
        type="button"
        aria-label="Dismiss Windows tray guidance"
        onClick={onDismiss}
        className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}
