import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { Info } from "lucide-react"
import {
  formatTimestamp,
  type AvailableMetricRow,
  type DeveloperLeaderboardRow,
  type ProviderBreakdownRow,
  type ProviderStatusRow,
  type RecentSyncRow,
} from "./admin-overview-data"
import { formatCount, formatProviderName, formatUsd } from "./dashboard-formatting"

export function DashboardPanel({
  title,
  meta,
  children,
  height = "medium",
}: {
  title: string
  meta: string
  children: ReactNode
  height?: "short" | "medium" | "tall" | "chart"
}) {
  return (
    <section className={`admin-panel admin-panel-${height}`} aria-label={title}>
      <div className="admin-panel-header">
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <div className="admin-panel-body">{children}</div>
    </section>
  )
}

export function ProviderBreakdownList({ rows }: { rows: ProviderBreakdownRow[] }) {
  if (rows.length === 0) return null

  return (
    <ul className="admin-provider-list">
      {rows.map((row) => (
        <li key={row.providerId}>
          <span>{row.providerName}</span>
          <strong>{row.label}</strong>
        </li>
      ))}
    </ul>
  )
}

export function DeveloperLeaderboardTable({
  rows,
  compact = false,
}: {
  rows: DeveloperLeaderboardRow[]
  compact?: boolean
}) {
  return (
    <table className="admin-compact-table">
      <thead>
        <tr>
          <th>Developer</th>
          <th>Usage</th>
          {!compact && <th>Providers</th>}
          <th>Last update</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <NoDataRow colSpan={compact ? 3 : 4} label="No developer usage yet" />
        ) : (
          rows.map((row) => (
            <tr key={row.developerId}>
              <td>
                <strong>{row.developerName}</strong>
                <span>{row.developerStatus}</span>
              </td>
              <td>
                <strong>{formatCount(row.tokensTotal)} tokens</strong>
                <span>{formatUsd(row.estimatedCostUsd)} · {formatCount(row.creditsUsed)} credits</span>
              </td>
              {!compact && <td>{row.providerCount}</td>}
              <td>{formatTimestamp(row.latestUpdatedAt)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

export function SyncHealthPanel({ rows }: { rows: RecentSyncRow[] }) {
  if (rows.length === 0) return <p className="admin-empty-row">No device sync rows yet</p>

  return (
    <ul className="admin-sync-list">
      {rows.slice(0, 4).map((row) => (
        <li key={`${row.developerName}:${row.deviceName}`}>
          <strong>{row.developerName}</strong>
          <span>
            {row.deviceName} · {row.status} · {formatTimestamp(row.lastContactAt)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function ProviderStatusTable({ rows }: { rows: ProviderStatusRow[] }) {
  return (
    <table className="admin-compact-table">
      <thead>
        <tr>
          <th>Provider</th>
          <th>Usage</th>
          <th>Quota</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <NoDataRow colSpan={4} label="No providers visible" />
        ) : (
          rows.map((row) => (
            <tr key={row.providerId}>
              <td>
                <strong>{formatProviderName(row.providerId)}</strong>
              </td>
              <td>{row.value}</td>
              <td>{row.quota}</td>
              <td>
                <strong>{row.status}</strong>
                <span>{formatTimestamp(row.lastUpdatedAt)}</span>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

export function RecentSyncsTable({ rows }: { rows: RecentSyncRow[] }) {
  return (
    <table className="admin-compact-table">
      <thead>
        <tr>
          <th>Developer</th>
          <th>Device</th>
          <th>Status</th>
          <th>Last contact</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <NoDataRow colSpan={4} label="No device sync rows yet" />
        ) : (
          rows.map((row) => (
            <tr key={`${row.developerName}:${row.deviceName}`}>
              <td>{row.developerName}</td>
              <td>{row.deviceName}</td>
              <td>{row.status}</td>
              <td>{formatTimestamp(row.lastContactAt)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

export function AvailableMetricsTable({ rows }: { rows: AvailableMetricRow[] }) {
  return (
    <table className="admin-compact-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
          <th>Source</th>
          <th>Status</th>
          <th>Info</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.metric}>
            <td>{row.metric}</td>
            <td>
              <strong>{row.value}</strong>
            </td>
            <td>{row.source}</td>
            <td>{row.status}</td>
            <td>
              <MetricInfo row={row} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ClearTeamDataPanel({
  onClearTeamData,
}: {
  onClearTeamData?: () => Promise<{ deleted: Record<string, number> }> | void
}) {
  const [status, setStatus] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleClick() {
    if (!onClearTeamData || isDeleting) return

    const confirmed = window.confirm(
      "Delete Developers, Tokens, Devices, Usage, Providers, Raw payloads, and Sync errors? This cannot be undone."
    )
    if (!confirmed) return

    setIsDeleting(true)
    setStatus(null)
    try {
      const result = await onClearTeamData()
      const total = Object.values(result?.deleted ?? {}).reduce((sum, count) => sum + count, 0)
      setStatus(`Deleted ${formatCount(total)} rows.`)
    } catch (error) {
      console.error(error)
      setStatus("Delete failed.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="admin-data-reset">
      <p className="admin-helper-text">
        Deletes: Developers, Tokens, Devices, Usage, Providers, Raw payloads, Sync errors.
      </p>
      <button type="button" disabled={!onClearTeamData || isDeleting} onClick={() => void handleClick()}>
        {isDeleting ? "Deleting..." : "Delete data"}
      </button>
      {status ? <span>{status}</span> : null}
    </div>
  )
}

function MetricInfo({ row }: { row: AvailableMetricRow }) {
  const tooltipId = useId()
  const tooltipRef = useRef<HTMLSpanElement | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties>({})

  function showTooltip(target: HTMLElement) {
    const tooltip = tooltipRef.current
    if (!tooltip) return

    const rect = target.getBoundingClientRect()
    const width = 352
    const left = Math.min(window.innerWidth - width - 16, Math.max(16, rect.right - width))
    const opensAbove = rect.top > 150
    setTooltipStyle({
      left,
      top: opensAbove ? rect.top - 10 : rect.bottom + 10,
      transform: opensAbove ? "translateY(-100%)" : "translateY(0)",
    })
    if ("showPopover" in tooltip) tooltip.showPopover()
  }

  function hideTooltip() {
    const tooltip = tooltipRef.current
    if (tooltip && "hidePopover" in tooltip) tooltip.hidePopover()
  }

  return (
    <span className="admin-metric-tooltip-wrap">
      <button
        className="admin-metric-info"
        type="button"
        aria-label={row.tooltip}
        aria-describedby={tooltipId}
        onFocus={(event) => showTooltip(event.currentTarget)}
        onBlur={hideTooltip}
        onMouseEnter={(event) => showTooltip(event.currentTarget)}
        onMouseLeave={hideTooltip}
      >
        <Info size={14} aria-hidden="true" />
      </button>
      <span
        className="admin-metric-tooltip"
        id={tooltipId}
        ref={tooltipRef}
        role="tooltip"
        popover="manual"
        style={tooltipStyle}
      >
        {row.tooltip}
      </span>
    </span>
  )
}

function NoDataRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="admin-empty-row">
        {label}
      </td>
    </tr>
  )
}
