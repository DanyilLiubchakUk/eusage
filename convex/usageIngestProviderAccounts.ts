import {
  type JsonObject,
  type ProviderRejection,
  SHARED_PROVIDER_ACCOUNT_STATUS,
  type UsageIngestStore,
  type UsageProviderAccountInput,
  type UsageProviderInput,
} from "./usageIngestTypes"

export function normalizeProviderAccount(
  input: JsonObject,
  providerId: string
):
  | { ok: true; value?: UsageProviderAccountInput }
  | { ok: false; error: ProviderRejection } {
  const teamAccountFingerprint = trimString(input.providerAccountFingerprint)
  const label = trimString(input.providerAccountLabel)
  if (!teamAccountFingerprint && !label) return { ok: true }

  if (!teamAccountFingerprint) {
    return rejectProvider(
      providerId,
      "provider-account-fingerprint-required",
      "Provider Account fingerprint is required.",
      "providerAccountFingerprint"
    )
  }
  if (!label) {
    return rejectProvider(
      providerId,
      "provider-account-label-required",
      "Provider Account label is required.",
      "providerAccountLabel"
    )
  }

  return { ok: true, value: { teamAccountFingerprint, label } }
}

export async function upsertProviderAccount(args: {
  provider: UsageProviderInput
  teamId: string
  developerId: string
  now: number
  store: Pick<
    UsageIngestStore,
    "getProviderAccount" | "createProviderAccount" | "updateProviderAccount"
  >
}) {
  const providerAccount = args.provider.providerAccount
  if (!providerAccount) return

  const account = {
    teamId: args.teamId,
    developerId: args.developerId,
    providerId: args.provider.providerId,
    teamAccountFingerprint: providerAccount.teamAccountFingerprint,
    label: providerAccount.label,
    status: SHARED_PROVIDER_ACCOUNT_STATUS,
    lastSharedAt: args.now,
    updatedAt: args.now,
  }
  const existing = await args.store.getProviderAccount(account)
  if (existing) {
    await args.store.updateProviderAccount(existing._id, account)
  } else {
    await args.store.createProviderAccount({
      ...account,
      firstSharedAt: args.now,
    })
  }
}

function trimString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function rejectProvider(
  providerId: string,
  code: string,
  message: string,
  field: string
) {
  return {
    ok: false as const,
    error: {
      providerId,
      code,
      message,
      field,
    },
  }
}
