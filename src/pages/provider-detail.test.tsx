import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ProviderDetailPage } from "@/pages/provider-detail"
import type { LocalProviderAccount } from "@/lib/provider-account-registry"
import type { PluginDisplayState, ProviderSourceFacts } from "@/lib/plugin-types"

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

function sourceFacts(fingerprint: string): ProviderSourceFacts {
  return {
    dataIdentity: `eport:a:${fingerprint}:daily:2026-06-01`,
    summary: {},
    summaryVersion: "1.0.0",
    extractorVersion: { a: "1.0.0" },
    metricFamilies: ["localConsumedUsage"],
    metricSamples: [],
  }
}

function providerAccountDetection(identityValue: string) {
  return {
    providerId: "a",
    providerName: "Alpha",
    identityKind: "providerAccountId" as const,
    identityValue,
    identityConfidence: "high" as const,
    label: identityValue,
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

  it("keeps native-only metric rows at provider level when Provider Accounts exist", () => {
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

    expect(screen.queryByText("Work Alpha")).not.toBeInTheDocument()
    expect(screen.getByText("Tokens")).toBeInTheDocument()
    expect(screen.getByText("100")).toBeInTheDocument()
    expect(screen.queryByText("Personal Alpha")).not.toBeInTheDocument()
    expect(screen.queryByText("Old Alpha")).not.toBeInTheDocument()
  })

  it("does not duplicate native-only rows for multiple visible accounts", () => {
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

    expect(screen.queryByText("Work Alpha")).not.toBeInTheDocument()
    expect(screen.queryByText("Side Alpha")).not.toBeInTheDocument()
    expect(screen.getAllByText("Tokens")).toHaveLength(1)
  })

  it("shows account-bound rows under matching visible accounts", () => {
    render(
      <ProviderDetailPage
        displayMode="used"
        resetTimerDisplayMode="relative"
        plugin={plugin({
          data: {
            providerId: "a",
            displayName: "Alpha",
            iconUrl: "",
            lines: [{ type: "text", label: "Native tokens", value: "50" }],
            providerAccountOutputs: [
              {
                localAccountFingerprint: "fp-work",
                providerAccountDetections: [providerAccountDetection("work")],
                lines: [{ type: "text", label: "Account tokens", value: "100" }],
                sourceFacts: sourceFacts("fp-work"),
              },
              {
                localAccountFingerprint: "fp-side",
                providerAccountDetections: [providerAccountDetection("side")],
                lines: [{ type: "text", label: "Account tokens", value: "250" }],
                sourceFacts: sourceFacts("fp-side"),
              },
            ],
          },
        })}
        providerAccounts={[
          providerAccount({ label: "Work Alpha", localAccountFingerprint: "fp-work" }),
          providerAccount({ label: "Side Alpha", localAccountFingerprint: "fp-side" }),
        ]}
      />
    )

    expect(screen.getByText("Native tokens")).toBeInTheDocument()
    expect(screen.getByText("50")).toBeInTheDocument()
    expect(screen.getByText("Work Alpha")).toBeInTheDocument()
    expect(screen.getByText("Side Alpha")).toBeInTheDocument()
    expect(screen.getAllByText("Account tokens")).toHaveLength(2)
    expect(screen.getByText("100")).toBeInTheDocument()
    expect(screen.getByText("250")).toBeInTheDocument()
  })

  it("does not render hidden account-bound usage", () => {
    render(
      <ProviderDetailPage
        displayMode="used"
        resetTimerDisplayMode="relative"
        plugin={plugin({
          data: {
            providerId: "a",
            displayName: "Alpha",
            iconUrl: "",
            lines: [{ type: "text", label: "Native tokens", value: "50" }],
            providerAccountOutputs: [
              {
                localAccountFingerprint: "fp-hidden",
                providerAccountDetections: [providerAccountDetection("hidden")],
                lines: [{ type: "text", label: "Account tokens", value: "900" }],
                sourceFacts: sourceFacts("fp-hidden"),
              },
            ],
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

    expect(screen.getByText("Native tokens")).toBeInTheDocument()
    expect(screen.getByText("No visible Provider Accounts")).toBeInTheDocument()
    expect(screen.queryByText("Hidden Alpha")).not.toBeInTheDocument()
    expect(screen.queryByText("Account tokens")).not.toBeInTheDocument()
    expect(screen.queryByText("900")).not.toBeInTheDocument()
  })

  it("shows an account-bound empty state instead of provider-level rows", () => {
    render(
      <ProviderDetailPage
        displayMode="used"
        resetTimerDisplayMode="relative"
        plugin={plugin({
          data: {
            providerId: "a",
            displayName: "Alpha",
            iconUrl: "",
            lines: [{ type: "text", label: "Native tokens", value: "50" }],
            providerAccountOutputs: [
              {
                localAccountFingerprint: "fp-work",
                providerAccountDetections: [providerAccountDetection("work")],
                lines: [],
                sourceFacts: sourceFacts("fp-work"),
              },
            ],
          },
        })}
        providerAccounts={[
          providerAccount({ label: "Work Alpha", localAccountFingerprint: "fp-work" }),
        ]}
      />
    )

    expect(screen.getByText("Native tokens")).toBeInTheDocument()
    expect(screen.getByText("50")).toBeInTheDocument()
    expect(screen.getByText("Work Alpha")).toBeInTheDocument()
    expect(screen.getByText("No account-bound usage")).toBeInTheDocument()
  })

  it("keeps native-only metric rows visible when saved Provider Accounts are hidden", () => {
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

    expect(screen.queryByText("Hidden Alpha")).not.toBeInTheDocument()
    expect(screen.getByText("Tokens")).toBeInTheDocument()
    expect(screen.getByText("100")).toBeInTheDocument()
  })
})
