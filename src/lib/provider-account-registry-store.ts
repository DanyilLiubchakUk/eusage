import { LazyStore } from "@tauri-apps/plugin-store"
import {
  normalizeProviderAccountRegistry,
  syncProviderAccountRegistry,
  type ProviderAccountRegistry,
  type ProviderAccountRegistryResult,
  type SyncProviderAccountRegistryInput,
} from "@/lib/provider-account-registry"

const SETTINGS_STORE_PATH = "settings.json"
const PROVIDER_ACCOUNT_REGISTRY_KEY = "providerAccountRegistry"

const store = new LazyStore(SETTINGS_STORE_PATH)

export async function loadProviderAccountRegistry(): Promise<ProviderAccountRegistry> {
  return normalizeProviderAccountRegistry(
    await store.get<unknown>(PROVIDER_ACCOUNT_REGISTRY_KEY)
  ) ?? { accounts: [] }
}

export async function saveProviderAccountRegistry(
  registry: ProviderAccountRegistry
): Promise<void> {
  await store.set(PROVIDER_ACCOUNT_REGISTRY_KEY, registry)
  await store.save()
}

export async function syncSavedProviderAccountRegistry(
  input: Omit<SyncProviderAccountRegistryInput, "registry">
): Promise<ProviderAccountRegistryResult<ProviderAccountRegistry>> {
  const result = await syncProviderAccountRegistry({
    ...input,
    registry: await loadProviderAccountRegistry(),
  })
  if (result.ok) await saveProviderAccountRegistry(result.value)
  return result
}
