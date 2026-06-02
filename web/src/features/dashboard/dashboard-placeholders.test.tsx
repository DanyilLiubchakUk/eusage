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
    expect(screen.getByText("Fixed all-up dashboard for visible team usage, provider health, and sync status."))
      .toBeInTheDocument()
    expect(screen.getAllByText("225 tokens").length).toBeGreaterThan(0)
    expect(screen.getByText("$5.50 · No comparison")).toBeInTheDocument()
    expect(screen.getByText("Default metric: total visible usage")).toBeInTheDocument()
    expect(screen.getAllByText("$60.00 remaining").length).toBeGreaterThan(0)
    expect(screen.getByText("53% avg")).toBeInTheDocument()
    expect(screen.getByText("4/8 reporting")).toBeInTheDocument()
    expect(screen.getAllByRole("table")).toHaveLength(5)
    expect(screen.getByText("Available Metrics")).toBeInTheDocument()
    expect(screen.getByText("Provider Status")).toBeInTheDocument()
    expect(screen.getByText("Recent Syncs")).toBeInTheDocument()
    expect(screen.getAllByText("Cursor").length).toBeGreaterThan(0)
    expect(screen.getAllByText("JetBrains AI Assistant").length).toBeGreaterThan(0)
    expect(screen.getAllByText("50 credits").length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/Total visible token usage/)).toHaveAttribute(
      "title",
      expect.stringContaining("Source: Normalized usage snapshots")
    )
    expect(screen.getByText("Updates: oldest 12s ago · newest 0s ago")).toBeInTheDocument()
    expect(screen.getAllByText("Alex").length).toBeGreaterThan(0)
    expect(screen.getByText("Alex Mac")).toBeInTheDocument()
  })

  it("renders Admin no-data states", () => {
    const state = {
      status: "ready",
      team: {
        name: "Quiet Team",
        slug: "quiet-team",
      },
      developers: [],
      snapshots: [],
      metricSamples: [],
      providers: [],
    } as unknown as DashboardSourceState

    render(<AdminDashboardPlaceholder state={state} now={now} />)

    expect(screen.getByRole("heading", { name: "Quiet Team" })).toBeInTheDocument()
    expect(screen.getByText("No token samples yet")).toBeInTheDocument()
    expect(screen.getAllByText("No provider usage yet").length).toBeGreaterThan(0)
    expect(screen.getAllByText("No developer usage yet").length).toBeGreaterThan(0)
    expect(screen.getAllByText("No device sync rows yet").length).toBeGreaterThan(0)
    expect(screen.getByText("No providers visible")).toBeInTheDocument()
    expect(screen.getByLabelText(/No sample data yet/)).toBeInTheDocument()
  })

  it("renders TV metrics from the same source rows", () => {
    render(<TvDashboardPlaceholder state={readyState} now={now} />)

    expect(screen.getByRole("heading", { name: "225 tokens" })).toBeInTheDocument()
    expect(screen.getByText("$5.50 estimated cost · No comparison")).toBeInTheDocument()
    expect(screen.getByText("Team On-Demand Budget: $60.00 remaining (1/2 developers reporting budget data)"))
      .toBeInTheDocument()
    expect(screen.getByText("Cursor 100, Codex 75, Claude 50, JetBrains AI Assistant 50 credits")).toBeInTheDocument()
    expect(screen.getByText("Updates: oldest 12s ago · newest 0s ago")).toBeInTheDocument()
  })

  it("hides globally disabled providers from views without removing stored rows", () => {
    const state = {
      ...readyState,
      providers: [
        {
          providerId: "claude",
          name: "Claude",
          status: "disabled",
          brandColor: "#d97757",
        },
      ],
    } as unknown as DashboardSourceState

    expect(
      (state as Extract<DashboardSourceState, { status: "ready" }>).snapshots.some(
        (snapshot) => snapshot.providerId === "claude"
      )
    ).toBe(true)

    render(<AdminDashboardPlaceholder state={state} now={now} />)

    expect(screen.getAllByText("175 tokens").length).toBeGreaterThan(0)
    expect(screen.getByText("$4.75 · No comparison")).toBeInTheDocument()
    expect(screen.getAllByText("JetBrains AI Assistant").length).toBeGreaterThan(0)
    expect(screen.queryByText("Claude")).not.toBeInTheDocument()
  })

  it("lets TV hide a globally visible provider only from TV", () => {
    const state = {
      ...readyState,
      tvSettings: {
        dateRange: { preset: "last7" },
        visibleProviderIds: ["cursor", "codex", "jetbrains-ai-assistant"],
        visibleDeveloperIds: null,
      },
    } as unknown as DashboardSourceState

    render(<TvDashboardPlaceholder state={state} now={now} />)

    expect(screen.getByRole("heading", { name: "175 tokens" })).toBeInTheDocument()
    expect(screen.getByText("Cursor 100, Codex 75, JetBrains AI Assistant 50 credits")).toBeInTheDocument()
    expect(screen.queryByText(/Claude/)).not.toBeInTheDocument()
  })

  it("hides inactive developers by default and includes them for admin review", () => {
    const inactiveState = {
      ...readyState,
      developers: [
        ...(readyState as Extract<DashboardSourceState, { status: "ready" }>).developers,
        {
          id: "lee",
          displayName: "Lee",
          status: "inactive",
          token: null,
          devices: [],
        },
      ],
      snapshots: [
        ...(readyState as Extract<DashboardSourceState, { status: "ready" }>).snapshots,
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
    } as unknown as DashboardSourceState

    const tv = render(<TvDashboardPlaceholder state={inactiveState} now={now} />)
    expect(screen.getByRole("heading", { name: "225 tokens" })).toBeInTheDocument()
    tv.unmount()

    const reviewState = {
      ...inactiveState,
      dashboardSettings: {
        defaultDateRange: { preset: "last7" },
        visibleProviderIds: null,
        hiddenDeveloperIds: [],
        includeInactiveDevelopers: true,
      },
    } as unknown as DashboardSourceState

    render(<AdminDashboardPlaceholder state={reviewState} now={now} />)
    expect(screen.getAllByText("255 tokens").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Lee").length).toBeGreaterThan(0)
    expect(screen.getAllByText("inactive").length).toBeGreaterThan(0)
  })
})
