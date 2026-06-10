import { LazyStore } from "@tauri-apps/plugin-store"
import {
  DEFAULT_PROVIDER_ACCOUNT_SHARING_SETTINGS,
  normalizeProviderAccountSharingSettings,
  type ProviderAccountSharingSettings,
} from "@/lib/provider-account-sharing"

const SETTINGS_STORE_PATH = "settings.json"
const PROVIDER_ACCOUNT_SHARING_KEY = "providerAccountSharing"

const store = new LazyStore(SETTINGS_STORE_PATH)

type StoreWithDelete = {
  delete?: (key: string) => Promise<void>
}

async function deleteStoreKey(key: string): Promise<void> {
  const maybeDelete = (store as unknown as StoreWithDelete).delete
  if (typeof maybeDelete === "function") {
    await maybeDelete.call(store, key)
    return
  }
  await store.set(key, null)
}

export async function loadProviderAccountSharingSettings(): Promise<
  ProviderAccountSharingSettings
> {
  return normalizeProviderAccountSharingSettings(
    await store.get<unknown>(PROVIDER_ACCOUNT_SHARING_KEY)
  ) ?? { ...DEFAULT_PROVIDER_ACCOUNT_SHARING_SETTINGS }
}

export async function saveProviderAccountSharingSettings(
  settings: ProviderAccountSharingSettings
): Promise<void> {
  await store.set(PROVIDER_ACCOUNT_SHARING_KEY, settings)
  await store.save()
}

export async function clearProviderAccountSharingSettings(): Promise<void> {
  await deleteStoreKey(PROVIDER_ACCOUNT_SHARING_KEY)
  await store.save()
}
