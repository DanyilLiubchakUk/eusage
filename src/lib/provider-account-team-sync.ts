import { invoke } from "@tauri-apps/api/core"
import type { LocalProviderAccount } from "@/lib/provider-account-registry"

export type SharedProviderAccountCurrentDataUploadResult = {
  currentDataQueued: boolean
}

export type SharedProviderAccountSyncResult =
  | {
      ok: true
      status: "synced"
      currentDataQueued: boolean
      metadataUpdated: true
    }
  | {
      ok: true
      status: "waitingForProviderScan"
      currentDataQueued: false
      metadataUpdated: false
      message: string
    }
  | {
      ok: false
      status: "failed"
      currentDataQueued: boolean
      metadataUpdated: boolean
      message: string
    }

const FRESH_PROVIDER_SCAN_MESSAGE = "fresh provider scan"

export async function updateSharedProviderAccountLabel(
  account: LocalProviderAccount
): Promise<void> {
  await invoke("update_shared_provider_account_label", {
    providerId: account.providerId,
    localAccountFingerprint: account.localAccountFingerprint,
    label: account.label,
  })
}

export async function uploadSharedProviderAccountCurrentData(
  account: LocalProviderAccount
): Promise<SharedProviderAccountCurrentDataUploadResult> {
  const result = await invoke<SharedProviderAccountCurrentDataUploadResult>(
    "upload_shared_provider_account_current_data",
    {
      providerId: account.providerId,
      localAccountFingerprint: account.localAccountFingerprint,
      label: account.label,
    }
  )
  return { currentDataQueued: result.currentDataQueued === true }
}

export async function syncSharedProviderAccount(
  account: LocalProviderAccount
): Promise<SharedProviderAccountSyncResult> {
  const uploadResult = await uploadCurrentDataSafely(account)
  if (!uploadResult.ok) return uploadResult.result

  const currentDataQueued = uploadResult.result.currentDataQueued
  const metadataResult = await updateMetadataSafely(account)
  if (metadataResult.ok) {
    return {
      ok: true,
      status: "synced",
      currentDataQueued,
      metadataUpdated: true,
    }
  }

  if (!currentDataQueued && isFreshProviderScanMessage(metadataResult.message)) {
    return {
      ok: true,
      status: "waitingForProviderScan",
      currentDataQueued: false,
      metadataUpdated: false,
      message: "Sharing saved. Team updates after the next successful provider scan.",
    }
  }

  return {
    ok: false,
    status: "failed",
    currentDataQueued,
    metadataUpdated: false,
    message: metadataResult.message,
  }
}

async function uploadCurrentDataSafely(
  account: LocalProviderAccount
): Promise<
  | { ok: true; result: SharedProviderAccountCurrentDataUploadResult }
  | { ok: false; result: SharedProviderAccountSyncResult }
> {
  try {
    return {
      ok: true,
      result: await uploadSharedProviderAccountCurrentData(account),
    }
  } catch (error) {
    return {
      ok: false,
      result: {
        ok: false,
        status: "failed",
        currentDataQueued: false,
        metadataUpdated: false,
        message: getSyncErrorMessage(error),
      },
    }
  }
}

async function updateMetadataSafely(
  account: LocalProviderAccount
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await updateSharedProviderAccountLabel(account)
    return { ok: true }
  } catch (error) {
    return { ok: false, message: getSyncErrorMessage(error) }
  }
}

function isFreshProviderScanMessage(message: string): boolean {
  return message.toLowerCase().includes(FRESH_PROVIDER_SCAN_MESSAGE)
}

function getSyncErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "Team Provider Account update failed."
}
