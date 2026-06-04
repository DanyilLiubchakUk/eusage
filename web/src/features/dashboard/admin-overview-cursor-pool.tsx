import type { buildAdminOverviewModel } from "./admin-overview-data"
import { formatUsd } from "./dashboard-formatting"

type CursorPoolPanelProps = {
  pool: ReturnType<typeof buildAdminOverviewModel>["cursorPool"]
}

export function CursorPoolPanel({ pool }: CursorPoolPanelProps) {
  const usedPercent = pool.available && pool.limitUsd > 0 ? (pool.usedUsd / pool.limitUsd) * 100 : 0
  const width = `${Math.max(0, Math.min(100, usedPercent))}%`

  if (!pool.available) {
    return (
      <div className="grid gap-3">
        <p className="admin-empty-row m-0 text-muted-foreground">No Cursor budget data yet</p>
        <span className="text-sm text-muted-foreground">
          {pool.coverage.label}. eUsage uses Cursor pooled fields first, then Team
          On-Demand budget from synced Cursor rows.
        </span>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <div
        className="h-4 overflow-hidden rounded-full bg-muted"
        aria-label={`${Math.round(usedPercent)} percent used`}
      >
        <span className="block h-full rounded-full bg-primary" style={{ width }} />
      </div>
      <div className="grid gap-1">
        <strong className="text-foreground">{formatUsd(pool.remainingUsd)} remaining</strong>
        <span className="text-sm text-muted-foreground">
          {formatUsd(pool.usedUsd)} used of {formatUsd(pool.limitUsd)} · {pool.label}
        </span>
      </div>
    </div>
  )
}
