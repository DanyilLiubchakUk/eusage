import { invoke } from "@tauri-apps/api/core"
import { readTeamSettings } from "@/lib/team-settings"
import {
  DEFAULT_PROVIDER_ACCOUNT_SHARING_SETTINGS,
  normalizeProviderAccountSharingSettings,
  type ProviderAccountSharingSettings,
} from "@/lib/provider-account-sharing"

let sharingWrites = Promise.resolve()

function writeSharing(
  settings: ProviderAccountSharingSettings | null,
  expectedConnectionId: string | null
): Promise<boolean> {
  const result = sharingWrites.then(() => invoke<boolean>("save_provider_account_sharing", {
    settings, expectedConnectionId,
  }))
  sharingWrites = result.then(() => undefined, () => undefined)
  return result
}

export async function loadProviderAccountSharingSettings(): Promise<
  ProviderAccountSharingSettings
> {
  await sharingWrites
  const snapshot = await readTeamSettings()
  const teamFingerprint = activeTeamFingerprint(snapshot.teamConnection)
  const connectionId = snapshot.teamConnection?.connectionId ?? null
  const settings = normalizeProviderAccountSharingSettings(
    snapshot.providerAccountSharing,
    teamFingerprint,
    connectionId
  ) ?? DEFAULT_PROVIDER_ACCOUNT_SHARING_SETTINGS
  return { ...settings, connectionId }
}

export function saveProviderAccountSharingSettings(
  settings: ProviderAccountSharingSettings
): Promise<boolean> {
  return writeSharing(settings, settings.connectionId ?? null)
}

export function clearProviderAccountSharingSettings(settings: ProviderAccountSharingSettings): Promise<boolean> {
  return writeSharing(null, settings.connectionId ?? null)
}

function activeTeamFingerprint(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const teamFingerprint = (value as Record<string, unknown>).teamFingerprint
  return typeof teamFingerprint === "string" && teamFingerprint.trim()
    ? teamFingerprint.trim()
    : null
}
