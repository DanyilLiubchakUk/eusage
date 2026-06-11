import { ProviderCard } from "@/components/provider-card"
import { ProviderMetricLines } from "@/components/provider-metric-lines"
import type { LocalProviderAccount } from "@/lib/provider-account-registry"
import type { PluginDisplayState } from "@/lib/plugin-types"
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

  if (providerAccounts.length === 0) {
    return <ProviderCard {...cardProps} />
  }

  return (
    <ProviderCard {...cardProps}>
      {({ now, refreshing }) =>
        visibleProviderAccounts.length > 0 ? (
          <div className="space-y-3">
            {visibleProviderAccounts.map((account, index) => (
              <section
                key={account.localAccountFingerprint}
                className={index === 0 ? "pt-1" : "border-t pt-3"}
              >
                <h3 className="mb-2 truncate text-sm font-semibold">
                  {account.label}
                </h3>
                <ProviderMetricLines
                  lines={lines}
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
        ) : (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No visible Provider Accounts
          </div>
        )
      }
    </ProviderCard>
  )
}
