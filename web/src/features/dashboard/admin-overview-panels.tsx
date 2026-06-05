import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
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
  className,
}: {
  title: string
  meta: string
  children: ReactNode
  height?: "compact" | "short" | "medium" | "tall" | "chart"
  className?: string
}) {
  const compact = height === "compact"

  return (
    <Card
      className={cn(
        compact ? "min-w-0" : "h-full min-w-0",
        compact ? "overflow-visible" : "overflow-hidden",
        panelHeightClass[height],
        className
      )}
      size={compact ? "sm" : "default"}
      role="region"
      aria-label={title}
    >
      <CardContent className={cn("flex min-h-0 flex-1 flex-col", compact ? "gap-3" : "gap-4")}>
        <div className="flex shrink-0 items-start justify-between gap-4">
          <strong className="min-w-0 text-base text-foreground">{title}</strong>
          <span className="max-w-[55%] break-words text-right text-sm text-muted-foreground">{meta}</span>
        </div>
        <div
          className={cn(
            "min-h-0 flex-1",
            compact ? "overflow-visible" : "overflow-y-auto overscroll-contain pr-1"
          )}
        >
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

const panelHeightClass = {
  compact: "min-h-32 max-h-48",
  short: "min-h-40 max-h-64",
  medium: "min-h-72 max-h-[26rem]",
  tall: "min-h-[22rem] max-h-[34rem]",
  chart: "min-h-[30rem] max-h-[42rem]",
}

export function ProviderBreakdownList({ rows }: { rows: ProviderBreakdownRow[] }) {
  if (rows.length === 0) return null

  return (
    <ul className="m-0 mt-3 grid list-none gap-2 p-0">
      {rows.map((row) => (
        <li
          key={row.providerId}
          className="flex items-center justify-between gap-3 rounded-md bg-muted/60 px-3 py-2"
        >
          <span className="text-muted-foreground">{row.providerName}</span>
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Developer</TableHead>
          <TableHead>Usage</TableHead>
          {!compact && <TableHead>Providers</TableHead>}
          <TableHead>Last update</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <NoDataRow colSpan={compact ? 3 : 4} label="No developer usage yet" />
        ) : (
          rows.map((row) => (
            <TableRow key={row.developerId}>
              <TableCell className="align-top">
                <strong className="block">{row.developerName}</strong>
                <span className="mt-1 block text-muted-foreground">{row.developerStatus}</span>
              </TableCell>
              <TableCell className="align-top">
                <strong className="block">{formatCount(row.tokensTotal)} tokens</strong>
                <span className="mt-1 block text-muted-foreground">
                  {formatUsd(row.estimatedCostUsd)} · {formatCount(row.creditsUsed)} credits
                </span>
              </TableCell>
              {!compact && <TableCell className="align-top">{row.providerCount}</TableCell>}
              <TableCell className="align-top">{formatTimestamp(row.latestUpdatedAt)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

export function SyncHealthPanel({ rows }: { rows: RecentSyncRow[] }) {
  if (rows.length === 0) return <p className="admin-empty-row m-0 text-muted-foreground">No device sync rows yet</p>

  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {rows.map((row) => (
        <li key={`${row.developerName}:${row.deviceName}`} className="grid gap-1 rounded-md bg-muted/60 p-3">
          <strong>{row.developerName}</strong>
          <span className="text-muted-foreground">
            {row.deviceName} · {row.status} · {formatTimestamp(row.lastContactAt)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function ProviderStatusTable({ rows }: { rows: ProviderStatusRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Provider</TableHead>
          <TableHead>Usage</TableHead>
          <TableHead>Quota</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <NoDataRow colSpan={4} label="No providers visible" />
        ) : (
          rows.map((row) => (
            <TableRow key={row.providerId}>
              <TableCell className="align-top">
                <strong>{formatProviderName(row.providerId)}</strong>
              </TableCell>
              <TableCell className="align-top">{row.value}</TableCell>
              <TableCell className="align-top">{row.quota}</TableCell>
              <TableCell className="align-top">
                <strong className="block">{row.status}</strong>
                <span className="mt-1 block text-muted-foreground">{formatTimestamp(row.lastUpdatedAt)}</span>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

export function RecentSyncsTable({ rows }: { rows: RecentSyncRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Developer</TableHead>
          <TableHead>Device</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last contact</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <NoDataRow colSpan={4} label="No device sync rows yet" />
        ) : (
          rows.map((row) => (
            <TableRow key={`${row.developerName}:${row.deviceName}`}>
              <TableCell>{row.developerName}</TableCell>
              <TableCell>{row.deviceName}</TableCell>
              <TableCell>{row.status}</TableCell>
              <TableCell>{formatTimestamp(row.lastContactAt)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

export function AvailableMetricsTable({ rows }: { rows: AvailableMetricRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Metric</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Info</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.metric}>
            <TableCell>{row.metric}</TableCell>
            <TableCell>
              <strong>{row.value}</strong>
            </TableCell>
            <TableCell>{row.source}</TableCell>
            <TableCell>{row.status}</TableCell>
            <TableCell>
              <MetricInfo row={row} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
    <div className="grid gap-2">
      <p className="m-0 text-sm text-muted-foreground">
        Deletes: Developers, Tokens, Devices, Usage, Providers, Raw payloads, Sync errors.
      </p>
      <Button
        className="w-fit"
        variant="destructive"
        type="button"
        disabled={!onClearTeamData || isDeleting}
        onClick={() => void handleClick()}
      >
        {isDeleting ? "Deleting..." : "Delete data"}
      </Button>
      {status ? <span className="text-sm text-muted-foreground">{status}</span> : null}
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
    <span>
      <Button
        className="rounded-full"
        size="icon-xs"
        variant="outline"
        type="button"
        aria-label={row.tooltip}
        aria-describedby={tooltipId}
        onFocus={(event) => showTooltip(event.currentTarget)}
        onBlur={hideTooltip}
        onMouseEnter={(event) => showTooltip(event.currentTarget)}
        onMouseLeave={hideTooltip}
      >
        <Info size={14} aria-hidden="true" />
      </Button>
      <span
        className="fixed z-50 max-h-48 w-[min(352px,calc(100vw-2rem))] overflow-y-auto whitespace-normal break-words rounded-md border bg-popover p-3 text-sm leading-5 text-popover-foreground shadow-lg"
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
    <TableRow>
      <TableCell colSpan={colSpan} className="admin-empty-row py-8 text-center text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  )
}
