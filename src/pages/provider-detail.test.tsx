import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ProviderDetailPage } from "@/pages/provider-detail"
import type { LocalProviderAccount } from "@/lib/provider-account-registry"
import type { PluginDisplayState } from "@/lib/plugin-types"

function plugin(overrides: Partial<PluginDisplayState> = {}): PluginDisplayState {
  return {
    meta: {
      id: "a",
      name: "Alpha",
      iconUrl: "",
      lines: [],
      ...overrides.meta,
    },
    data: {
      providerId: "a",
      displayName: "Alpha",
      iconUrl: "",
      lines: [],
      ...overrides.data,
    },
    loading: false,
    error: null,
    lastManualRefreshAt: null,
    lastUpdatedAt: null,
    ...overrides,
  }
}

function providerAccount(
  overrides: Partial<LocalProviderAccount> = {}
): LocalProviderAccount {
  return {
    providerId: "a",
    localAccountFingerprint: "fp-work",
    label: "Work Alpha",
    visibility: "visible",
    identityConfidence: "high",
    confirmationState: "unconfirmed",
    firstSeenAt: "2026-06-01T00:00:00.000Z",
    lastSeenAt: "2026-06-02T00:00:00.000Z",
    detectionState: "detected",
    ...overrides,
  }
}

describe("ProviderDetailPage", () => {
  it("shows not found when plugin missing", () => {
    render(<ProviderDetailPage plugin={null} displayMode="used" resetTimerDisplayMode="relative" />)
    expect(screen.getByText("Provider not found")).toBeInTheDocument()
  })

  it("renders ProviderCard with all scope when plugin present", async () => {
    render(
      <ProviderDetailPage
        displayMode="used"
        resetTimerDisplayMode="relative"
        plugin={plugin()}
      />
    )
    expect(screen.getAllByText("Alpha").length).toBeGreaterThan(0)
  })

  it("renders when plugin data is null (still shows provider name)", () => {
    render(
      <ProviderDetailPage
        displayMode="used"
        resetTimerDisplayMode="relative"
        plugin={plugin({ data: null })}
      />
    )
    expect(screen.getAllByText("Alpha").length).toBeGreaterThan(0)
  })

  it("renders quick links when provided by plugin meta", () => {
    render(
      <ProviderDetailPage
        displayMode="used"
        resetTimerDisplayMode="relative"
        plugin={plugin({
          meta: {
            id: "a",
            name: "Alpha",
            iconUrl: "",
            lines: [],
            links: [{ label: "Status", url: "https://status.example.com" }],
          },
          data: null,
        })}
      />
    )
    expect(screen.getByRole("button", { name: /status/i })).toBeInTheDocument()
  })

  it("shows visible provider account sections with existing metric rows", () => {
    render(
      <ProviderDetailPage
        displayMode="used"
        resetTimerDisplayMode="relative"
        plugin={plugin({
          data: {
            providerId: "a",
            displayName: "Alpha",
            iconUrl: "",
            lines: [{ type: "text", label: "Tokens", value: "100" }],
          },
        })}
        providerAccounts={[
          providerAccount({ label: "Work Alpha", localAccountFingerprint: "fp-work" }),
          providerAccount({
            label: "Personal Alpha",
            localAccountFingerprint: "fp-personal",
            visibility: "hidden",
          }),
          providerAccount({
            label: "Old Alpha",
            localAccountFingerprint: "fp-old",
            detectionState: "notDetected",
          }),
        ]}
      />
    )

    expect(screen.getByText("Work Alpha")).toBeInTheDocument()
    expect(screen.getByText("Tokens")).toBeInTheDocument()
    expect(screen.getByText("100")).toBeInTheDocument()
    expect(screen.queryByText("Personal Alpha")).not.toBeInTheDocument()
    expect(screen.queryByText("Old Alpha")).not.toBeInTheDocument()
  })

  it("shows account labels for multiple visible accounts", () => {
    render(
      <ProviderDetailPage
        displayMode="used"
        resetTimerDisplayMode="relative"
        plugin={plugin({
          data: {
            providerId: "a",
            displayName: "Alpha",
            iconUrl: "",
            lines: [{ type: "text", label: "Tokens", value: "100" }],
          },
        })}
        providerAccounts={[
          providerAccount({ label: "Work Alpha", localAccountFingerprint: "fp-work" }),
          providerAccount({ label: "Side Alpha", localAccountFingerprint: "fp-side" }),
        ]}
      />
    )

    expect(screen.getByText("Work Alpha")).toBeInTheDocument()
    expect(screen.getByText("Side Alpha")).toBeInTheDocument()
    expect(screen.getAllByText("Tokens")).toHaveLength(2)
  })

  it("does not show metric rows when all provider accounts are hidden", () => {
    render(
      <ProviderDetailPage
        displayMode="used"
        resetTimerDisplayMode="relative"
        plugin={plugin({
          data: {
            providerId: "a",
            displayName: "Alpha",
            iconUrl: "",
            lines: [{ type: "text", label: "Tokens", value: "100" }],
          },
        })}
        providerAccounts={[
          providerAccount({
            label: "Hidden Alpha",
            localAccountFingerprint: "fp-hidden",
            visibility: "hidden",
          }),
        ]}
      />
    )

    expect(screen.getByText("No visible Provider Accounts")).toBeInTheDocument()
    expect(screen.queryByText("Tokens")).not.toBeInTheDocument()
  })
})
