import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  invokeMock,
  isTauriMock,
  loadWindowsTrayGuidanceSeenMock,
  saveWindowsTrayGuidanceSeenMock,
} = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  isTauriMock: vi.fn(),
  loadWindowsTrayGuidanceSeenMock: vi.fn(),
  saveWindowsTrayGuidanceSeenMock: vi.fn(),
}))

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
  isTauri: isTauriMock,
}))

vi.mock("@/lib/settings", () => ({
  loadWindowsTrayGuidanceSeen: loadWindowsTrayGuidanceSeenMock,
  saveWindowsTrayGuidanceSeen: saveWindowsTrayGuidanceSeenMock,
}))

import { useWindowsTrayGuidance } from "@/hooks/app/use-windows-tray-guidance"

describe("useWindowsTrayGuidance", () => {
  beforeEach(() => {
    invokeMock.mockReset()
    isTauriMock.mockReset()
    loadWindowsTrayGuidanceSeenMock.mockReset()
    saveWindowsTrayGuidanceSeenMock.mockReset()

    isTauriMock.mockReturnValue(true)
    invokeMock.mockResolvedValue("windows")
    loadWindowsTrayGuidanceSeenMock.mockResolvedValue(false)
    saveWindowsTrayGuidanceSeenMock.mockResolvedValue(undefined)
  })

  it("shows guidance on Windows when unseen", async () => {
    const { result } = renderHook(() => useWindowsTrayGuidance())

    await waitFor(() => {
      expect(result.current.visible).toBe(true)
    })
    expect(result.current.isWindows).toBe(true)
  })

  it("stays hidden when platform is not Windows", async () => {
    invokeMock.mockResolvedValue("macos")
    const { result } = renderHook(() => useWindowsTrayGuidance())

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("get_desktop_platform")
    })

    expect(result.current.visible).toBe(false)
    expect(result.current.isWindows).toBe(false)
    expect(loadWindowsTrayGuidanceSeenMock).not.toHaveBeenCalled()
  })

  it("stays hidden when guidance was already seen", async () => {
    loadWindowsTrayGuidanceSeenMock.mockResolvedValue(true)
    const { result } = renderHook(() => useWindowsTrayGuidance())

    await waitFor(() => {
      expect(loadWindowsTrayGuidanceSeenMock).toHaveBeenCalled()
    })

    expect(result.current.visible).toBe(false)
  })

  it("dismisses and persists guidance", async () => {
    const { result } = renderHook(() => useWindowsTrayGuidance())

    await waitFor(() => {
      expect(result.current.visible).toBe(true)
    })

    act(() => {
      result.current.dismiss()
    })

    expect(result.current.visible).toBe(false)
    expect(saveWindowsTrayGuidanceSeenMock).toHaveBeenCalledWith(true)
  })
})
