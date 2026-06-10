import {
  SUPPORTED_UPLOAD_SCHEMA_VERSION,
  type MetricSampleRecord,
  type NewMetricSampleRecord,
  type NewProviderAccountRecord,
  type NewRawPayloadRecord,
  type NewSyncErrorRecord,
  type NewUsageSnapshotRecord,
  type ProviderAccountRecord,
  type RawPayloadRecord,
  type SyncErrorRecord,
  type UsageIngestStore,
  type UsageSnapshotRecord,
} from "../../convex/usageIngest"
import {
  hashDeveloperToken,
  type DeveloperRecord,
  type DeveloperTeamRecord,
  type DeveloperTokenRecord,
} from "../../convex/developerTokens"
import type { DeviceRecord } from "../../convex/desktopApi"

export const usageIngestTestNow = 1780340000000

export async function createUsageIngestTestStore() {
  const rawToken = "eusage_dev_secret_raw_token"
  const tokenHash = await hashDeveloperToken(rawToken)
  const team: DeveloperTeamRecord = {
    _id: "team-1",
    name: "Acme Team",
    slug: "acme-team",
  }
  const developers: DeveloperRecord[] = [
    {
      _id: "developer-1",
      teamId: "team-1",
      displayName: "Alex Dev",
      status: "active",
      createdAt: usageIngestTestNow - 10_000,
      updatedAt: usageIngestTestNow - 10_000,
    },
  ]
  const tokens: DeveloperTokenRecord[] = [
    {
      _id: "token-1",
      teamId: "team-1",
      developerId: "developer-1",
      tokenHash,
      fingerprint: "hash...hash",
      label: "Alex laptop",
      status: "active",
      createdAt: usageIngestTestNow - 10_000,
    },
  ]
  const devices: DeviceRecord[] = [
    {
      _id: "device-row-1",
      teamId: "team-1",
      developerId: "developer-1",
      deviceId: "device-1",
      deviceName: "Alex MacBook",
      os: "macos",
      appVersion: "0.6.24",
      status: "connected",
      lastSeenAt: usageIngestTestNow - 5_000,
      createdAt: usageIngestTestNow - 5_000,
      updatedAt: usageIngestTestNow - 5_000,
    },
  ]
  const rawPayloads: RawPayloadRecord[] = []
  const usageSnapshots: UsageSnapshotRecord[] = []
  const metricSamples: MetricSampleRecord[] = []
  const providerAccounts: ProviderAccountRecord[] = []
  const syncErrors: SyncErrorRecord[] = []

  const store: UsageIngestStore = {
    getTeam: async () => team,
    getTokenByHash: async (hash) =>
      tokens.find((token) => token.tokenHash === hash) ?? null,
    getDeveloper: async (developerId) =>
      developers.find((developer) => developer._id === developerId) ?? null,
    getDeviceByDeviceId: async (deviceId) =>
      devices.find((device) => device.deviceId === deviceId) ?? null,
    updateDevice: async (deviceRecordId, patch) => {
      const device = devices.find((row) => row._id === deviceRecordId)
      if (!device) throw new Error("Missing device in fake store.")
      Object.assign(device, patch)
      return device
    },
    updateDeveloper: async (developerId, patch) => {
      const developer = developers.find((row) => row._id === developerId)
      if (!developer) throw new Error("Missing developer in fake store.")
      Object.assign(developer, patch)
      return developer
    },
    updateToken: async (tokenId, patch) => {
      const token = tokens.find((row) => row._id === tokenId)
      if (!token) throw new Error("Missing token in fake store.")
      Object.assign(token, patch)
      return token
    },
    createRawPayload: async (payload: NewRawPayloadRecord) => {
      const created = { _id: `raw-${rawPayloads.length + 1}`, ...payload }
      rawPayloads.push(created)
      return created
    },
    getUsageSnapshot: async (snapshot) =>
      usageSnapshots.find(
        (row) =>
          row.teamId === snapshot.teamId &&
          row.developerId === snapshot.developerId &&
          row.deviceId === snapshot.deviceId &&
          row.providerId === snapshot.providerId &&
          row.periodKey === snapshot.periodKey &&
          row.dataIdentity === snapshot.dataIdentity
      ) ?? null,
    createUsageSnapshot: async (snapshot: NewUsageSnapshotRecord) => {
      const created = { _id: `snapshot-${usageSnapshots.length + 1}`, ...snapshot }
      usageSnapshots.push(created)
      return created
    },
    updateUsageSnapshot: async (snapshotId, patch) => {
      const snapshot = usageSnapshots.find((row) => row._id === snapshotId)
      if (!snapshot) throw new Error("Missing snapshot in fake store.")
      Object.assign(snapshot, patch)
      return snapshot
    },
    getMetricSample: async (sample) =>
      metricSamples.find(
        (row) =>
          row.teamId === sample.teamId &&
          row.providerId === sample.providerId &&
          row.developerId === sample.developerId &&
          row.deviceId === sample.deviceId &&
          row.metricKey === sample.metricKey &&
          row.sampleDay === sample.sampleDay &&
          row.periodStart === sample.periodStart &&
          row.periodEnd === sample.periodEnd
      ) ?? null,
    createMetricSample: async (sample: NewMetricSampleRecord) => {
      const created = { _id: `metric-${metricSamples.length + 1}`, ...sample }
      metricSamples.push(created)
      return created
    },
    updateMetricSample: async (sampleId, patch) => {
      const sample = metricSamples.find((row) => row._id === sampleId)
      if (!sample) throw new Error("Missing metric sample in fake store.")
      Object.assign(sample, patch)
      return sample
    },
    getProviderAccount: async (account) =>
      providerAccounts.find(
        (row) =>
          row.teamId === account.teamId &&
          row.developerId === account.developerId &&
          row.providerId === account.providerId &&
          row.teamAccountFingerprint === account.teamAccountFingerprint
      ) ?? null,
    createProviderAccount: async (account: NewProviderAccountRecord) => {
      const created = {
        _id: `provider-account-${providerAccounts.length + 1}`,
        ...account,
      }
      providerAccounts.push(created)
      return created
    },
    updateProviderAccount: async (accountId, patch) => {
      const account = providerAccounts.find((row) => row._id === accountId)
      if (!account) throw new Error("Missing provider account in fake store.")
      Object.assign(account, patch)
      return account
    },
    createSyncError: async (error: NewSyncErrorRecord) => {
      const created = { _id: `sync-error-${syncErrors.length + 1}`, ...error }
      syncErrors.push(created)
      return created
    },
  }

  return {
    store,
    tokenHash,
    developers,
    tokens,
    devices,
    rawPayloads,
    usageSnapshots,
    metricSamples,
    providerAccounts,
    syncErrors,
  }
}

export function usageBatch(providers: unknown[]) {
  return {
    uploadSchemaVersion: SUPPORTED_UPLOAD_SCHEMA_VERSION,
    deviceId: "device-1",
    providers,
  }
}

export function mockReportingBucket(day = "2026-06-01", reportingTimeZone = "UTC") {
  const startMs = Date.parse(`${day}T00:00:00.000Z`)
  return {
    kind: "reportingDay",
    day,
    reportingTimeZone,
    startMs,
    endMs: startMs + 24 * 60 * 60 * 1000,
  }
}

export function mockUsageProvider(overrides: Record<string, unknown> = {}) {
  const bucket = mockReportingBucket()
  return {
    providerId: "mock",
    payload: {
      provider: "mock",
      accountEmail: "alex@example.com",
      accessToken: "[REDACTED]",
    },
    payloadVersion: "1.0.0",
    redactionVersion: "1.0.0",
    capturedAt: usageIngestTestNow - 1_000,
    periodStart: usageIngestTestNow - 24 * 60 * 60 * 1000,
    periodEnd: usageIngestTestNow,
    periodKey: "2026-06-01",
    dataIdentity: "mock:developer-1:2026-06-01",
    summary: {
      tokensTotal: 100,
      estimatedCostUsd: 1.25,
    },
    summaryVersion: "1.0.0",
    extractorVersion: {
      mock: "1.0.0",
    },
    metricFamilies: ["tokens", "estimatedCost"],
    metricSamples: [
      {
        metricKey: "mock.tokens.total",
        value: 100,
        unit: "tokens",
        sampleDay: "2026-06-01",
        periodStart: bucket.startMs,
        periodEnd: bucket.endMs,
        bucket,
        source: "providerReported",
      },
      {
        metricKey: "mock.cost.estimated",
        value: 1.25,
        unit: "usd",
        sampleDay: "2026-06-01",
        periodStart: bucket.startMs,
        periodEnd: bucket.endMs,
        bucket,
        source: "estimated",
      },
    ],
    ...overrides,
  }
}
