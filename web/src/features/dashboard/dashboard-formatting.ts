import type { UsageSnapshotSourceRow } from "../../lib/metrics"

type ProviderTotalLike = {
  providerId: string
  tokensTotal: number
  creditsUsed?: number
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercentDelta(value: number | null) {
  if (value === null) return "No comparison"
  const rounded = Math.round(value * 10) / 10
  return `${rounded > 0 ? "+" : ""}${rounded}%`
}

export function formatProviderRows(rows: UsageSnapshotSourceRow[]) {
  if (rows.length === 0) return "No data yet"
  return rows.map(formatProviderRow).join(" | ")
}

export function formatProviderBreakdown(providers: ProviderTotalLike[]) {
  if (providers.length === 0) return "No data yet"
  return providers
    .map((provider) => `${formatProviderName(provider.providerId)} ${formatProviderTotal(provider)}`)
    .join(", ")
}

function formatProviderTotal(provider: ProviderTotalLike) {
  if (provider.tokensTotal > 0) return formatCount(provider.tokensTotal)
  const credits = numberOrNull(provider.creditsUsed)
  if (credits !== null && credits > 0) return `${formatCount(credits)} credits`
  return "synced"
}

function formatProviderRow(row: UsageSnapshotSourceRow) {
  if (row.providerId === "claude") {
    return `Claude: ${formatClaudeDeveloperUsage(row)}`
  }
  if (row.providerId === "cursor") {
    return `Cursor: ${formatCursorDeveloperBudget(row)}`
  }
  if (row.providerId === "codex") {
    return `Codex: ${formatCodexDeveloperUsage(row)}`
  }
  if (row.providerId === "jetbrains-ai-assistant") {
    return `JetBrains AI Assistant: ${formatJetBrainsDeveloperUsage(row)}`
  }
  return `${formatProviderName(row.providerId)}: ${formatGenericProviderUsage(row)}`
}

function formatCursorDeveloperBudget(row: UsageSnapshotSourceRow | undefined) {
  const cursor = row?.summary.provider?.cursor
  if (!cursor) return "No data yet"

  const pooledLimit = numberOrNull(cursor.pooledLimitUsd)
  if (pooledLimit !== null && pooledLimit > 0) {
    const used = numberOrNull(cursor.pooledUsedUsd) ?? 0
    const remaining = numberOrNull(cursor.pooledRemainingUsd) ?? pooledLimit - used
    return `Shared ${formatUsd(remaining)} remaining`
  }

  const individualLimit = numberOrNull(cursor.individualLimitUsd)
  if (individualLimit !== null && individualLimit > 0) {
    const used = numberOrNull(cursor.individualUsedUsd)
    const remaining =
      numberOrNull(cursor.individualRemainingUsd) ??
      (used === null ? null : individualLimit - used)
    return `Individual ${formatUsd(remaining ?? 0)} remaining`
  }

  return "No budget data"
}

function formatClaudeDeveloperUsage(row: UsageSnapshotSourceRow) {
  const claude = row.summary.provider?.claude
  if (!claude) return "No data yet"

  const parts = []
  const session = numberOrNull(claude.sessionUsedPercent)
  const weekly = numberOrNull(claude.weeklyUsedPercent)
  const tokens = numberOrNull(row.summary.tokensTotal ?? claude.todayTokens)
  const cost = numberOrNull(row.summary.estimatedCostUsd ?? claude.todayEstimatedCostUsd)
  const extraUsed = numberOrNull(claude.extraUsageUsedUsd)
  const extraLimit = numberOrNull(claude.extraUsageMonthlyLimitUsd)
  if (session !== null) parts.push(`Session ${Math.round(session)}%`)
  if (weekly !== null) parts.push(`Weekly ${Math.round(weekly)}%`)
  if (tokens !== null) parts.push(`${formatCount(tokens)} tokens today`)
  if (cost !== null) parts.push(`${formatUsd(cost)} today`)
  if (extraUsed !== null && extraLimit !== null && extraLimit > 0) {
    parts.push(`${formatUsd(extraUsed)}/${formatUsd(extraLimit)} extra`)
  } else if (extraUsed !== null) {
    parts.push(`${formatUsd(extraUsed)} extra`)
  }
  return parts.length > 0 ? parts.join(", ") : "No usage data"
}

function formatCodexDeveloperUsage(row: UsageSnapshotSourceRow) {
  const codex = row.summary.provider?.codex
  if (!codex) return "No data yet"

  const parts = []
  const session = numberOrNull(codex.sessionUsedPercent)
  const weekly = numberOrNull(codex.weeklyUsedPercent)
  const tokens = numberOrNull(row.summary.tokensTotal ?? codex.todayTokens)
  const credits = numberOrNull(row.summary.creditsRemaining ?? codex.creditsRemaining)
  if (session !== null) parts.push(`Session ${Math.round(session)}%`)
  if (weekly !== null) parts.push(`Weekly ${Math.round(weekly)}%`)
  if (tokens !== null) parts.push(`${formatCount(tokens)} tokens today`)
  if (credits !== null) parts.push(`${formatCount(credits)} credits`)
  return parts.length > 0 ? parts.join(", ") : "No usage data"
}

function formatJetBrainsDeveloperUsage(row: UsageSnapshotSourceRow) {
  const jetbrains = row.summary.provider?.["jetbrains-ai-assistant"]
  if (!jetbrains) return "No data yet"

  const parts = []
  const quota = numberOrNull(row.summary.quotaPercent ?? jetbrains.quotaUsedPercent)
  const remaining = numberOrNull(row.summary.creditsRemaining ?? jetbrains.quotaRemaining)
  const used = numberOrNull(row.summary.creditsUsed ?? jetbrains.quotaUsed)
  const limit = numberOrNull(jetbrains.quotaLimit)
  if (quota !== null) parts.push(`${Math.round(quota)}% quota`)
  if (remaining !== null) parts.push(`${formatCount(remaining)} credits remaining`)
  if (used !== null && limit !== null) parts.push(`${formatCount(used)}/${formatCount(limit)} credits`)
  return parts.length > 0 ? parts.join(", ") : "No quota data"
}

function formatGenericProviderUsage(row: UsageSnapshotSourceRow) {
  const tokens = numberOrNull(row.summary.tokensTotal)
  const cost = numberOrNull(row.summary.estimatedCostUsd)
  const quota = numberOrNull(row.summary.quotaPercent)
  if (tokens !== null) return `${formatCount(tokens)} tokens`
  if (cost !== null) return `${formatUsd(cost)} estimated cost`
  if (quota !== null) return `${Math.round(quota)}% quota`
  return "Synced"
}

function formatProviderName(providerId: string) {
  if (providerId === "claude") return "Claude"
  if (providerId === "codex") return "Codex"
  if (providerId === "cursor") return "Cursor"
  if (providerId === "jetbrains-ai-assistant") return "JetBrains AI Assistant"
  return providerId
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}
