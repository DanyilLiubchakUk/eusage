/**
 * Mock dashboard state for the public landing page hero preview.
 *
 * Token volumes and costs are landing-demo estimates, not billing truth.
 * Public pricing changes often, and "total tokens" can include fresh input,
 * cache writes, cache reads, and output tokens at different rates.
 *
 * The generic mix below treats 5M displayed tokens as roughly:
 *  - 1.00M fresh input
 *  - 0.25M cache write
 *  - 3.00M cache read
 *  - 0.75M output
 *
 * Cursor pool values stay provider-reported dollars in the card. JetBrains
 * uses AI Credits in real data; the token row here is only API-equivalent demo
 * math based on common coding-model rates.
 */

import type { DashboardSourceState } from "../dashboard/dashboard"

const now = Date.UTC(2026, 5, 22, 12)

export const LANDING_COST_ESTIMATE_NOTE =
  "Rough estimate. Real bills depend on model, cache mix, credits, and provider pricing."

const GENERAL_TOKEN_MIX = {
  input: 0.2,
  cacheWrite: 0.05,
  cacheRead: 0.6,
  output: 0.15,
} as const

type ProviderTokenEstimate = {
  providerId: string
  tokensTotal: number
  costPerMInput: number
  costPerMCachedInput?: number
  costPerMCacheWrite?: number
  costPerMCacheRead?: number
  costPerMOutput: number
}

const developers = Array.from({ length: 12 }, (_, i) => {
  const id = `dev-${i + 1}`
  const names = [
    "Alex Chen", "Sam Rivera", "Jordan Lee", "Casey Park",
    "Morgan Wu", "Riley Tan", "Drew Kim", "Avery Singh",
    "Quinn Bauer", "Reese Voss", "Taylor Ito", "Skyler Novak",
  ]
  return {
    id,
    displayName: names[i] ?? `Developer ${i + 1}`,
    status: "active" as const,
    token: {
      fingerprint: `${id.slice(0, 8)}...${(i + 1000).toString(16)}`,
      label: `${names[i]?.split(" ")[0] ?? "Dev"} laptop`,
      status: "active" as const,
      lastUsedAt: now - (i + 1) * 1800_000,
    },
    devices: [
      {
        deviceId: `device-${i + 1}`,
        deviceName: `${names[i]?.split(" ")[0] ?? "Dev"} Mac`,
        os: "macos",
        status: "connected" as const,
        lastSeenAt: now - (i + 1) * 1800_000,
        lastSyncAt: now - (i + 1) * 1800_000,
      },
    ],
  }
})

const PROVIDER_BREAKDOWN = [
  {
    providerId: "cursor",
    tokensTotal: 4_080_000_000,
    // Cursor Composer 2 public rate: cache modeled at input rate for the demo.
    costPerMInput: 0.5,
    costPerMCachedInput: 0.5,
    costPerMOutput: 2.5,
  },
  {
    providerId: "codex",
    tokensTotal: 3_520_000_000,
    // Codex midpoint model for estimates: GPT-5.4 standard API pricing.
    costPerMInput: 2.5,
    costPerMCachedInput: 0.25,
    costPerMOutput: 15.0,
  },
  {
    providerId: "claude",
    tokensTotal: 2_640_000_000,
    // Claude Sonnet 4.6 standard pricing.
    costPerMInput: 3.0,
    costPerMCacheWrite: 3.75,
    costPerMCacheRead: 0.3,
    costPerMOutput: 15.0,
  },
  {
    providerId: "jetbrains-ai-assistant",
    tokensTotal: 2_280_000_000,
    // JetBrains charges AI Credits against LLM-rate usage. This is a demo blend.
    costPerMInput: 2.75,
    costPerMCacheWrite: 2.0,
    costPerMCacheRead: 0.275,
    costPerMOutput: 15.0,
  },
] as const satisfies readonly ProviderTokenEstimate[]

const DAY_COUNT = 30

const DAY_KEYS = Array.from({ length: DAY_COUNT }, (_, i) => {
  const d = new Date(now - (DAY_COUNT - 1 - i) * 86_400_000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
})

/** Spread a total across days with a gentle upward trend; last day absorbs rounding drift. */
function distributeDailyTotals(total: number, dayCount: number): number[] {
  const weights = Array.from({ length: dayCount }, (_, i) => 0.6 + (i / dayCount) * 0.8)
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  const values = weights.map((weight) => Math.floor((total * weight) / weightSum))
  values[dayCount - 1] += total - values.reduce((sum, value) => sum + value, 0)
  return values
}

function tokenBreakdown(totalTokens: number) {
  return {
    input: totalTokens * GENERAL_TOKEN_MIX.input,
    cacheWrite: totalTokens * GENERAL_TOKEN_MIX.cacheWrite,
    cacheRead: totalTokens * GENERAL_TOKEN_MIX.cacheRead,
    output: totalTokens * GENERAL_TOKEN_MIX.output,
  }
}

function estimatedCostUsd(provider: ProviderTokenEstimate) {
  const tokens = tokenBreakdown(provider.tokensTotal)
  const cacheWriteRate =
    provider.costPerMCacheWrite ?? provider.costPerMCachedInput ?? provider.costPerMInput
  const cacheReadRate =
    provider.costPerMCacheRead ?? provider.costPerMCachedInput ?? provider.costPerMInput

  return (
    (tokens.input / 1_000_000) * provider.costPerMInput +
    (tokens.cacheWrite / 1_000_000) * cacheWriteRate +
    (tokens.cacheRead / 1_000_000) * cacheReadRate +
    (tokens.output / 1_000_000) * provider.costPerMOutput
  )
}

const snapshots = PROVIDER_BREAKDOWN.map((provider, idx) => {
  const tokensTotal = provider.tokensTotal
  const costUsd = estimatedCostUsd(provider)
  const isCursor = provider.providerId === "cursor"
  return {
    id: `snapshot-${provider.providerId}`,
    developerId: developers[idx % developers.length].id,
    developerName: developers[idx % developers.length].displayName,
    deviceId: `device-${(idx % developers.length) + 1}`,
    providerId: provider.providerId,
    periodKey: `2026-06-22`,
    dataIdentity: `${provider.providerId}:team:2026-06-22`,
    summary: {
      tokensTotal,
      estimatedCostUsd: costUsd,
      quotaPercent: Math.round((costUsd / 50_000) * 100),
      provider: isCursor
        ? {
            cursor: {
              pooledUsedUsd: 317.4,
              pooledLimitUsd: 480,
              pooledRemainingUsd: 162.6,
            },
          }
        : {},
    },
    metricFamilies: ["tokens", "estimatedCost", "cursorPool"],
    capturedAt: now,
    updatedAt: now - idx * 600_000,
  }
})

const metricSamples = PROVIDER_BREAKDOWN.flatMap((provider, providerIdx) => {
  const tokensTotal = provider.tokensTotal
  const costUsd = estimatedCostUsd(provider)
  const dailyTokens = distributeDailyTotals(tokensTotal, DAY_COUNT)
  const dailyCosts = distributeDailyTotals(Math.round(costUsd * 100), DAY_COUNT).map(
    (cents) => cents / 100
  )

  return DAY_KEYS.flatMap((day, dayIdx) => [
    {
      id: `sample-${provider.providerId}-tokens-${day}`,
      providerId: provider.providerId,
      developerId: developers[providerIdx % developers.length].id,
      metricKey: `${provider.providerId}.tokens.total`,
      value: dailyTokens[dayIdx] ?? 0,
      unit: "tokens",
      sampleDay: day,
      source: "providerReported" as const,
      capturedAt: now,
      updatedAt: now - providerIdx * 600_000,
    },
    {
      id: `sample-${provider.providerId}-cost-${day}`,
      providerId: provider.providerId,
      developerId: developers[providerIdx % developers.length].id,
      metricKey: `${provider.providerId}.cost.estimated`,
      value: dailyCosts[dayIdx] ?? 0,
      unit: "usd",
      sampleDay: day,
      source: "estimated" as const,
      capturedAt: now,
      updatedAt: now - providerIdx * 600_000,
    },
  ])
})

export const landingMockState = {
  status: "ready",
  team: {
    name: "Acme Team",
    slug: "acme-team",
    reportingTimeZone: "UTC",
  },
  dashboardSettings: {
    defaultDateRange: { preset: "last30" as const },
    visibleProviderIds: null,
    hiddenDeveloperIds: [],
    includeInactiveDevelopers: false,
  },
  developers,
  snapshots,
  metricSamples,
  providerAccounts: [],
} as unknown as DashboardSourceState

export const landingMockNow = now
