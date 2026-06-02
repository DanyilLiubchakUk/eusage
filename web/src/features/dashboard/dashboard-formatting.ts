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

export function formatPercent(value: number) {
  return `${Math.round(value)}%`
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

export function formatProviderName(providerId: string) {
  if (providerId === "claude") return "Claude"
  if (providerId === "codex") return "Codex"
  if (providerId === "cursor") return "Cursor"
  if (providerId === "jetbrains-ai-assistant") return "JetBrains AI Assistant"
  return providerId
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}
