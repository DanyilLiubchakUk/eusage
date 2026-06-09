export const PROVIDER_ACCOUNT_IDENTITY_KINDS = [
  "providerAccountId",
  "providerEmail",
  "providerUserId",
  "localProfilePath",
  "credentialSource",
] as const

export type ProviderAccountIdentityKind =
  (typeof PROVIDER_ACCOUNT_IDENTITY_KINDS)[number]

export type ProviderAccountFingerprintScope = "local" | "team"

export type ProviderAccountFingerprintInput = {
  providerId: string
  identityKind: ProviderAccountIdentityKind
  identityValue: string
  localSalt: string
  teamFingerprint?: string
}

export type ProviderAccountFingerprintValue = {
  scope: ProviderAccountFingerprintScope
  fingerprint: string
}

export type ProviderAccountFingerprintErrorCode =
  | "provider-id-required"
  | "identity-kind-invalid"
  | "identity-value-required"
  | "local-salt-required"

export type ProviderAccountFingerprintResult =
  | { ok: true; value: ProviderAccountFingerprintValue }
  | { ok: false; code: ProviderAccountFingerprintErrorCode; message: string }

const IDENTITY_KIND_SET = new Set<string>(PROVIDER_ACCOUNT_IDENTITY_KINDS)

export async function fingerprintProviderAccount(
  input: ProviderAccountFingerprintInput
): Promise<ProviderAccountFingerprintResult> {
  const providerId = input.providerId.trim()
  if (!providerId) {
    return error("provider-id-required", "Provider id is required.")
  }

  if (!IDENTITY_KIND_SET.has(input.identityKind)) {
    return error("identity-kind-invalid", "Provider account identity kind is invalid.")
  }

  const identityValue = input.identityValue.trim()
  if (!identityValue) {
    return error("identity-value-required", "Provider account identity value is required.")
  }

  const localSalt = input.localSalt.trim()
  if (!localSalt) {
    return error("local-salt-required", "Provider account local salt is required.")
  }

  const teamFingerprint = input.teamFingerprint?.trim()
  const scope: ProviderAccountFingerprintScope = teamFingerprint ? "team" : "local"
  const scopeSecret = teamFingerprint || localSalt

  return {
    ok: true,
    value: {
      scope,
      fingerprint: await sha256Hex(
        [
          "provider-account-fingerprint:v1",
          scope,
          providerId,
          input.identityKind,
          identityValue,
          scopeSecret,
        ].join("\0")
      ),
    },
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function error(
  code: ProviderAccountFingerprintErrorCode,
  message: string
): Extract<ProviderAccountFingerprintResult, { ok: false }> {
  return { ok: false, code, message }
}
