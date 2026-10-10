import { act, render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { currentMonitor, getCurrentWindow, setSize, onScaleChanged, invoke, listen } = vi.hoisted(() => ({
  currentMonitor: vi.fn(),
  getCurrentWindow: vi.fn(),
  setSize: vi.fn(),
  onScaleChanged: vi.fn(),
  invoke: vi.fn(),
  listen: vi.fn(),
}))

vi.mock("@tauri-apps/api/core", () => ({
  invoke,
  isTauri: () => true,
}))
vi.mock("@tauri-apps/api/event", () => ({ listen }))
vi.mock("@tauri-apps/api/window", () => ({
  currentMonitor,
  getCurrentWindow,
  PhysicalSize: class {
    constructor(public width: number, public height: number) {}
  },
}))

import { usePanel } from "./use-panel"

const args = {
  activeView: "home" as const,
  setActiveView: () => {},
  showAbout: false,
  setShowAbout: () => {},
  displayPlugins: [],
}

function Panel({ isWindows = true }: { isWindows?: boolean }) {
  const panel = usePanel({ ...args, isWindows })
  return <div ref={panel.containerRef} data-max-height={panel.maxPanelHeightPx} />
}

function monitor(screenHeight: number, workHeight: number, scaleFactor = 1, workWidth = 1920) {
  return { size: { height: screenHeight }, workArea: { size: { height: workHeight, width: workWidth } }, scaleFactor }
}

describe("panel monitor sizing", () => {
  beforeEach(() => {
    currentMonitor.mockResolvedValue(monitor(1000, 900))
    setSize.mockResolvedValue(undefined)
    onScaleChanged.mockResolvedValue(vi.fn())
    invoke.mockResolvedValue(undefined)
    listen.mockResolvedValue(vi.fn())
    getCurrentWindow.mockReturnValue({ setSize, onScaleChanged })
  })

  it("caps Windows height using the work area excluding the taskbar", async () => {
    render(<Panel />)

    await waitFor(() => {
      expect(setSize).toHaveBeenCalledWith(expect.objectContaining({ width: 400, height: 720 }))
    })
  })

  it("keeps non-Windows content sizing and avoids Windows event subscriptions", async () => {
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(950)
    render(<Panel isWindows={false} />)

    await waitFor(() => {
      expect(setSize).toHaveBeenCalledWith(expect.objectContaining({ width: 400, height: 800 }))
    })
    expect(onScaleChanged).not.toHaveBeenCalled()
  })

  it("refreshes the monitor height on Windows focus without a view change", async () => {
    render(<Panel />)
    await waitFor(() => expect(setSize).toHaveBeenCalledTimes(1))
    currentMonitor.mockResolvedValue(monitor(800, 600))

    act(() => window.dispatchEvent(new Event("focus")))

    await waitFor(() => {
      expect(setSize).toHaveBeenLastCalledWith(expect.objectContaining({ width: 400, height: 480 }))
    })
  })

  it("uses the new native DPI factor before the renderer ratio updates", async () => {
    render(<Panel />)
    await waitFor(() => expect(onScaleChanged).toHaveBeenCalledTimes(1))
    currentMonitor.mockResolvedValue(monitor(1600, 1500, 2))

    act(() => {
      onScaleChanged.mock.calls[0][0]({ payload: { scaleFactor: 2 } })
    })

    await waitFor(() => {
      expect(setSize).toHaveBeenLastCalledWith(expect.objectContaining({ width: 800, height: 1200 }))
    })
    expect(document.querySelector("[data-max-height]")).toHaveAttribute("data-max-height", "600")
  })

  it("caps physical width on a narrow high-DPI monitor", async () => {
    currentMonitor.mockResolvedValue(monitor(1600, 1500, 2, 600))
    render(<Panel />)

    await waitFor(() => {
      expect(setSize).toHaveBeenCalledWith(expect.objectContaining({ width: 600, height: 1200 }))
    })
  })

  it("uses the monitor DPI on focus while the renderer ratio is stale", async () => {
    render(<Panel />)
    await waitFor(() => expect(setSize).toHaveBeenCalledTimes(1))
    currentMonitor.mockResolvedValue(monitor(1600, 1500, 2))

    act(() => window.dispatchEvent(new Event("focus")))

    await waitFor(() => {
      expect(setSize).toHaveBeenLastCalledWith(expect.objectContaining({ width: 800, height: 1200 }))
    })
  })

  it("ignores an old pending monitor result after a newer focus resize", async () => {
    let resolveOld!: (value: ReturnType<typeof monitor>) => void
    currentMonitor.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
    render(<Panel />)
    currentMonitor.mockResolvedValue(monitor(800, 600))

    act(() => window.dispatchEvent(new Event("focus")))
    await waitFor(() => expect(setSize).toHaveBeenCalledTimes(1))
    await act(async () => resolveOld(monitor(2000, 1900)))

    expect(setSize).toHaveBeenCalledTimes(1)
    expect(setSize).toHaveBeenLastCalledWith(expect.objectContaining({ height: 480 }))
  })

  it("serializes native resizes and skips superseded queued sizes", async () => {
    let finishFirst!: () => void
    setSize.mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve }))
    render(<Panel />)
    await waitFor(() => expect(setSize).toHaveBeenCalledTimes(1))

    currentMonitor.mockResolvedValue(monitor(800, 600))
    await act(async () => window.dispatchEvent(new Event("focus")))
    currentMonitor.mockResolvedValue(monitor(1000, 750))
    await act(async () => window.dispatchEvent(new Event("focus")))
    expect(setSize).toHaveBeenCalledTimes(1)

    await act(async () => finishFirst())
    await waitFor(() => expect(setSize).toHaveBeenCalledTimes(2))
    expect(setSize).toHaveBeenLastCalledWith(expect.objectContaining({ height: 600 }))
  })

  it("cleans registered tray listeners and reports a setup rejection", async () => {
    const unlistenNavigate = vi.fn()
    const error = new Error("synthetic listener failure")
    const logError = vi.spyOn(console, "error").mockImplementation(() => {})
    listen.mockResolvedValueOnce(unlistenNavigate).mockRejectedValueOnce(error)
    const { unmount } = render(<Panel />)

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith("Failed to listen for tray events:", error)
      expect(unlistenNavigate).toHaveBeenCalledTimes(1)
    })
    unmount()
    expect(unlistenNavigate).toHaveBeenCalledTimes(1)
  })

  it("cleans a late DPI listener and skips a resize after unmount", async () => {
    const unlisten = vi.fn()
    let resolveMonitor!: (value: ReturnType<typeof monitor>) => void
    let resolveListener!: (value: () => void) => void
    currentMonitor.mockImplementationOnce(() => new Promise((resolve) => { resolveMonitor = resolve }))
    onScaleChanged.mockImplementationOnce(() => new Promise((resolve) => { resolveListener = resolve }))
    const { unmount } = render(<Panel />)

    unmount()
    await act(async () => {
      resolveMonitor(monitor(1000, 900))
      resolveListener(unlisten)
    })

    expect(setSize).not.toHaveBeenCalled()
    expect(unlisten).toHaveBeenCalledTimes(1)
    act(() => window.dispatchEvent(new Event("focus")))
    expect(currentMonitor).toHaveBeenCalledTimes(1)
  })
})
