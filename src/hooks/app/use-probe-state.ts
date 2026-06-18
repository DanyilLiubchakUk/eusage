import { useCallback, useEffect, useRef, useState } from "react"
import type { PluginOutput } from "@/lib/plugin-types"
import type { PluginState } from "@/hooks/app/types"
import { fingerprintProviderAccount } from "@/lib/provider-account-fingerprint"
import {
  getOrCreateProviderAccountLocalSalt,
  syncSavedProviderAccountRegistry,
} from "@/lib/provider-account-registry-store"

type UseProbeStateArgs = {
  onProbeResult?: () => void
  onProviderAccountRegistryChange?: () => void
}

export function useProbeState({
  onProbeResult,
  onProviderAccountRegistryChange,
}: UseProbeStateArgs) {
  const [pluginStates, setPluginStates] = useState<Record<string, PluginState>>({})

  const pluginStatesRef = useRef(pluginStates)
  useEffect(() => {
    pluginStatesRef.current = pluginStates
  }, [pluginStates])

  const manualRefreshIdsRef = useRef<Set<string>>(new Set())

  const updatePluginStates = useCallback(
    (
      updater: (
        previousStates: Record<string, PluginState>
      ) => Record<string, PluginState>
    ) => {
      const nextStates = updater(pluginStatesRef.current)
      pluginStatesRef.current = nextStates
      setPluginStates(nextStates)
    },
    []
  )

  const getErrorMessage = useCallback((output: PluginOutput) => {
    if (output.lines.length !== 1) return null
    const line = output.lines[0]
    if (line.type === "badge" && line.label === "Error") {
      return line.text || "Couldn't update data. Try again?"
    }
    return null
  }, [])

  const setLoadingForPlugins = useCallback((ids: string[]) => {
    updatePluginStates((prev) => {
      const next = { ...prev }
      for (const id of ids) {
        const existing = prev[id]
        next[id] = {
          data: existing?.data ?? null,
          loading: true,
          error: null,
          lastManualRefreshAt: existing?.lastManualRefreshAt ?? null,
          lastUpdatedAt: existing?.lastUpdatedAt ?? null,
        }
      }
      return next
    })
  }, [updatePluginStates])

  const setErrorForPlugins = useCallback((ids: string[], error: string) => {
    updatePluginStates((prev) => {
      const next = { ...prev }
      for (const id of ids) {
        const existing = prev[id]
        next[id] = {
          data: existing?.data ?? null,
          loading: false,
          error,
          lastManualRefreshAt: existing?.lastManualRefreshAt ?? null,
          lastUpdatedAt: existing?.lastUpdatedAt ?? null,
        }
      }
      return next
    })
  }, [updatePluginStates])

  const handleProbeResult = useCallback(
    (output: PluginOutput) => {
      const errorMessage = getErrorMessage(output)
      const isManual = manualRefreshIdsRef.current.has(output.providerId)
      if (isManual) {
        manualRefreshIdsRef.current.delete(output.providerId)
      }

      const now = Date.now()
      updatePluginStates((prev) => {
        const existing = prev[output.providerId]
        return {
          ...prev,
          [output.providerId]: {
            data: errorMessage ? (existing?.data ?? null) : output,
            loading: false,
            error: errorMessage,
            lastManualRefreshAt: !errorMessage && isManual
              ? now
              : existing?.lastManualRefreshAt ?? null,
            lastUpdatedAt: errorMessage ? (existing?.lastUpdatedAt ?? null) : now,
          },
        }
      })

      void syncProviderAccountsFromProbeOutput(output, errorMessage)
        .then(({ didSync, output: syncedOutput }) => {
          if (syncedOutput !== output) {
            updatePluginStates((prev) => {
              const existing = prev[output.providerId]
              if (!existing || existing.data !== output) return prev
              return {
                ...prev,
                [output.providerId]: {
                  ...existing,
                  data: syncedOutput,
                },
              }
            })
          }
          if (didSync) onProviderAccountRegistryChange?.()
        })
      onProbeResult?.()
    },
    [getErrorMessage, onProbeResult, onProviderAccountRegistryChange, updatePluginStates]
  )

  return {
    pluginStates,
    pluginStatesRef,
    manualRefreshIdsRef,
    setLoadingForPlugins,
    setErrorForPlugins,
    handleProbeResult,
  }
}

async function syncProviderAccountsFromProbeOutput(
  output: PluginOutput,
  errorMessage: string | null
): Promise<{ didSync: boolean; output: PluginOutput }> {
  if (errorMessage) return { didSync: false, output }

  try {
    const candidates = getProviderAccountDetections(output)
    const localSalt = candidates.length > 0
      ? await getOrCreateProviderAccountLocalSalt()
      : ""
    const syncedOutput = localSalt
      ? await attachLocalAccountFingerprints(output, localSalt)
      : output
    const result = await syncSavedProviderAccountRegistry({
      detectedAccounts: candidates.map((candidate) => ({
        ...candidate,
        localSalt,
      })),
      scannedProviderIds: [output.providerId],
      detectedAt: new Date().toISOString(),
    })
    if (!result.ok) {
      console.error("Failed to sync provider account registry:", result)
      return { didSync: false, output: syncedOutput }
    }
    return { didSync: true, output: syncedOutput }
  } catch (error) {
    console.error("Failed to sync provider account registry:", error)
    return { didSync: false, output }
  }
}

function getProviderAccountDetections(output: PluginOutput) {
  return [
    ...(output.providerAccountDetections ?? []),
    ...(output.providerAccountOutputs ?? []).flatMap(
      (accountOutput) => accountOutput.providerAccountDetections
    ),
  ]
}

async function attachLocalAccountFingerprints(
  output: PluginOutput,
  localSalt: string
): Promise<PluginOutput> {
  if (!output.providerAccountOutputs?.length) return output

  let changed = false
  const providerAccountOutputs = await Promise.all(
    output.providerAccountOutputs.map(async (accountOutput) => {
      const [detection] = accountOutput.providerAccountDetections
      if (!detection) return accountOutput

      const fingerprintResult = await fingerprintProviderAccount({
        providerId: detection.providerId,
        identityKind: detection.identityKind,
        identityValue: detection.identityValue,
        localSalt,
      })
      if (!fingerprintResult.ok) return accountOutput

      const localAccountFingerprint = fingerprintResult.value.fingerprint
      if (accountOutput.localAccountFingerprint === localAccountFingerprint) {
        return accountOutput
      }

      changed = true
      return {
        ...accountOutput,
        localAccountFingerprint,
      }
    })
  )

  return changed ? { ...output, providerAccountOutputs } : output
}
