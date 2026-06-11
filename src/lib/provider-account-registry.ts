import {
  fingerprintProviderAccount,
  type ProviderAccountFingerprintErrorCode,
  type ProviderAccountIdentityKind,
} from "@/lib/provider-account-fingerprint"

export const PROVIDER_ACCOUNT_IDENTITY_CONFIDENCES = ["high", "medium", "low"] as const

export type ProviderAccountIdentityConfidence =
  (typeof PROVIDER_ACCOUNT_IDENTITY_CONFIDENCES)[number]

export type ProviderAccountVisibility = "visible" | "hidden"
export type ProviderAccountConfirmationState = "confirmed" | "unconfirmed"
export type ProviderAccountDetectionState = "detected" | "notDetected"

export type LocalProviderAccount = {
  providerId: string
  localAccountFingerprint: string
  label: string
  visibility: ProviderAccountVisibility
  identityConfidence: ProviderAccountIdentityConfidence
  confirmationState: ProviderAccountConfirmationState
  firstSeenAt: string
  lastSeenAt: string
  detectionState: ProviderAccountDetectionState
}

export type ProviderAccountRegistry = {
  accounts: LocalProviderAccount[]
}

export type ProviderAccountDetectionCandidate = {
  providerId: string
  providerName: string
  identityKind: ProviderAccountIdentityKind
  identityValue: string
  identityConfidence: ProviderAccountIdentityConfidence
  label?: string
}

export type ProviderAccountDetection = ProviderAccountDetectionCandidate & {
  localSalt: string
}

export type SyncProviderAccountRegistryInput = {
  registry: ProviderAccountRegistry
  detectedAccounts: ProviderAccountDetection[]
  scannedProviderIds: string[]
  detectedAt: string
}

export type ProviderAccountRegistryErrorCode =
  | ProviderAccountFingerprintErrorCode
  | "account-label-required"
  | "account-not-found"
  | "account-still-detected"
  | "confirmation-state-invalid"
  | "detected-at-required"
  | "identity-confidence-invalid"
  | "local-account-fingerprint-required"
  | "visibility-invalid"

export type ProviderAccountRegistryResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: ProviderAccountRegistryErrorCode; message: string }

const IDENTITY_CONFIDENCE_SET = new Set<string>(PROVIDER_ACCOUNT_IDENTITY_CONFIDENCES)

export async function syncProviderAccountRegistry(
  input: SyncProviderAccountRegistryInput
): Promise<ProviderAccountRegistryResult<ProviderAccountRegistry>> {
  const detectedAt = input.detectedAt.trim()
  if (!detectedAt) {
    return error("detected-at-required", "Provider account detected time is required.")
  }

  const registry = copyRegistry(input.registry)
  const scannedProviderIds = new Set(input.scannedProviderIds.map(trimString).filter(Boolean))
  const existingByFingerprint = new Map(
    registry.accounts.map((account) => [account.localAccountFingerprint, account])
  )
  const nextByFingerprint = new Map<string, LocalProviderAccount>()
  const newAccounts: LocalProviderAccount[] = []

  for (const detection of input.detectedAccounts) {
    if (!isIdentityConfidence(detection.identityConfidence)) {
      return error(
        "identity-confidence-invalid",
        "Provider account identity confidence is invalid."
      )
    }

    const fingerprintResult = await fingerprintProviderAccount({
      providerId: detection.providerId,
      identityKind: detection.identityKind,
      identityValue: detection.identityValue,
      localSalt: detection.localSalt,
    })
    if (!fingerprintResult.ok) return fingerprintResult

    const providerId = detection.providerId.trim()
    scannedProviderIds.add(providerId)
    const localAccountFingerprint = fingerprintResult.value.fingerprint
    const alreadyDetected = nextByFingerprint.get(localAccountFingerprint)
    if (alreadyDetected) {
      nextByFingerprint.set(localAccountFingerprint, {
        ...alreadyDetected,
        lastSeenAt: detectedAt,
        detectionState: "detected",
      })
      continue
    }

    const existing = existingByFingerprint.get(localAccountFingerprint)

    if (existing) {
      nextByFingerprint.set(localAccountFingerprint, {
        ...existing,
        providerId,
        identityConfidence: detection.identityConfidence,
        lastSeenAt: detectedAt,
        detectionState: "detected",
      })
      continue
    }

    const account: LocalProviderAccount = {
      providerId,
      localAccountFingerprint,
      label: normalizeLabel(detection.label) || fallbackLabel(detection, [
        ...registry.accounts,
        ...newAccounts,
      ]),
      visibility: "visible",
      identityConfidence: detection.identityConfidence,
      confirmationState: "unconfirmed",
      firstSeenAt: detectedAt,
      lastSeenAt: detectedAt,
      detectionState: "detected",
    }
    newAccounts.push(account)
    nextByFingerprint.set(localAccountFingerprint, account)
  }

  return {
    ok: true,
    value: {
      accounts: [
        ...registry.accounts.map((account) =>
          nextByFingerprint.get(account.localAccountFingerprint) ??
          markMissingAccount(account, scannedProviderIds)
        ),
        ...newAccounts,
      ],
    },
  }
}

export function updateProviderAccountLabel(
  registry: ProviderAccountRegistry,
  localAccountFingerprint: string,
  label: string
): ProviderAccountRegistryResult<ProviderAccountRegistry> {
  const normalizedLabel = normalizeLabel(label)
  if (!normalizedLabel) {
    return error("account-label-required", "Provider account label is required.")
  }
  return updateProviderAccount(registry, localAccountFingerprint, (account) => ({
    ...account,
    label: normalizedLabel,
  }))
}

export function updateProviderAccountVisibility(
  registry: ProviderAccountRegistry,
  localAccountFingerprint: string,
  visibility: ProviderAccountVisibility
): ProviderAccountRegistryResult<ProviderAccountRegistry> {
  if (visibility !== "visible" && visibility !== "hidden") {
    return error("visibility-invalid", "Provider account visibility is invalid.")
  }
  return updateProviderAccount(registry, localAccountFingerprint, (account) => ({
    ...account,
    visibility,
  }))
}

export function updateProviderAccountConfirmationState(
  registry: ProviderAccountRegistry,
  localAccountFingerprint: string,
  confirmationState: ProviderAccountConfirmationState
): ProviderAccountRegistryResult<ProviderAccountRegistry> {
  if (confirmationState !== "confirmed" && confirmationState !== "unconfirmed") {
    return error(
      "confirmation-state-invalid",
      "Provider account confirmation state is invalid."
    )
  }
  return updateProviderAccount(registry, localAccountFingerprint, (account) => ({
    ...account,
    confirmationState,
  }))
}

export function forgetProviderAccount(
  registry: ProviderAccountRegistry,
  localAccountFingerprint: string
): ProviderAccountRegistryResult<ProviderAccountRegistry> {
  const fingerprint = localAccountFingerprint.trim()
  if (!fingerprint) {
    return error(
      "local-account-fingerprint-required",
      "Provider account fingerprint is required."
    )
  }

  const account = registry.accounts.find(
    (candidate) => candidate.localAccountFingerprint === fingerprint
  )
  if (!account) return error("account-not-found", "Provider account was not found.")
  if (account.detectionState === "detected") {
    return error(
      "account-still-detected",
      "Detected provider accounts cannot be forgotten."
    )
  }

  return {
    ok: true,
    value: {
      accounts: registry.accounts.filter(
        (candidate) => candidate.localAccountFingerprint !== fingerprint
      ),
    },
  }
}

export function normalizeProviderAccountRegistry(
  value: unknown
): ProviderAccountRegistry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (!Array.isArray(row.accounts)) return null

  const fingerprints = new Set<string>()
  const accounts: LocalProviderAccount[] = []
  for (const accountValue of row.accounts) {
    const account = normalizeProviderAccount(accountValue)
    if (!account || fingerprints.has(account.localAccountFingerprint)) continue
    fingerprints.add(account.localAccountFingerprint)
    accounts.push(account)
  }
  return { accounts }
}

function updateProviderAccount(
  registry: ProviderAccountRegistry,
  localAccountFingerprint: string,
  update: (account: LocalProviderAccount) => LocalProviderAccount
): ProviderAccountRegistryResult<ProviderAccountRegistry> {
  const fingerprint = localAccountFingerprint.trim()
  if (!fingerprint) {
    return error(
      "local-account-fingerprint-required",
      "Provider account fingerprint is required."
    )
  }

  let found = false
  const accounts = registry.accounts.map((account) => {
    if (account.localAccountFingerprint !== fingerprint) return account
    found = true
    return update(account)
  })
  return found
    ? { ok: true, value: { accounts } }
    : error("account-not-found", "Provider account was not found.")
}

function normalizeProviderAccount(value: unknown): LocalProviderAccount | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const account = {
    providerId: stringField(row.providerId),
    localAccountFingerprint: stringField(row.localAccountFingerprint),
    label: stringField(row.label),
    visibility: row.visibility,
    identityConfidence: row.identityConfidence,
    confirmationState: row.confirmationState,
    firstSeenAt: stringField(row.firstSeenAt),
    lastSeenAt: stringField(row.lastSeenAt),
    detectionState: row.detectionState,
  }

  if (
    !account.providerId ||
    !account.localAccountFingerprint ||
    !account.label ||
    !account.firstSeenAt ||
    !account.lastSeenAt ||
    (account.visibility !== "visible" && account.visibility !== "hidden") ||
    !isIdentityConfidence(account.identityConfidence) ||
    (account.confirmationState !== "confirmed" &&
      account.confirmationState !== "unconfirmed") ||
    (account.detectionState !== "detected" &&
      account.detectionState !== "notDetected")
  ) {
    return null
  }

  return account as LocalProviderAccount
}

function markMissingAccount(
  account: LocalProviderAccount,
  scannedProviderIds: Set<string>
): LocalProviderAccount {
  if (!scannedProviderIds.has(account.providerId)) return account
  return account.detectionState === "notDetected"
    ? account
    : { ...account, detectionState: "notDetected" }
}

function fallbackLabel(
  detection: ProviderAccountDetection,
  accounts: LocalProviderAccount[]
): string {
  const providerName = detection.providerName.trim() || detection.providerId.trim()
  const providerAccountCount = accounts.filter(
    (account) => account.providerId === detection.providerId.trim()
  ).length
  return `${providerName} account ${providerAccountCount + 1}`
}

function copyRegistry(registry: ProviderAccountRegistry): ProviderAccountRegistry {
  return { accounts: registry.accounts.map((account) => ({ ...account })) }
}

function isIdentityConfidence(value: unknown): value is ProviderAccountIdentityConfidence {
  return typeof value === "string" && IDENTITY_CONFIDENCE_SET.has(value)
}

function normalizeLabel(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function trimString(value: string): string {
  return value.trim()
}

function error<T>(
  code: ProviderAccountRegistryErrorCode,
  message: string
): ProviderAccountRegistryResult<T> {
  return { ok: false, code, message }
}
