import { useCallback, useEffect, useRef, useState } from "react"
import {
  forgetProviderAccount,
  updateProviderAccountConfirmationState,
  updateProviderAccountLabel,
  updateProviderAccountVisibility,
  type LocalProviderAccount,
  type ProviderAccountRegistry,
  type ProviderAccountRegistryResult,
} from "@/lib/provider-account-registry"
import {
  loadProviderAccountRegistry,
  updateSavedProviderAccountRegistry,
} from "@/lib/provider-account-registry-store"
import { loadProviderAccountSharingSettings } from "@/lib/provider-account-sharing-store"
import { updateSharedProviderAccountLabel } from "@/lib/provider-account-team-sync"

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error
    ? error.message
    : typeof error === "string" ? error : fallback
}

export function useProviderAccountSettings() {
  const [providerAccountRegistry, setProviderAccountRegistry] =
    useState<ProviderAccountRegistry>({ accounts: [] })
  const [providerAccountLabelSyncError, setProviderAccountLabelSyncError] =
    useState<string | null>(null)
  const loadVersion = useRef(0)

  const reloadProviderAccountRegistry = useCallback(async () => {
    const version = ++loadVersion.current
    setProviderAccountLabelSyncError(null)
    try {
      const registry = await loadProviderAccountRegistry()
      if (version !== loadVersion.current) return
      setProviderAccountRegistry(registry)
    } catch (error) {
      console.error("Failed to load provider account registry:", error)
      if (version === loadVersion.current) {
        setProviderAccountLabelSyncError(
          errorMessage(error, "Provider Accounts could not be loaded.")
        )
      }
    }
  }, [])

  useEffect(() => {
    void reloadProviderAccountRegistry()
    return () => { loadVersion.current += 1 }
  }, [reloadProviderAccountRegistry])

  const applyRegistryUpdate = useCallback(async (
    update: (registry: ProviderAccountRegistry) =>
      ProviderAccountRegistryResult<ProviderAccountRegistry>,
    consoleMessage: string
  ) => {
    loadVersion.current += 1
    setProviderAccountLabelSyncError(null)
    try {
      const result = await updateSavedProviderAccountRegistry(update)
      if (!result.ok) {
        console.error(consoleMessage, result)
        setProviderAccountLabelSyncError(result.message)
        return null
      }

      setProviderAccountRegistry(result.value)
      setProviderAccountLabelSyncError(null)
      return result.value
    } catch (error) {
      console.error("Failed to save provider account registry:", error)
      setProviderAccountLabelSyncError(
        errorMessage(error, "Provider Account changes could not be saved.")
      )
      return null
    }
  }, [])

  const syncSharedProviderAccountLabel = useCallback(
    async (account?: LocalProviderAccount) => {
      if (!account) return

      try {
        const sharingSettings = await loadProviderAccountSharingSettings()
        if (
          !sharingSettings.sharedLocalAccountFingerprints.includes(
            account.localAccountFingerprint
          )
        ) {
          return
        }

        await updateSharedProviderAccountLabel(account)
      } catch (error) {
        setProviderAccountLabelSyncError(
          errorMessage(error, "Team Provider Account label update failed.")
        )
        console.error("Failed to sync Provider Account label with team:", error)
      }
    },
    []
  )

  const handleProviderAccountRename = useCallback(async (
    localAccountFingerprint: string,
    label: string
  ) => {
    const registry = await applyRegistryUpdate(
      (current) => updateProviderAccountLabel(current, localAccountFingerprint, label),
      "Failed to rename provider account:"
    )
    if (!registry) return
    const account = registry.accounts.find(
      (candidate) => candidate.localAccountFingerprint === localAccountFingerprint.trim()
    )
    await syncSharedProviderAccountLabel(account)
  }, [applyRegistryUpdate, syncSharedProviderAccountLabel])

  const handleProviderAccountVisibilityChange = useCallback((
    localAccountFingerprint: string,
    visible: boolean
  ) => {
    return applyRegistryUpdate(
      (registry) =>
        updateProviderAccountVisibility(
          registry,
          localAccountFingerprint,
          visible ? "visible" : "hidden"
        ),
      "Failed to update provider account visibility:"
    )
  }, [applyRegistryUpdate])

  const handleProviderAccountSharingConfirmation = useCallback((
    localAccountFingerprint: string
  ) => {
    return applyRegistryUpdate(
      (registry) =>
        updateProviderAccountConfirmationState(
          registry,
          localAccountFingerprint,
          "confirmed"
        ),
      "Failed to confirm provider account sharing:"
    )
  }, [applyRegistryUpdate])

  const handleProviderAccountForget = useCallback((localAccountFingerprint: string) => {
    return applyRegistryUpdate(
      (registry) => forgetProviderAccount(registry, localAccountFingerprint),
      "Failed to forget provider account:"
    )
  }, [applyRegistryUpdate])

  return {
    providerAccountRegistry,
    providerAccountLabelSyncError,
    reloadProviderAccountRegistry,
    handleProviderAccountRename,
    handleProviderAccountVisibilityChange,
    handleProviderAccountSharingConfirmation,
    handleProviderAccountForget,
  }
}
