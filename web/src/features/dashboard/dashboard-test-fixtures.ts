import type { DashboardSourceState } from "./dashboard"

export const now = Date.UTC(2026, 5, 1, 12)

export const readyState = {
  status: "ready",
  team: {
    name: "Acme Team",
    slug: "acme-team",
    reportingTimeZone: "UTC",
  },
  developers: [
    {
      id: "alex",
      displayName: "Alex",
      status: "active",
      token: {
        fingerprint: "2f8a7f04...e2498b5e",
        label: "Alex laptop",
        status: "active",
        lastUsedAt: now - 12_000,
      },
      devices: [
        {
          deviceId: "device-1",
          deviceName: "Alex Mac",
          os: "macos",
          status: "connected",
          lastSeenAt: now - 12_000,
          lastSyncAt: now - 12_000,
        },
      ],
    },
    {
      id: "sam",
      displayName: "Sam",
      status: "active",
      token: null,
      devices: [],
    },
  ],
  snapshots: [
    {
      id: "snapshot-1",
      developerId: "alex",
      developerName: "Alex",
      deviceId: "device-1",
      providerId: "cursor",
      periodKey: "2026-06-01",
      dataIdentity: "cursor:alex:2026-06-01",
      summary: {
        tokensTotal: 100,
        estimatedCostUsd: 3.5,
        quotaPercent: 45,
        provider: {
          cursor: {
            individualLimitUsd: 100,
            individualUsedUsd: 40,
          },
        },
      },
      metricFamilies: ["tokens", "estimatedCost", "quotaPressure", "cursorPool"],
      capturedAt: now,
      updatedAt: now - 12_000,
    },
    {
      id: "snapshot-2",
      developerId: "alex",
      developerName: "Alex",
      deviceId: "device-1",
      providerId: "codex",
      periodKey: "codex:2026-06-01",
      dataIdentity: "codex:daily:2026-06-01",
      summary: {
        tokensTotal: 75,
        estimatedCostUsd: 1.25,
        quotaPercent: 25,
        creditsRemaining: 5,
        provider: {
          codex: {
            planName: "Plus",
            sessionUsedPercent: 25,
            weeklyUsedPercent: 50,
            reviewUsedPercent: 18,
            todayTokens: 75,
          },
        },
      },
      metricFamilies: ["tokens", "estimatedCost", "quotaPressure", "credits"],
      capturedAt: now,
      updatedAt: now - 6_000,
    },
    {
      id: "snapshot-3",
      developerId: "alex",
      developerName: "Alex",
      deviceId: "device-1",
      providerId: "claude",
      periodKey: "claude:2026-06-01",
      dataIdentity: "claude:daily:2026-06-01",
      summary: {
        tokensTotal: 50,
        estimatedCostUsd: 0.75,
        quotaPercent: 64,
        budgetUsedUsd: 20,
        budgetLimitUsd: 100,
        creditsUsed: 20,
        provider: {
          claude: {
            planName: "Pro",
            sessionUsedPercent: 64,
            weeklyUsedPercent: 70,
            extraUsageUsedUsd: 20,
            extraUsageMonthlyLimitUsd: 100,
            todayTokens: 50,
            todayEstimatedCostUsd: 0.75,
          },
        },
      },
      metricFamilies: ["tokens", "estimatedCost", "quotaPressure", "budget", "credits"],
      capturedAt: now,
      updatedAt: now - 3_000,
    },
    {
      id: "snapshot-4",
      developerId: "alex",
      developerName: "Alex",
      deviceId: "device-1",
      providerId: "jetbrains-ai-assistant",
      periodKey: "jetbrains-ai-assistant:quota:2026-06-30",
      dataIdentity: "jetbrains-ai-assistant:quota:2026-06-30",
      summary: {
        quotaPercent: 40,
        creditsUsed: 50,
        creditsRemaining: 75,
        provider: {
          "jetbrains-ai-assistant": {
            quotaUsed: 50,
            quotaLimit: 125,
            quotaRemaining: 75,
            quotaUsedPercent: 40,
          },
        },
      },
      metricFamilies: ["quotaPressure", "credits"],
      capturedAt: now,
      updatedAt: now - 2_000,
    },
  ],
  metricSamples: [
    metricSample("metric-1", "cursor", "cursor.tokens.total", 100, "tokens"),
    metricSample("metric-2", "cursor", "cursor.cost.estimated", 3.5, "usd", "estimated"),
    metricSample("metric-3", "cursor", "cursor.plan.percentUsed", 21, "percent"),
    metricSample("metric-4", "cursor", "cursor.auto.percentUsed", 14, "percent"),
    metricSample("metric-5", "cursor", "cursor.api.percentUsed", 45, "percent"),
    metricSample("metric-6", "codex", "codex.tokens.total", 75, "tokens"),
    metricSample("metric-7", "codex", "codex.cost.estimated", 1.25, "usd", "estimated"),
    metricSample("metric-8", "codex", "codex.session.percentUsed", 25, "percent"),
    metricSample("metric-9", "codex", "codex.weekly.percentUsed", 50, "percent"),
    metricSample("metric-10", "codex", "codex.reviews.percentUsed", 18, "percent"),
    metricSample("metric-11", "claude", "claude.tokens.total", 50, "tokens"),
    metricSample("metric-12", "claude", "claude.cost.estimated", 0.75, "usd", "estimated"),
  ],
} as unknown as DashboardSourceState

export function quietState(): DashboardSourceState {
  return {
    status: "ready",
    team: {
      name: "Quiet Team",
      slug: "quiet-team",
      reportingTimeZone: "UTC",
    },
    developers: [],
    snapshots: [],
    metricSamples: [],
    providers: [],
  } as unknown as DashboardSourceState
}

export function readyStateWithInactiveDeveloper(): DashboardSourceState {
  const ready = readyState as Extract<DashboardSourceState, { status: "ready" }>
  return {
    ...readyState,
    developers: [
      ...ready.developers,
      {
        id: "lee",
        displayName: "Lee",
        status: "inactive",
        token: null,
        devices: [],
      },
    ],
    snapshots: [
      ...ready.snapshots,
      {
        id: "snapshot-5",
        developerId: "lee",
        developerName: "Lee",
        deviceId: "device-2",
        providerId: "cursor",
        periodKey: "2026-06-01",
        dataIdentity: "cursor:lee:2026-06-01",
        summary: {
          tokensTotal: 30,
          estimatedCostUsd: 0.5,
          quotaPercent: 95,
          provider: {
            cursor: {
              individualLimitUsd: 100,
              individualUsedUsd: 75,
            },
          },
        },
        metricFamilies: ["tokens", "estimatedCost", "quotaPressure", "cursorPool"],
        capturedAt: now,
        updatedAt: now - 1_000,
      },
    ],
    metricSamples: [
      ...ready.metricSamples,
      {
        id: "metric-lee-1",
        providerId: "cursor",
        developerId: "lee",
        metricKey: "cursor.tokens.total",
        value: 30,
        unit: "tokens",
        sampleDay: "2026-06-01",
        source: "providerReported",
        capturedAt: now,
        updatedAt: now,
      },
      {
        id: "metric-lee-2",
        providerId: "cursor",
        developerId: "lee",
        metricKey: "cursor.cost.estimated",
        value: 0.5,
        unit: "usd",
        sampleDay: "2026-06-01",
        source: "estimated",
        capturedAt: now,
        updatedAt: now,
      },
    ],
  } as unknown as DashboardSourceState
}

function metricSample(
  id: string,
  providerId: string,
  metricKey: string,
  value: number,
  unit: string,
  source: "providerReported" | "estimated" = "providerReported"
) {
  return {
    id,
    providerId,
    developerId: "alex",
    metricKey,
    value,
    unit,
    sampleDay: "2026-06-01",
    source,
    capturedAt: now,
    updatedAt: now,
  }
}
