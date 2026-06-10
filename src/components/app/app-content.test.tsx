import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { overviewPageMock, providerDetailPageMock, settingsPageMock, teamPageMock } = vi.hoisted(() => ({
  overviewPageMock: vi.fn(),
  settingsPageMock: vi.fn(),
  providerDetailPageMock: vi.fn(),
  teamPageMock: vi.fn(),
}))

vi.mock("@/pages/overview", () => ({
  OverviewPage: (props: unknown) => {
    overviewPageMock(props)
    return <div data-testid="overview-page" />
  },
}))

vi.mock("@/pages/settings", () => ({
  SettingsPage: (props: unknown) => {
    settingsPageMock(props)
    return <div data-testid="settings-page" />
  },
}))

vi.mock("@/pages/team", () => ({
  TeamPage: (props: unknown) => {
    teamPageMock(props)
    return <div data-testid="team-page" />
  },
}))

vi.mock("@/pages/provider-detail", () => ({
  ProviderDetailPage: (props: { onRetry?: () => void; providerAccounts?: unknown[] }) => {
    providerDetailPageMock(props)
    return (
      <div data-testid="provider-detail-page">
        {props.onRetry ? <button onClick={props.onRetry}>retry-provider</button> : null}
      </div>
    )
  },
}))

import { AppContent, type AppContentProps } from "@/components/app/app-content"
import type { LocalProviderAccount } from "@/lib/provider-account-registry"
import { useAppPreferencesStore } from "@/stores/app-preferences-store"
import { useAppUiStore } from "@/stores/app-ui-store"

function providerAccount(
  overrides: Partial<LocalProviderAccount> = {}
): LocalProviderAccount {
  return {
    providerId: "codex",
    localAccountFingerprint: "fp-work",
    label: "Work Codex",
    visibility: "visible",
    identityConfidence: "high",
    confirmationState: "unconfirmed",
    firstSeenAt: "2026-06-01T00:00:00.000Z",
    lastSeenAt: "2026-06-02T00:00:00.000Z",
    detectionState: "detected",
    ...overrides,
  }
}

function createProps(): AppContentProps {
  return {
    displayPlugins: [],
    settingsPlugins: [],
    selectedPlugin: {
      meta: {
        id: "codex",
        name: "Codex",
        iconUrl: "/codex.svg",
        brandColor: "#000000",
        lines: [],
        primaryCandidates: [],
      },
      data: null,
      loading: false,
      error: null,
      lastManualRefreshAt: null,
      lastUpdatedAt: null,
    },
    onRetryPlugin: vi.fn(),
    onReorder: vi.fn(),
    onToggle: vi.fn(),
    onAutoUpdateIntervalChange: vi.fn(),
    onThemeModeChange: vi.fn(),
    onDisplayModeChange: vi.fn(),
    onResetTimerDisplayModeChange: vi.fn(),
    onResetTimerDisplayModeToggle: vi.fn(),
    onTimeFormatModeChange: vi.fn(),
    onMenubarIconStyleChange: vi.fn(),
    traySettingsPreview: {
      bars: [],
      providerBars: [],
      providerPercentText: "",
    },
    onGlobalShortcutChange: vi.fn(),
    onStartOnLoginChange: vi.fn(),
    onTeamConnected: vi.fn(),
    providerAccountGroups: [],
    providerAccountLabelSyncError: null,
    providerAccountSharingSettings: { sharedLocalAccountFingerprints: [] },
    providerAccountSharingSyncError: null,
    onProviderAccountSharingChange: vi.fn(),
    onProviderAccountSharingReset: vi.fn(),
    onProviderAccountRename: vi.fn(),
    onProviderAccountVisibilityChange: vi.fn(),
    onProviderAccountForget: vi.fn(),
  }
}

describe("AppContent", () => {
  beforeEach(() => {
    overviewPageMock.mockReset()
    settingsPageMock.mockReset()
    providerDetailPageMock.mockReset()
    teamPageMock.mockReset()
    useAppUiStore.getState().resetState()
    useAppPreferencesStore.getState().resetState()
  })

  it("renders overview page for home view", () => {
    useAppUiStore.getState().setActiveView("home")
    render(<AppContent {...createProps()} />)

    expect(screen.getByTestId("overview-page")).toBeInTheDocument()
    expect(overviewPageMock).toHaveBeenCalledTimes(1)
  })

  it("renders settings page for settings view", () => {
    useAppUiStore.getState().setActiveView("settings")
    render(<AppContent {...createProps()} />)

    expect(screen.getByTestId("settings-page")).toBeInTheDocument()
    expect(settingsPageMock).toHaveBeenCalledTimes(1)
    expect(settingsPageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        providerAccountGroups: [],
        onProviderAccountRename: expect.any(Function),
        onProviderAccountVisibilityChange: expect.any(Function),
        onProviderAccountForget: expect.any(Function),
      })
    )
  })

  it("renders team page for team view", () => {
    const props = createProps()
    const visible = providerAccount()
    props.providerAccountGroups = [
      {
        providerId: "codex",
        providerName: "Codex",
        visibleAccounts: [visible],
        hiddenAccounts: [],
        notDetectedAccounts: [],
      },
    ]
    props.providerAccountSharingSettings = {
      sharedLocalAccountFingerprints: ["fp-work"],
    }
    useAppUiStore.getState().setActiveView("team")
    render(<AppContent {...props} />)

    expect(screen.getByTestId("team-page")).toBeInTheDocument()
    expect(teamPageMock).toHaveBeenCalledTimes(1)
    expect(teamPageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        providerAccountGroups: props.providerAccountGroups,
        providerAccountSharingSettings: props.providerAccountSharingSettings,
        providerAccountSharingSyncError: null,
        onProviderAccountSharingChange: props.onProviderAccountSharingChange,
        onProviderAccountSharingReset: props.onProviderAccountSharingReset,
      })
    )
  })

  it("passes retry callback for provider detail view", () => {
    const props = createProps()
    useAppUiStore.getState().setActiveView("codex")
    render(<AppContent {...props} />)

    fireEvent.click(screen.getByRole("button", { name: "retry-provider" }))

    expect(providerDetailPageMock).toHaveBeenCalledTimes(1)
    expect(props.onRetryPlugin).toHaveBeenCalledWith("codex")
  })

  it("passes selected provider accounts to provider detail view", () => {
    const props = createProps()
    const visible = providerAccount()
    const hidden = providerAccount({
      localAccountFingerprint: "fp-hidden",
      label: "Hidden Codex",
      visibility: "hidden",
    })
    const notDetected = providerAccount({
      localAccountFingerprint: "fp-old",
      label: "Old Codex",
      detectionState: "notDetected",
    })
    props.providerAccountGroups = [
      {
        providerId: "codex",
        providerName: "Codex",
        visibleAccounts: [visible],
        hiddenAccounts: [hidden],
        notDetectedAccounts: [notDetected],
      },
      {
        providerId: "claude",
        providerName: "Claude",
        visibleAccounts: [providerAccount({ providerId: "claude" })],
        hiddenAccounts: [],
        notDetectedAccounts: [],
      },
    ]
    useAppUiStore.getState().setActiveView("codex")

    render(<AppContent {...props} />)

    expect(providerDetailPageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        providerAccounts: [visible, hidden, notDetected],
      })
    )
  })
})
