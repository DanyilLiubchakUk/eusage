import { useCallback, useEffect, useState } from "react"
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
  saveProviderAccountRegistry,
} from "@/lib/provider-account-registry-store"
import { loadProviderAccountSharingSettings } from "@/lib/provider-account-sharing-store"
import { updateSharedProviderAccountLabel } from "@/lib/provider-account-team-sync"

export function useProviderAccountSettings() {
  const [providerAccountRegistry, setProviderAccountRegistry] =
    useState<ProviderAccountRegistry>({ accounts: [] })
  const [providerAccountLabelSyncError, setProviderAccountLabelSyncError] =
    useState<string | null>(null)

  const reloadProviderAccountRegistry = useCallback(async () => {
    try {
      setProviderAccountRegistry(await loadProviderAccountRegistry())
    } catch (error) {
      console.error("Failed to load provider account registry:", error)
    }
  }, [])

  useEffect(() => {
    void reloadProviderAccountRegistry()
  }, [reloadProviderAccountRegistry])

  const applyRegistryUpdate = useCallback((
    update: (registry: ProviderAccountRegistry) =>
      ProviderAccountRegistryResult<ProviderAccountRegistry>,
    errorMessage: string
  ) => {
    setProviderAccountRegistry((current) => {
      const result = update(current)
      if (!result.ok) {
        console.error(errorMessage, result)
        return current
      }

      void saveProviderAccountRegistry(result.value).catch((error) => {
        console.error("Failed to save provider account registry:", error)
      })
      return result.value
    })
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
        const message =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : "Team Provider Account label update failed."
        setProviderAccountLabelSyncError(message)
        console.error("Failed to sync Provider Account label with team:", error)
      }
    },
    []
  )

  const handleProviderAccountRename = useCallback((
    localAccountFingerprint: string,
    label: string
  ) => {
    setProviderAccountLabelSyncError(null)
    setProviderAccountRegistry((current) => {
      const result = updateProviderAccountLabel(
        current,
        localAccountFingerprint,
        label
      )
      if (!result.ok) {
        console.error("Failed to rename provider account:", result)
        return current
      }

      const account = result.value.accounts.find(
        (candidate) =>
          candidate.localAccountFingerprint === localAccountFingerprint
      )
      void saveProviderAccountRegistry(result.value)
        .then(() => syncSharedProviderAccountLabel(account))
        .catch((error) => {
          console.error("Failed to save provider account registry:", error)
        })
      return result.value
    })
  }, [syncSharedProviderAccountLabel])

  const handleProviderAccountVisibilityChange = useCallback((
    localAccountFingerprint: string,
    visible: boolean
  ) => {
    applyRegistryUpdate(
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
    applyRegistryUpdate(
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
    applyRegistryUpdate(
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
