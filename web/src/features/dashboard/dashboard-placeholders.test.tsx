import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  AdminDashboardPlaceholder,
  TvDashboardPlaceholder,
} from "./dashboard-placeholders"
import type { DashboardSourceState } from "./dashboard"

const now = Date.UTC(2026, 5, 1, 12)
const readyState = {
  status: "ready",
  team: {
    name: "Acme Team",
    slug: "acme-team",
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
        quotaPercent: 82,
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
    {
      id: "metric-1",
      providerId: "cursor",
      developerId: "alex",
      metricKey: "cursor.tokens.total",
      value: 100,
      unit: "tokens",
      sampleDay: "2026-06-01",
      source: "providerReported",
      capturedAt: now,
      updatedAt: now,
    },
    {
      id: "metric-2",
      providerId: "codex",
      developerId: "alex",
      metricKey: "codex.tokens.total",
      value: 75,
      unit: "tokens",
      sampleDay: "2026-06-01",
      source: "providerReported",
      capturedAt: now,
      updatedAt: now,
    },
    {
      id: "metric-3",
      providerId: "claude",
      developerId: "alex",
      metricKey: "claude.tokens.total",
      value: 50,
      unit: "tokens",
      sampleDay: "2026-06-01",
      source: "providerReported",
      capturedAt: now,
      updatedAt: now,
    },
  ],
} as unknown as DashboardSourceState

describe("dashboard placeholders", () => {
  it("renders Admin metrics from shared source rows", () => {
    render(<AdminDashboardPlaceholder state={readyState} now={now} />)

    expect(screen.getByRole("heading", { name: "Acme Team" })).toBeInTheDocument()
    expect(screen.getByText("Team On-Demand Budget: $60.00 remaining (1/2 developers reporting budget data)"))
      .toBeInTheDocument()
    expect(screen.getByText("53% avg (4/8 reporting)")).toBeInTheDocument()
    expect(screen.getByText("1 daily token points from metric samples.")).toBeInTheDocument()
    expect(screen.getByRole("table")).toBeInTheDocument()
    expect(screen.getByText("Claude: Session 64%, Weekly 70%, 50 tokens today, $0.75 today, $20.00/$100.00 extra | Codex: Session 25%, Weekly 50%, 75 tokens today, 5 credits | Cursor: Individual $60.00 remaining | JetBrains AI Assistant: 40% quota, 75 credits remaining, 50/125 credits"))
      .toBeInTheDocument()
    expect(screen.getByText("Cursor 100, Codex 75, Claude 50, JetBrains AI Assistant 50 credits")).toBeInTheDocument()
    expect(screen.getByText("2f8a7f04...e2498b5e")).toBeInTheDocument()
    expect(screen.getAllByText(/^Last sync /)).toHaveLength(2)
  })

  it("renders TV metrics from the same source rows", () => {
    render(<TvDashboardPlaceholder state={readyState} now={now} />)

    expect(screen.getByRole("heading", { name: "225 tokens" })).toBeInTheDocument()
    expect(screen.getByText("$5.50 estimated cost · No comparison")).toBeInTheDocument()
    expect(screen.getByText("Team On-Demand Budget: $60.00 remaining (1/2 developers reporting budget data)"))
      .toBeInTheDocument()
    expect(screen.getByText("Cursor 100, Codex 75, Claude 50, JetBrains AI Assistant 50 credits")).toBeInTheDocument()
    expect(screen.getByText("Oldest update: 12s ago")).toBeInTheDocument()
  })
})
