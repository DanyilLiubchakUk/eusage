import type { CSSProperties } from "react"
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
      <div className="admin-cursor-pool">
        <p className="admin-empty-row">No Cursor pool data yet</p>
        <span className="admin-helper-text">
          {pool.coverage.label}. eUsage uses Cursor pooled fields first, then Team
          On-Demand limits from synced Cursor rows.
        </span>
      </div>
    )
  }

  return (
    <div className="admin-cursor-pool">
      <div
        className="admin-cursor-pool-bar"
        style={{ "--cursor-pool-used": width } as CSSProperties}
        aria-label={`${Math.round(usedPercent)} percent used`}
      >
        <span />
      </div>
      <div className="admin-cursor-pool-values">
        <strong>{formatUsd(pool.remainingUsd)} remaining</strong>
        <span>
          {formatUsd(pool.usedUsd)} used of {formatUsd(pool.limitUsd)} · {pool.label}
        </span>
      </div>
    </div>
  )
}
