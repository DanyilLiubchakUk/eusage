import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AdminDashboardPlaceholder } from "./dashboard-placeholders"
import type { DashboardSourceState } from "./dashboard"
import { now, readyState } from "./dashboard-test-fixtures"

describe("Admin overview Provider Accounts", () => {
  it("renders Admin metrics from shared source rows", () => {
    render(<AdminDashboardPlaceholder state={readyState} now={now} />)

    expect(screen.getByRole("heading", { name: "Acme Team" })).toBeInTheDocument()
    expect(
      screen.getByText("Fixed all-up dashboard for visible team usage, provider health, and sync status.")
    ).toBeInTheDocument()
    expect(screen.getAllByText("225 tokens").length).toBeGreaterThan(0)
    expect(screen.getAllByText("$5.50").length).toBeGreaterThan(0)
    expect(screen.getByText("1/2 connected")).toBeInTheDocument()
    expect(screen.getByText("1 connected device")).toBeInTheDocument()
    expect(screen.getByText("Cursor - 100 tokens")).toBeInTheDocument()
    expect(screen.getByText("Next: Codex - 75 tokens")).toBeInTheDocument()
    expect(screen.getByText("$40 / $100")).toBeInTheDocument()
    expect(screen.getByText("40% used")).toBeInTheDocument()
    expect(screen.getByText("Tokens left · API equivalent right")).toBeInTheDocument()
    expect(screen.getByText("Default metric: total visible usage")).toBeInTheDocument()
    expect(screen.getAllByText("$60.00 remaining").length).toBeGreaterThan(0)
    expect(screen.getByText("51% avg · 70% worst")).toBeInTheDocument()
    expect(screen.getAllByText("4/8 reporting").length).toBeGreaterThan(0)
    expect(screen.getAllByRole("table")).toHaveLength(6)
    expect(screen.getByText("Available Metrics")).toBeInTheDocument()
    expect(screen.getAllByText("Quota pressure").length).toBeGreaterThan(0)
    expect(screen.getByText("Total usage")).toBeInTheDocument()
    expect(screen.getByText("Auto + composer")).toBeInTheDocument()
    expect(screen.getByText("API usage")).toBeInTheDocument()
    expect(screen.getAllByText("Weekly").length).toBeGreaterThan(0)
    expect(screen.getByText("Reviews")).toBeInTheDocument()
    expect(screen.getByText("21%")).toBeInTheDocument()
    expect(screen.getByText("14%")).toBeInTheDocument()
    expect(screen.getByText("45%")).toBeInTheDocument()
    expect(screen.getByText("Provider Status")).toBeInTheDocument()
    expect(screen.getByText("21% total · 45% API")).toBeInTheDocument()
    expect(screen.getByText("25% session · 50% weekly")).toBeInTheDocument()
    expect(screen.getByText("Recent Syncs")).toBeInTheDocument()
    expect(screen.getAllByText("Cursor").length).toBeGreaterThan(0)
    expect(screen.getAllByText("JetBrains AI Assistant").length).toBeGreaterThan(0)
    expect(screen.getByText("Credits")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Total visible token usage/ })).not.toHaveAttribute("title")
    const metricTooltip = screen.getByText(/Source: Canonical provider token samples/)
    expect(metricTooltip).toBeInTheDocument()
    expect(metricTooltip).toHaveClass("whitespace-normal")
    expect(metricTooltip).toHaveClass("overflow-y-auto")
    expect(screen.getByText("Updates: oldest 12s ago · newest 0s ago · 2 visible developers")).toBeInTheDocument()
    expect(screen.getAllByText("Alex").length).toBeGreaterThan(0)
    expect(screen.getByText("Alex Mac")).toBeInTheDocument()
  })

  it("shows shared Provider Account labels on Admin detail rows", () => {
    const ready = readyState as Extract<DashboardSourceState, { status: "ready" }>
    const claudeSnapshot = ready.snapshots.find((snapshot) => snapshot.providerId === "claude")
    if (!claudeSnapshot) throw new Error("Missing Claude fixture.")
    const state = {
      ...ready,
      snapshots: [
        ...ready.snapshots.filter((snapshot) => snapshot.providerId !== "claude"),
        {
          ...claudeSnapshot,
          id: "snapshot-claude-work",
          dataIdentity: "provider-account:team-claude-work:claude:daily:2026-06-01",
          providerAccountFingerprint: "team-claude-work",
          summary: {
            ...claudeSnapshot.summary,
            quotaPercent: 64,
            provider: {
              claude: {
                sessionUsedPercent: 64,
                weeklyUsedPercent: 70,
              },
            },
          },
        },
        {
          ...claudeSnapshot,
          id: "snapshot-claude-side",
          dataIdentity: "provider-account:team-claude-side:claude:daily:2026-06-01",
          providerAccountFingerprint: "team-claude-side",
          summary: {
            ...claudeSnapshot.summary,
            quotaPercent: 32,
            provider: {
              claude: {
                sessionUsedPercent: 32,
                weeklyUsedPercent: 45,
              },
            },
          },
        },
      ],
      providerAccounts: [
        {
          id: "provider-account-work",
          developerId: "alex",
          providerId: "claude",
          teamAccountFingerprint: "team-claude-work",
          label: "Claude Work",
          status: "shared",
          firstSharedAt: now - 1_000,
          lastSharedAt: now,
          updatedAt: now,
        },
        {
          id: "provider-account-side",
          developerId: "alex",
          providerId: "claude",
          teamAccountFingerprint: "team-claude-side",
          label: "Claude Side",
          status: "shared",
          firstSharedAt: now - 1_000,
          lastSharedAt: now,
          updatedAt: now,
        },
      ],
    } as unknown as DashboardSourceState

    render(<AdminDashboardPlaceholder state={state} now={now} />)

    expect(screen.getAllByText("Claude Work").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Claude Side").length).toBeGreaterThan(0)
    expect(screen.getByText("Alex: Claude Work, Claude Side")).toBeInTheDocument()
  })

  it("does not infer Admin account labels from source row identity fields", () => {
    const ready = readyState as Extract<DashboardSourceState, { status: "ready" }>
    const claudeSnapshot = ready.snapshots.find((snapshot) => snapshot.providerId === "claude")
    if (!claudeSnapshot) throw new Error("Missing Claude fixture.")
    const state = {
      ...ready,
      snapshots: [
        ...ready.snapshots.filter((snapshot) => snapshot.providerId !== "claude"),
        {
          ...claudeSnapshot,
          providerAccountFingerprint: "team-claude-private",
          dataIdentity: "provider-account:team-claude-private:claude:daily:2026-06-01",
          summary: {
            ...claudeSnapshot.summary,
            provider: {
              claude: {
                ...claudeSnapshot.summary.provider?.claude,
                providerAccountLabel: "Personal Claude",
                providerEmail: "work@example.com",
                localProfilePath: "/Users/alex/.claude-personal",
              },
            },
          },
        },
      ],
      providerAccounts: [],
    } as unknown as DashboardSourceState

    render(<AdminDashboardPlaceholder state={state} now={now} />)

    expect(screen.queryByText("Personal Claude")).not.toBeInTheDocument()
    expect(screen.queryByText("work@example.com")).not.toBeInTheDocument()
    expect(screen.queryByText("/Users/alex/.claude-personal")).not.toBeInTheDocument()
  })
})
