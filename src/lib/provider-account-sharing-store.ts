import { LazyStore } from "@tauri-apps/plugin-store"
import {
  DEFAULT_PROVIDER_ACCOUNT_SHARING_SETTINGS,
  normalizeProviderAccountSharingSettings,
  withProviderAccountSharingTeamFingerprint,
  type ProviderAccountSharingSettings,
} from "@/lib/provider-account-sharing"

const SETTINGS_STORE_PATH = "settings.json"
const TEAM_CONNECTION_KEY = "teamConnection"
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
  const teamFingerprint = activeTeamFingerprint(
    await store.get<unknown>(TEAM_CONNECTION_KEY)
  )
  return normalizeProviderAccountSharingSettings(
    await store.get<unknown>(PROVIDER_ACCOUNT_SHARING_KEY),
    teamFingerprint
  ) ?? { ...DEFAULT_PROVIDER_ACCOUNT_SHARING_SETTINGS }
}

export async function saveProviderAccountSharingSettings(
  settings: ProviderAccountSharingSettings
): Promise<void> {
  const teamFingerprint = activeTeamFingerprint(
    await store.get<unknown>(TEAM_CONNECTION_KEY)
  )
  if (!teamFingerprint) {
    throw new Error("Team fingerprint is required for Provider Account sharing.")
  }
  await store.set(
    PROVIDER_ACCOUNT_SHARING_KEY,
    withProviderAccountSharingTeamFingerprint(settings, teamFingerprint)
  )
  await store.save()
}

export async function clearProviderAccountSharingSettings(): Promise<void> {
  await deleteStoreKey(PROVIDER_ACCOUNT_SHARING_KEY)
  await store.save()
}

function activeTeamFingerprint(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const teamFingerprint = (value as Record<string, unknown>).teamFingerprint
  return typeof teamFingerprint === "string" && teamFingerprint.trim()
    ? teamFingerprint.trim()
    : null
}
