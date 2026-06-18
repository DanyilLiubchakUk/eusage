import { ProviderCard } from "@/components/provider-card"
import { ProviderMetricLines } from "@/components/provider-metric-lines"
import type { LocalProviderAccount } from "@/lib/provider-account-registry"
import type { MetricLine, PluginDisplayState } from "@/lib/plugin-types"
import type { DisplayMode, ResetTimerDisplayMode, TimeFormatMode } from "@/lib/settings"

interface ProviderDetailPageProps {
  plugin: PluginDisplayState | null
  providerAccounts?: LocalProviderAccount[]
  onRetry?: () => void
  displayMode: DisplayMode
  resetTimerDisplayMode: ResetTimerDisplayMode
  timeFormatMode?: TimeFormatMode
  onResetTimerDisplayModeToggle?: () => void
}

export function ProviderDetailPage({
  plugin,
  providerAccounts = [],
  onRetry,
  displayMode,
  resetTimerDisplayMode,
  timeFormatMode = "auto",
  onResetTimerDisplayModeToggle,
}: ProviderDetailPageProps) {
  if (!plugin) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Provider not found
      </div>
    )
  }

  const visibleProviderAccounts = providerAccounts.filter(
    (account) =>
      account.detectionState === "detected" &&
      account.visibility === "visible"
  )
  const lines = plugin.data?.lines ?? []
  const providerAccountOutputs = plugin.data?.providerAccountOutputs ?? []
  const hasAccountBoundOutputs = providerAccountOutputs.length > 0
  const accountBoundLines = new Map<string, typeof lines>()
  for (const output of providerAccountOutputs) {
    if (
      output.localAccountFingerprint &&
      !accountBoundLines.has(output.localAccountFingerprint)
    ) {
      accountBoundLines.set(output.localAccountFingerprint, output.lines)
    }
  }
  const visibleAccountSections = hasAccountBoundOutputs
    ? visibleProviderAccounts.filter((account) =>
        accountBoundLines.has(account.localAccountFingerprint)
      )
    : visibleProviderAccounts

  const cardProps = {
    name: plugin.meta.name,
    plan: plugin.data?.plan,
    links: plugin.meta.links,
    showSeparator: false,
    loading: plugin.loading,
    error: plugin.error,
    lines,
    skeletonLines: plugin.meta.lines,
    lastManualRefreshAt: plugin.lastManualRefreshAt,
    lastUpdatedAt: plugin.lastUpdatedAt,
    onRetry,
    scopeFilter: "all" as const,
    displayMode,
    resetTimerDisplayMode,
    timeFormatMode,
    onResetTimerDisplayModeToggle,
  }

  if (
    providerAccounts.length === 0 ||
    !hasAccountBoundOutputs ||
    visibleAccountSections.length === 0
  ) {
    return <ProviderCard {...cardProps} />
  }

  return (
    <ProviderCard {...cardProps}>
      {({ now, refreshing }) => (
        <div className="space-y-3">
          {hasAccountBoundOutputs && lines.length > 0 && (
            <ProviderMetricLines
              lines={lines}
              displayMode={displayMode}
              resetTimerDisplayMode={resetTimerDisplayMode}
              timeFormatMode={timeFormatMode}
              onResetTimerDisplayModeToggle={onResetTimerDisplayModeToggle}
              now={now}
              refreshing={refreshing}
            />
          )}
          {visibleAccountSections.map((account, index) => (
            <section
              key={account.localAccountFingerprint}
              className={
                index === 0 && !(hasAccountBoundOutputs && lines.length > 0)
                  ? "pt-1"
                  : "border-t pt-3"
              }
            >
              <h3 className="mb-2 truncate text-sm font-semibold">
                {account.label}
              </h3>
              <AccountMetricLines
                lines={
                  hasAccountBoundOutputs
                    ? accountBoundLines.get(account.localAccountFingerprint) ?? []
                    : lines
                }
                emptyText={
                  hasAccountBoundOutputs
                    ? "No account-bound usage"
                    : "No usage data"
                }
                displayMode={displayMode}
                resetTimerDisplayMode={resetTimerDisplayMode}
                timeFormatMode={timeFormatMode}
                onResetTimerDisplayModeToggle={onResetTimerDisplayModeToggle}
                now={now}
                refreshing={refreshing}
              />
            </section>
          ))}
        </div>
      )}
    </ProviderCard>
  )
}

type AccountMetricLinesProps = {
  lines: MetricLine[]
  emptyText: string
  displayMode: DisplayMode
  resetTimerDisplayMode: ResetTimerDisplayMode
  timeFormatMode: TimeFormatMode
  onResetTimerDisplayModeToggle?: () => void
  now: number
  refreshing: boolean
}

function AccountMetricLines({
  lines,
  emptyText,
  displayMode,
  resetTimerDisplayMode,
  timeFormatMode,
  onResetTimerDisplayModeToggle,
  now,
  refreshing,
}: AccountMetricLinesProps) {
  return lines.length > 0 ? (
    <ProviderMetricLines
      lines={lines}
      displayMode={displayMode}
      resetTimerDisplayMode={resetTimerDisplayMode}
      timeFormatMode={timeFormatMode}
      onResetTimerDisplayModeToggle={onResetTimerDisplayModeToggle}
      now={now}
      refreshing={refreshing}
    />
  ) : (
    <div className="py-1 text-xs text-muted-foreground">{emptyText}</div>
  )
}
