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
const PROVIDER_ACCOUNT_LOCAL_SALT_KEY = "providerAccountLocalSalt"

const store = new LazyStore(SETTINGS_STORE_PATH)
let registryOperations = Promise.resolve()

function enqueueRegistryOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = registryOperations.then(operation)
  registryOperations = result.then(() => undefined, () => undefined)
  return result
}

async function readRegistry(): Promise<ProviderAccountRegistry> {
  return normalizeProviderAccountRegistry(
    await store.get<unknown>(PROVIDER_ACCOUNT_REGISTRY_KEY)
  ) ?? { accounts: [] }
}

async function writeStoreValue(key: string, value: unknown): Promise<void> {
  const previous = await store.get<unknown>(key)
  try {
    await store.set(key, value)
    await store.save()
  } catch (error) {
    try {
      if (previous === undefined) await store.delete(key)
      else await store.set(key, previous)
      await store.save()
    } catch (rollbackError) {
      throw Object.assign(
        new Error("Provider Account save failed and the previous local state could not be restored."),
        { errors: [error, rollbackError] }
      )
    }
    throw error
  }
}

export function loadProviderAccountRegistry(): Promise<ProviderAccountRegistry> {
  return enqueueRegistryOperation(readRegistry)
}

export function getOrCreateProviderAccountLocalSalt(): Promise<string> {
  return enqueueRegistryOperation(async () => {
    const stored = await store.get<unknown>(PROVIDER_ACCOUNT_LOCAL_SALT_KEY)
    if (typeof stored === "string" && stored.trim()) return stored.trim()

    const salt = createProviderAccountLocalSalt()
    await writeStoreValue(PROVIDER_ACCOUNT_LOCAL_SALT_KEY, salt)
    return salt
  })
}

export function updateSavedProviderAccountRegistry(
  update: (registry: ProviderAccountRegistry) =>
    | ProviderAccountRegistryResult<ProviderAccountRegistry>
    | Promise<ProviderAccountRegistryResult<ProviderAccountRegistry>>
): Promise<ProviderAccountRegistryResult<ProviderAccountRegistry>> {
  return enqueueRegistryOperation(async () => {
    const result = await update(await readRegistry())
    if (result.ok) await writeStoreValue(PROVIDER_ACCOUNT_REGISTRY_KEY, result.value)
    return result
  })
}

export function syncSavedProviderAccountRegistry(
  input: Omit<SyncProviderAccountRegistryInput, "registry">
): Promise<ProviderAccountRegistryResult<ProviderAccountRegistry>> {
  return updateSavedProviderAccountRegistry((registry) =>
    syncProviderAccountRegistry({ ...input, registry })
  )
}

function createProviderAccountLocalSalt(): string {
  const webCrypto = globalThis.crypto
  if (webCrypto?.randomUUID) {
    return webCrypto.randomUUID()
  }
  if (webCrypto?.getRandomValues) {
    const bytes = webCrypto.getRandomValues(new Uint8Array(32))
    return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
  }
  throw new Error("Provider account local salt requires Web Crypto.")
}
