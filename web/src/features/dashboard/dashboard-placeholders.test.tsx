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
  ],
} as unknown as DashboardSourceState

describe("dashboard placeholders", () => {
  it("renders Admin metrics from shared source rows", () => {
    render(<AdminDashboardPlaceholder state={readyState} now={now} />)

    expect(screen.getByRole("heading", { name: "Acme Team" })).toBeInTheDocument()
    expect(screen.getByText("Team On-Demand Budget: $60.00 remaining (1/2 developers reporting budget data)"))
      .toBeInTheDocument()
    expect(screen.getByText("82% avg (1/2 reporting)")).toBeInTheDocument()
    expect(screen.getByText("1 daily token points from metric samples.")).toBeInTheDocument()
    expect(screen.getByRole("table")).toBeInTheDocument()
    expect(screen.getByText("Individual $60.00 remaining")).toBeInTheDocument()
    expect(screen.getByText("2f8a7f04...e2498b5e")).toBeInTheDocument()
    expect(screen.getAllByText(/^Last sync /)).toHaveLength(2)
  })

  it("renders TV metrics from the same source rows", () => {
    render(<TvDashboardPlaceholder state={readyState} now={now} />)

    expect(screen.getByRole("heading", { name: "100 tokens" })).toBeInTheDocument()
    expect(screen.getByText("$3.50 estimated cost · No comparison")).toBeInTheDocument()
    expect(screen.getByText("Team On-Demand Budget: $60.00 remaining (1/2 developers reporting budget data)"))
      .toBeInTheDocument()
    expect(screen.getByText("Oldest update: 12s ago")).toBeInTheDocument()
  })
})
