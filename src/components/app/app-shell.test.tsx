import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  useAppUpdateMock,
  useAppVersionMock,
  usePanelMock,
  useWindowsTrayGuidanceMock,
} = vi.hoisted(() => ({
  useAppUpdateMock: vi.fn(),
  useAppVersionMock: vi.fn(),
  usePanelMock: vi.fn(),
  useWindowsTrayGuidanceMock: vi.fn(),
}))

vi.mock("@/components/app/app-content", () => ({
  AppContent: () => <div data-testid="app-content" />,
}))

vi.mock("@/components/panel-footer", () => ({
  PanelFooter: () => <div data-testid="panel-footer" />,
}))

vi.mock("@/components/side-nav", () => ({
  SideNav: () => <div data-testid="side-nav" />,
}))

vi.mock("@/components/app/windows-tray-guidance", () => ({
  WindowsTrayGuidance: () => <div data-testid="windows-tray-guidance" />,
}))

vi.mock("@/hooks/app/use-app-version", () => ({
  useAppVersion: useAppVersionMock,
}))

vi.mock("@/hooks/app/use-panel", () => ({
  usePanel: usePanelMock,
}))

vi.mock("@/hooks/app/use-windows-tray-guidance", () => ({
  useWindowsTrayGuidance: useWindowsTrayGuidanceMock,
}))

vi.mock("@/hooks/use-app-update", () => ({
  useAppUpdate: useAppUpdateMock,
}))

import { AppShell } from "@/components/app/app-shell"
import { useAppUiStore } from "@/stores/app-ui-store"

function createProps() {
  return {
    onRefreshAll: vi.fn(),
    navPlugins: [],
    displayPlugins: [],
    settingsPlugins: [],
    autoUpdateNextAt: null,
    selectedPlugin: null,
    onPluginContextAction: vi.fn(),
    isPluginRefreshAvailable: vi.fn(),
    onNavReorder: vi.fn(),
    appContentProps: {} as never,
  }
}

describe("AppShell", () => {
  beforeEach(() => {
    useAppUiStore.getState().resetState()

    useAppVersionMock.mockReset()
    usePanelMock.mockReset()
    useWindowsTrayGuidanceMock.mockReset()
    useAppUpdateMock.mockReset()

    useAppVersionMock.mockReturnValue("0.0.0")
    usePanelMock.mockReturnValue({
      containerRef: { current: null },
      scrollRef: { current: null },
      canScrollDown: false,
      maxPanelHeightPx: 500,
    })
    useWindowsTrayGuidanceMock.mockReturnValue({
      visible: false,
      dismiss: vi.fn(),
      isWindows: false,
    })
    useAppUpdateMock.mockReturnValue({
      updateStatus: "idle",
      triggerInstall: vi.fn(),
      checkForUpdates: vi.fn(),
    })
  })

  it("keeps the macOS tray frame and top caret", () => {
    render(<AppShell {...createProps()} />)

    const shell = document.querySelector("[data-tray-shell='default']")

    expect(shell).toHaveClass("p-6", "pt-1.5")
    expect(shell).not.toHaveClass("p-0")
    expect(document.querySelector(".tray-arrow--top")).toBeInTheDocument()
    expect(document.querySelector(".tray-arrow--bottom")).not.toBeInTheDocument()
    expect(screen.getByTestId("app-content").closest(".rounded-xl")).toHaveStyle({
      maxHeight: "463px",
    })
  })

  it("uses a flush Windows tray frame and bottom caret", () => {
    useWindowsTrayGuidanceMock.mockReturnValue({
      visible: false,
      dismiss: vi.fn(),
      isWindows: true,
    })

    render(<AppShell {...createProps()} />)

    const shell = document.querySelector("[data-tray-shell='windows']")

    expect(shell).toHaveClass("p-0", "bg-card")
    expect(shell).not.toHaveClass("p-6")
    expect(document.querySelector(".tray-arrow--top")).not.toBeInTheDocument()
    expect(document.querySelector(".tray-arrow--bottom")).toBeInTheDocument()
    expect(screen.getByTestId("app-content").closest(".rounded-xl")).toHaveStyle({
      maxHeight: "493px",
    })
  })
})
