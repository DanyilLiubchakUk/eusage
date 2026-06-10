import { invoke } from "@tauri-apps/api/core"
import type { LocalProviderAccount } from "@/lib/provider-account-registry"

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
): Promise<void> {
  await invoke("upload_shared_provider_account_current_data", {
    providerId: account.providerId,
    localAccountFingerprint: account.localAccountFingerprint,
    label: account.label,
  })
}

export async function syncSharedProviderAccount(
  account: LocalProviderAccount
): Promise<void> {
  await uploadSharedProviderAccountCurrentData(account)
  await updateSharedProviderAccountLabel(account)
}
