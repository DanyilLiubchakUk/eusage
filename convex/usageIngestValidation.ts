import type { DesktopApiError } from "./desktopApiCore"
import { normalizeMetricSampleBucket } from "./usageIngestBuckets"
import { normalizeProviderAccount } from "./usageIngestProviderAccounts"
import { findUnredactedSecretPath } from "./usageIngestRedaction"
import {
  SUPPORTED_UPLOAD_SCHEMA_VERSION,
  UNKNOWN_PROVIDER_ID,
  type ExtractorVersion,
  type JsonObject,
  type MetricSource,
  type NormalizedBatch,
  type ProviderRejection,
  type UsageMetricSampleInput,
  type UsageProviderInput,
  type UsageSummary,
} from "./usageIngestTypes"

const summarySourceFields = [
  "tokensTotal",
  "estimatedCostUsd",
  "budgetUsedUsd",
  "budgetLimitUsd",
  "quotaPercent",
  "creditsUsed",
  "creditsRemaining",
  "requestsUsed",
] as const

export function normalizeBatch(batch: unknown) {
  if (!isRecord(batch)) {
    return usageError("invalid-body", "Request body must be a JSON object.")
  }

  const uploadSchemaVersion = trimString(batch.uploadSchemaVersion)
  if (!uploadSchemaVersion) {
    return usageError(
      "upload-schema-version-required",
      "Upload schema version is required."
    )
  }
  if (uploadSchemaVersion !== SUPPORTED_UPLOAD_SCHEMA_VERSION) {
    return usageError(
      "unsupported-upload-schema-version",
      "Upload schema version is not supported."
    )
  }

  const deviceId = trimString(batch.deviceId)
  if (!deviceId) return usageError("device-id-required", "Device ID is required.")

  const providers = Array.isArray(batch.providers) ? batch.providers : []
  if (providers.length === 0) {
    return usageError("usage-providers-required", "At least one provider is required.")
  }

  return { ok: true as const, deviceId, providers } satisfies {
    ok: true
  } & NormalizedBatch
}

export function normalizeProvider(input: unknown) {
  if (!isRecord(input)) {
    return rejectProvider(
      UNKNOWN_PROVIDER_ID,
      "invalid-provider-payload",
      "Provider payload must be an object."
    )
  }

  const providerId = trimString(input.providerId) ?? UNKNOWN_PROVIDER_ID
  if (providerId === UNKNOWN_PROVIDER_ID) {
    return rejectProvider(
      providerId,
      "provider-id-required",
      "Provider ID is required.",
      "providerId"
    )
  }

  const payload = input.payload
  if (!isRecord(payload)) {
    return rejectProvider(
      providerId,
      "provider-payload-required",
      "Provider payload must be a JSON object.",
      "payload"
    )
  }

  const secretField = findUnredactedSecretPath(payload)
  if (secretField) {
    return rejectProvider(
      providerId,
      "secret-not-redacted",
      "Provider payload contains an unredacted secret field.",
      secretField
    )
  }

  const common = normalizeProviderCommon(input, providerId)
  if (!common.ok) return common

  const providerAccount = normalizeProviderAccount(input, providerId)
  if (!providerAccount.ok) return providerAccount

  const summary = isRecord(input.summary) ? (input.summary as UsageSummary) : null
  if (!summary || !hasSummarySourceFacts(summary)) {
    return rejectProvider(
      providerId,
      "source-facts-required",
      "Normalized source facts are required.",
      "summary"
    )
  }

  const metricFamilies = normalizeStringArray(input.metricFamilies)
  if (metricFamilies.length === 0) {
    return rejectProvider(
      providerId,
      "metric-families-required",
      "Metric families are required.",
      "metricFamilies"
    )
  }

  const metricSamples = normalizeMetricSamples(providerId, input.metricSamples)
  if (!metricSamples.ok) return metricSamples

  return {
    ok: true as const,
    provider: {
      providerId,
      ...(providerAccount.value ? { providerAccount: providerAccount.value } : {}),
      payload,
      ...common.fields,
      summary,
      metricFamilies,
      metricSamples: metricSamples.samples,
    },
  }
}

function normalizeProviderCommon(input: JsonObject, providerId: string) {
  const payloadVersion = trimString(input.payloadVersion)
  if (!payloadVersion) {
    return rejectProvider(
      providerId,
      "payload-version-required",
      "Payload version is required.",
      "payloadVersion"
    )
  }

  const redactionVersion = trimString(input.redactionVersion)
  if (!redactionVersion) {
    return rejectProvider(
      providerId,
      "redaction-version-required",
      "Redaction version is required.",
      "redactionVersion"
    )
  }

  const capturedAt = finiteNumber(input.capturedAt)
  if (capturedAt === null) {
    return rejectProvider(
      providerId,
      "captured-at-required",
      "Captured timestamp is required.",
      "capturedAt"
    )
  }

  const periodKey = trimString(input.periodKey)
  if (!periodKey) {
    return rejectProvider(
      providerId,
      "period-key-required",
      "Period key is required.",
      "periodKey"
    )
  }

  const dataIdentity = trimString(input.dataIdentity)
  if (!dataIdentity) {
    return rejectProvider(
      providerId,
      "data-identity-required",
      "Data identity is required.",
      "dataIdentity"
    )
  }

  const summaryVersion = trimString(input.summaryVersion)
  if (!summaryVersion) {
    return rejectProvider(
      providerId,
      "summary-version-required",
      "Summary version is required.",
      "summaryVersion"
    )
  }

  const extractorVersion = normalizeExtractorVersion(input.extractorVersion)
  if (!extractorVersion || !extractorVersion[providerId]) {
    return rejectProvider(
      providerId,
      "extractor-version-required",
      "Extractor version for this provider is required.",
      "extractorVersion"
    )
  }

  return {
    ok: true as const,
    fields: {
      payloadVersion,
      redactionVersion,
      capturedAt,
      periodStart: finiteNumber(input.periodStart) ?? undefined,
      periodEnd: finiteNumber(input.periodEnd) ?? undefined,
      periodKey,
      dataIdentity,
      summaryVersion,
      extractorVersion,
    },
  }
}

function normalizeMetricSamples(providerId: string, input: unknown) {
  if (!Array.isArray(input) || input.length === 0) {
    return rejectProvider(
      providerId,
      "metric-samples-required",
      "At least one metric sample is required.",
      "metricSamples"
    )
  }

  const samples: UsageMetricSampleInput[] = []
  for (const [index, sample] of input.entries()) {
    const normalized = normalizeMetricSample(providerId, sample, index)
    if (!normalized.ok) return normalized
    samples.push(normalized.sample)
  }

  return { ok: true as const, samples }
}

function normalizeMetricSample(providerId: string, sample: unknown, index: number) {
  if (!isRecord(sample)) {
    return rejectProvider(
      providerId,
      "metric-sample-invalid",
      "Metric sample must be an object.",
      `metricSamples.${index}`
    )
  }

  const metricKey = trimString(sample.metricKey)
  const value = finiteNumber(sample.value)
  const unit = trimString(sample.unit)
  const sampleDay = trimString(sample.sampleDay)
  const source = sample.source
  if (!metricKey || value === null || !unit || !sampleDay || !isMetricSource(source)) {
    return rejectProvider(
      providerId,
      "metric-sample-invalid",
      "Metric sample is missing required fields.",
      `metricSamples.${index}`
    )
  }

  const periodStart = finiteNumber(sample.periodStart) ?? undefined
  const periodEnd = finiteNumber(sample.periodEnd) ?? undefined
  const bucket = normalizeMetricSampleBucket({
    sample,
    metricKey,
    unit,
    sampleDay,
    periodStart,
    periodEnd,
    field: `metricSamples.${index}`,
  })
  if (!bucket.ok) {
    return rejectProvider(providerId, bucket.code, bucket.message, bucket.field)
  }

  return {
    ok: true as const,
    sample: {
      metricKey,
      value,
      unit,
      sampleDay,
      periodStart: bucket.periodStart ?? periodStart,
      periodEnd: bucket.periodEnd ?? periodEnd,
      bucket: bucket.bucket,
      source,
      coverage: sample.coverage,
    },
  }
}

function normalizeExtractorVersion(input: unknown) {
  if (!isRecord(input)) return null

  const version: ExtractorVersion = {}
  for (const [key, value] of Object.entries(input)) {
    const providerId = key.trim()
    const providerVersion = trimString(value)
    if (providerId && providerVersion) version[providerId] = providerVersion
  }

  return Object.keys(version).length > 0 ? version : null
}

function hasSummarySourceFacts(summary: UsageSummary) {
  if (
    summarySourceFields.some(
      (field) => typeof summary[field] === "number" && Number.isFinite(summary[field])
    )
  ) {
    return true
  }

  return isRecord(summary.provider) && Object.keys(summary.provider).length > 0
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => trimString(item)).filter((item): item is string => !!item)
    : []
}

function isMetricSource(value: unknown): value is MetricSource {
  return value === "providerReported" || value === "normalized" || value === "estimated"
}

function trimString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function isRecord(value: unknown): value is JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function rejectProvider(
  providerId: string,
  code: string,
  message: string,
  field?: string
) {
  return {
    ok: false as const,
    error: {
      providerId,
      code,
      message,
      field,
    } satisfies ProviderRejection,
  }
}

function usageError(code: DesktopApiError["code"], message: string): DesktopApiError {
  return {
    ok: false,
    status: "error",
    code,
    message,
  }
}
