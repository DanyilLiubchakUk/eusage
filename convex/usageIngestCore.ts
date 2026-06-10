import { authenticateDesktopTokenHash } from "./desktopApiCore"
import {
  RAW_PAYLOAD_RETENTION_MS,
  SYNC_ERROR_RETENTION_MS,
  UNKNOWN_PROVIDER_ID,
  type UsageBatchInput,
  type UsageBatchResult,
  type UsageIngestStore,
  type UsageProviderInput,
} from "./usageIngestTypes"
import { normalizeBatch, normalizeProvider } from "./usageIngestValidation"
import { upsertProviderAccount } from "./usageIngestProviderAccounts"

export async function ingestUsageBatch(args: {
  input: UsageBatchInput
  now: number
  store: UsageIngestStore
}): Promise<UsageBatchResult> {
  const auth = await authenticateDesktopTokenHash({
    tokenHash: args.input.tokenHash,
    store: args.store,
  })
  if (!auth.ok) return auth

  const batch = normalizeBatch(args.input.batch)
  if (!batch.ok) return batch

  const device = await args.store.getDeviceByDeviceId(batch.deviceId)
  if (!device || device.teamId !== auth.team._id) {
    return {
      ok: false,
      status: "error",
      code: "device-not-found",
      message: "Device was not found.",
    }
  }

  const rejectedProviderIds: string[] = []
  let acceptedCount = 0

  for (const providerInput of batch.providers) {
    const provider = normalizeProvider(providerInput)
    if (!provider.ok) {
      rejectedProviderIds.push(provider.error.providerId)
      await args.store.createSyncError({
        teamId: auth.team._id,
        developerId: auth.developer._id,
        deviceId: batch.deviceId,
        providerId:
          provider.error.providerId === UNKNOWN_PROVIDER_ID
            ? undefined
            : provider.error.providerId,
        errorCode: provider.error.code,
        message: provider.error.message,
        details: {
          reason: provider.error.message,
          ...(provider.error.field ? { field: provider.error.field } : {}),
        },
        createdAt: args.now,
        expiresAt: args.now + SYNC_ERROR_RETENTION_MS,
      })
      continue
    }

    await acceptProvider({
      provider: provider.provider,
      teamId: auth.team._id,
      developerId: auth.developer._id,
      deviceId: batch.deviceId,
      now: args.now,
      store: args.store,
    })
    acceptedCount += 1
  }

  await args.store.updateDeveloper(auth.developer._id, {
    lastSeenAt: args.now,
    updatedAt: args.now,
  })
  await args.store.updateToken(auth.token._id, { lastUsedAt: args.now })
  if (acceptedCount > 0) {
    await args.store.updateDevice(device._id, {
      lastSyncAt: args.now,
      updatedAt: args.now,
    })
  }

  return {
    ok: true,
    message: "Usage batch processed.",
    acceptedCount,
    rejectedProviderIds,
    serverTime: new Date(args.now).toISOString(),
  }
}

async function acceptProvider(args: {
  provider: UsageProviderInput
  teamId: string
  developerId: string
  deviceId: string
  now: number
  store: UsageIngestStore
}) {
  const rawPayload = await args.store.createRawPayload({
    teamId: args.teamId,
    developerId: args.developerId,
    deviceId: args.deviceId,
    providerId: args.provider.providerId,
    payload: args.provider.payload,
    payloadVersion: args.provider.payloadVersion,
    redactionVersion: args.provider.redactionVersion,
    capturedAt: args.provider.capturedAt,
    updatedAt: args.now,
    expiresAt: args.now + RAW_PAYLOAD_RETENTION_MS,
  })

  await upsertProviderAccount(args)
  await upsertUsageSnapshot(args, rawPayload._id)
  await upsertMetricSamples(args)
}

async function upsertUsageSnapshot(
  args: {
    provider: UsageProviderInput
    teamId: string
    developerId: string
    deviceId: string
    now: number
    store: UsageIngestStore
  },
  rawPayloadId: string
) {
  const snapshot = {
    teamId: args.teamId,
    developerId: args.developerId,
    deviceId: args.deviceId,
    providerId: args.provider.providerId,
    periodStart: args.provider.periodStart,
    periodEnd: args.provider.periodEnd,
    periodKey: args.provider.periodKey,
    dataIdentity: args.provider.dataIdentity,
    summary: args.provider.summary,
    summaryVersion: args.provider.summaryVersion,
    extractorVersion: args.provider.extractorVersion,
    metricFamilies: args.provider.metricFamilies,
    rawPayloadId,
    capturedAt: args.provider.capturedAt,
    updatedAt: args.now,
  }
  const existing = await args.store.getUsageSnapshot(snapshot)
  if (existing) {
    await args.store.updateUsageSnapshot(existing._id, snapshot)
  } else {
    await args.store.createUsageSnapshot(snapshot)
  }
}

async function upsertMetricSamples(args: {
  provider: UsageProviderInput
  teamId: string
  developerId: string
  deviceId: string
  now: number
  store: UsageIngestStore
}) {
  for (const sampleInput of args.provider.metricSamples) {
    const sample = {
      teamId: args.teamId,
      providerId: args.provider.providerId,
      developerId: args.developerId,
      ...(isDeviceScopedUsageSample(args.provider.providerId, sampleInput)
        ? { deviceId: args.deviceId }
        : {}),
      metricKey: sampleInput.metricKey,
      value: sampleInput.value,
      unit: sampleInput.unit,
      sampleDay: sampleInput.sampleDay,
      periodStart: sampleInput.periodStart,
      periodEnd: sampleInput.periodEnd,
      bucket: sampleInput.bucket,
      source: sampleInput.source,
      coverage: sampleInput.coverage,
      summaryVersion: args.provider.summaryVersion,
      extractorVersion: args.provider.extractorVersion,
      capturedAt: args.provider.capturedAt,
      updatedAt: args.now,
    }
    const existing = await args.store.getMetricSample(sample)
    if (existing) {
      await args.store.updateMetricSample(existing._id, mergeMetricSample(existing, sample))
    } else {
      await args.store.createMetricSample(sample)
    }
  }
}

function mergeMetricSample<T extends { metricKey: string; unit: string; value: number }>(
  existing: { value: number },
  next: T
): T {
  if (isConsumedUsageSample(next) && existing.value > next.value) {
    return { ...next, value: existing.value }
  }
  return next
}

function isConsumedUsageSample(sample: { metricKey: string; unit: string }) {
  return (
    (sample.unit === "tokens" && sample.metricKey.endsWith(".tokens.total")) ||
    (sample.unit === "usd" && sample.metricKey.endsWith(".cost.estimated"))
  )
}

function isDeviceScopedUsageSample(
  providerId: string,
  sample: { metricKey: string; unit: string }
) {
  if (providerId !== "codex" && providerId !== "claude") return false
  return (
    (sample.unit === "tokens" && sample.metricKey.startsWith(`${providerId}.tokens.`)) ||
    (sample.unit === "usd" && sample.metricKey === `${providerId}.cost.estimated`)
  )
}
