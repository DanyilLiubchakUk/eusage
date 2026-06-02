export type DateRangePreset = "last7" | "last30" | "last90" | "allTime" | "custom"

export type MetricDateRangeInput =
  | {
      preset: Exclude<DateRangePreset, "custom">
    }
  | {
      preset: "custom"
      startDay: string
      endDay: string
    }

export type ResolvedMetricDateRange = {
  preset: DateRangePreset
  label: string
  current: MetricRangeWindow
  comparison: MetricRangeWindow | null
}

export type MetricRangeWindow = {
  startMs: number | null
  endMs: number | null
  startDay: string | null
  endDay: string | null
}

export type MetricSource = "providerReported" | "normalized" | "estimated"

export type CursorSummary = {
  planUsedUsd?: number
  planLimitUsd?: number
  onDemandUsedUsd?: number
  onDemandLimitUsd?: number
  individualUsedUsd?: number
  individualLimitUsd?: number
  individualRemainingUsd?: number
  pooledUsedUsd?: number
  pooledLimitUsd?: number
  pooledRemainingUsd?: number
  planTotalPercentUsed?: number
  autoPercentUsed?: number
  apiPercentUsed?: number
  [key: string]: unknown
}

export type CodexSummary = {
  planType?: string
  planName?: string
  sessionUsedPercent?: number
  weeklyUsedPercent?: number
  reviewUsedPercent?: number
  creditsRemaining?: number
  todayTokens?: number
  todayEstimatedCostUsd?: number
  [key: string]: unknown
}

export type ClaudeSummary = {
  planName?: string
  subscriptionType?: string
  rateLimitTier?: string
  sessionUsedPercent?: number
  weeklyUsedPercent?: number
  extraUsageUsedUsd?: number
  extraUsageMonthlyLimitUsd?: number
  todayTokens?: number
  todayEstimatedCostUsd?: number
  modelWindows?: Array<{
    key?: string
    name?: string
    usedPercent?: number
    resetAt?: number
    windowSeconds?: number
  }>
  [key: string]: unknown
}

export type JetBrainsSummary = {
  quotaUsed?: number
  quotaLimit?: number
  quotaRemaining?: number
  quotaUsedPercent?: number
  quotaResetAt?: number
  quotaPeriodSeconds?: number
  quotaUnit?: string
  [key: string]: unknown
}

export type UsageSummarySource = {
  tokensTotal?: number
  estimatedCostUsd?: number
  budgetUsedUsd?: number
  budgetLimitUsd?: number
  quotaPercent?: number
  creditsUsed?: number
  creditsRemaining?: number
  requestsUsed?: number
  provider?: {
    claude?: ClaudeSummary
    codex?: CodexSummary
    cursor?: CursorSummary
    "jetbrains-ai-assistant"?: JetBrainsSummary
    [key: string]: unknown
  }
}

export type UsageSnapshotSourceRow = {
  id?: string
  developerId: string
  developerName?: string
  deviceId?: string
  providerId: string
  periodStart?: number
  periodEnd?: number
  periodKey: string
  dataIdentity: string
  summary: UsageSummarySource
  metricFamilies?: string[]
  capturedAt: number
  updatedAt: number
}

export type UsageMetricSampleSourceRow = {
  id?: string
  providerId: string
  developerId?: string
  metricKey: string
  value: number
  unit: string
  sampleDay: string
  source: MetricSource
  capturedAt: number
  updatedAt: number
}
