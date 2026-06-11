export type ProviderAccountSharingSettings = {
  sharedLocalAccountFingerprints: string[]
}

export type StoredProviderAccountSharingSettings =
  ProviderAccountSharingSettings & {
    teamFingerprint: string
  }

export type ProviderAccountSharingSyncNotice = {
  tone: "info" | "error"
  message: string
}

export type ProviderAccountSharingErrorCode =
  | "local-account-fingerprint-required"

export type ProviderAccountSharingResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: ProviderAccountSharingErrorCode; message: string }

export const DEFAULT_PROVIDER_ACCOUNT_SHARING_SETTINGS: ProviderAccountSharingSettings = {
  sharedLocalAccountFingerprints: [],
}

export function normalizeProviderAccountSharingSettings(
  value: unknown,
  activeTeamFingerprint?: string | null
): ProviderAccountSharingSettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (!Array.isArray(row.sharedLocalAccountFingerprints)) return null
  if (activeTeamFingerprint !== undefined) {
    const activeTeam = (activeTeamFingerprint ?? "").trim()
    const teamFingerprint = stringField(row.teamFingerprint)
    if (!teamFingerprint || teamFingerprint !== activeTeam) return null
  }

  return {
    sharedLocalAccountFingerprints: normalizeFingerprints(
      row.sharedLocalAccountFingerprints
    ),
  }
}

export function updateProviderAccountSharing(
  settings: ProviderAccountSharingSettings,
  localAccountFingerprint: string,
  shared: boolean
): ProviderAccountSharingResult<ProviderAccountSharingSettings> {
  const fingerprint = localAccountFingerprint.trim()
  if (!fingerprint) {
    return {
      ok: false,
      code: "local-account-fingerprint-required",
      message: "Provider account fingerprint is required.",
    }
  }

  const fingerprints = new Set(settings.sharedLocalAccountFingerprints)
  if (shared) {
    fingerprints.add(fingerprint)
  } else {
    fingerprints.delete(fingerprint)
  }

  return {
    ok: true,
    value: {
      sharedLocalAccountFingerprints: [...fingerprints],
    },
  }
}

export function withProviderAccountSharingTeamFingerprint(
  settings: ProviderAccountSharingSettings,
  teamFingerprint: string
): StoredProviderAccountSharingSettings {
  return {
    teamFingerprint: teamFingerprint.trim(),
    sharedLocalAccountFingerprints: settings.sharedLocalAccountFingerprints,
  }
}

export function pruneProviderAccountSharing(
  settings: ProviderAccountSharingSettings,
  shareableLocalAccountFingerprints: Iterable<string>
): ProviderAccountSharingSettings {
  const shareable = new Set([...shareableLocalAccountFingerprints].map(trimString))
  return {
    sharedLocalAccountFingerprints: settings.sharedLocalAccountFingerprints.filter(
      (fingerprint) => shareable.has(fingerprint)
    ),
  }
}

export function areProviderAccountSharingSettingsEqual(
  a: ProviderAccountSharingSettings,
  b: ProviderAccountSharingSettings
): boolean {
  if (a.sharedLocalAccountFingerprints.length !== b.sharedLocalAccountFingerprints.length) {
    return false
  }
  return a.sharedLocalAccountFingerprints.every(
    (fingerprint, index) => fingerprint === b.sharedLocalAccountFingerprints[index]
  )
}

function normalizeFingerprints(value: unknown[]): string[] {
  const seen = new Set<string>()
  const fingerprints: string[] = []
  for (const item of value) {
    if (typeof item !== "string") continue
    const fingerprint = item.trim()
    if (!fingerprint || seen.has(fingerprint)) continue
    seen.add(fingerprint)
    fingerprints.push(fingerprint)
  }
  return fingerprints
}

function trimString(value: string): string {
  return value.trim()
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
