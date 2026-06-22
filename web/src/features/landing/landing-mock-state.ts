/**
 * Mock dashboard state for the public landing page hero preview.
 *
 * Token volumes and costs reflect a realistic mid-size engineering team
 * (12 active developers) over a 30-day window, using public API list
 * prices as of 2025-2026:
 *
 *  - Cursor (Composer 2.5 / blended):       ~$0.50 / M input, ~$2.50 / M output
 *  - Codex (GPT-4.1):                        $2.00 / M input, $8.00 / M output
 *  - Claude (Sonnet 4.6):                    $3.00 / M input, $15.00 / M output
 *  - JetBrains AI Assistant (AI Credits):    $1.00 per AI Credit, blended ~$2.50 / M
 *
 * Blended input:output ratio assumed at roughly 4:1 for code-assistant workloads.
 *
 * Team: 12 developers, 12.52B total tokens, ~$31.2K estimated API-equivalent cost.
 * Cursor is the largest provider by token volume (~4.08B).
 */

import type { DashboardSourceState } from "../dashboard/dashboard"

const now = Date.UTC(2026, 5, 22, 12)

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

// 12.52B tokens total. Cursor leads on volume; daily samples sum exactly to these totals.
const PROVIDER_BREAKDOWN = [
  {
    providerId: "cursor",
    tokensInput: 3_264_000_000,
    tokensOutput: 816_000_000,
    costPerMInput: 0.5,
    costPerMOutput: 2.5,
  },
  {
    providerId: "codex",
    tokensInput: 2_816_000_000,
    tokensOutput: 704_000_000,
    costPerMInput: 2.0,
    costPerMOutput: 8.0,
  },
  {
    providerId: "claude",
    tokensInput: 2_112_000_000,
    tokensOutput: 528_000_000,
    costPerMInput: 3.0,
    costPerMOutput: 15.0,
  },
  {
    providerId: "jetbrains-ai-assistant",
    tokensInput: 1_824_000_000,
    tokensOutput: 456_000_000,
    costPerMInput: 0.5,
    costPerMOutput: 2.5,
  },
] as const

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

function estimatedCostUsd(provider: (typeof PROVIDER_BREAKDOWN)[number]) {
  return (
    (provider.tokensInput / 1_000_000) * provider.costPerMInput +
    (provider.tokensOutput / 1_000_000) * provider.costPerMOutput
  )
}

const snapshots = PROVIDER_BREAKDOWN.map((provider, idx) => {
  const tokensTotal = provider.tokensInput + provider.tokensOutput
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
  const tokensTotal = provider.tokensInput + provider.tokensOutput
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
