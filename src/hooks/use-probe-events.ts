import { useCallback, useEffect, useRef } from "react"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { invoke } from "@tauri-apps/api/core"
import type { PluginOutput } from "@/lib/plugin-types"

type ProbeResult = {
  batchId: string
  output: PluginOutput
}

type ProbeBatchComplete = {
  batchId: string
}

type ProbeBatchStarted = {
  batchId: string
  pluginIds: string[]
}

type UseProbeEventsOptions = {
  onResult: (output: PluginOutput) => void
  onBatchComplete: () => void
}

export function useProbeEvents({ onResult, onBatchComplete }: UseProbeEventsOptions) {
  const activeBatchIds = useRef<Set<string>>(new Set())
  const callbacks = useRef({ onResult, onBatchComplete })
  callbacks.current = { onResult, onBatchComplete }
  const listenersReadyRef = useRef<Promise<void> | null>(null)

  useEffect(() => {
    let cancelled = false
    const unlisteners: UnlistenFn[] = []
    const cleanup = () => unlisteners.splice(0).forEach((unlisten) => unlisten())

    const setup = async () => {
      const resultUnlisten = await listen<ProbeResult>("probe:result", (event) => {
        if (activeBatchIds.current.has(event.payload.batchId)) {
          callbacks.current.onResult(event.payload.output)
        }
      })

      if (cancelled) {
        resultUnlisten()
        return
      }
      unlisteners.push(resultUnlisten)

      const completeUnlisten = await listen<ProbeBatchComplete>(
        "probe:batch-complete",
        (event) => {
          if (activeBatchIds.current.delete(event.payload.batchId)) {
            callbacks.current.onBatchComplete()
          }
        }
      )

      if (cancelled) {
        completeUnlisten()
        return
      }
      unlisteners.push(completeUnlisten)
    }

    let rejectReady: (error: Error) => void
    const ready = new Promise<void>((resolve, reject) => {
      rejectReady = reject
      void setup().then(resolve, reject)
    })
    listenersReadyRef.current = ready
    // Keep the rejection available to startBatch without an unhandled rejection
    // when listener setup fails before the first refresh.
    void ready.catch((error) => {
      cleanup()
      if (!cancelled) console.error("Failed to listen for probe events:", error)
    })

    return () => {
      cancelled = true
      rejectReady(new Error("Probe listeners stopped"))
      cleanup()
      activeBatchIds.current.clear()
      listenersReadyRef.current = null
    }
  }, [])

  const startBatch = useCallback(async (pluginIds?: string[]) => {
    const ready = listenersReadyRef.current
    if (!ready) throw new Error("Probe listeners are not active")
    await ready
    if (listenersReadyRef.current !== ready) {
      throw new Error("Probe listeners stopped")
    }

    const batchId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `batch-${Date.now()}-${Math.random().toString(16).slice(2)}`

    activeBatchIds.current.add(batchId)
    const args = pluginIds
      ? { batchId, pluginIds }
      : { batchId }
    try {
      const result = await invoke<ProbeBatchStarted>("start_probe_batch", args)
      return result.pluginIds
    } catch (error) {
      activeBatchIds.current.delete(batchId)
      throw error
    }
  }, [])

  return { startBatch }
}
