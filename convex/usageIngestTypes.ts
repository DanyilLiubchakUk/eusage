import type { DesktopApiError, DesktopApiStore } from "./desktopApiCore"

export const SUPPORTED_UPLOAD_SCHEMA_VERSION = "1.0.0"
export const RAW_PAYLOAD_RETENTION_MS = 90 * 24 * 60 * 60 * 1000
export const SYNC_ERROR_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export type JsonObject = Record<string, unknown>
export type ExtractorVersion = Record<string, string>
export type MetricSource = "providerReported" | "normalized" | "estimated"
export type ProviderAccountStatus = "shared"

export type UsageSummary = {
  tokensTotal?: number
  estimatedCostUsd?: number
  budgetUsedUsd?: number
  budgetLimitUsd?: number
  quotaPercent?: number
  creditsUsed?: number
  creditsRemaining?: number
  requestsUsed?: number
  provider?: JsonObject
}

export type MetricReportingBucket = {
  kind: "reportingDay"
  day: string
  reportingTimeZone: string
  startMs: number
  endMs: number
}

export type UsageMetricSampleInput = {
  metricKey: string
  value: number
  unit: string
  sampleDay: string
  periodStart?: number
  periodEnd?: number
  bucket?: MetricReportingBucket
  source: MetricSource
  coverage?: unknown
}

export type UsageProviderAccountInput = {
  teamAccountFingerprint: string
  label: string
}

export type UsageProviderInput = {
  providerId: string
  providerAccount?: UsageProviderAccountInput
  payload: JsonObject
  payloadVersion: string
  redactionVersion: string
  capturedAt: number
  periodStart?: number
  periodEnd?: number
  periodKey: string
  dataIdentity: string
  summary: UsageSummary
  summaryVersion: string
  extractorVersion: ExtractorVersion
  metricFamilies: string[]
  metricSamples: UsageMetricSampleInput[]
}

export type UsageBatchInput = {
  tokenHash: string
  batch: unknown
}

export type RawPayloadRecord = {
  _id: string
  teamId: string
  developerId: string
  deviceId: string
  providerId: string
  payload: JsonObject
  payloadVersion: string
  redactionVersion: string
  capturedAt: number
  updatedAt: number
  expiresAt: number
}

export type NewRawPayloadRecord = Omit<RawPayloadRecord, "_id">

export type UsageSnapshotRecord = {
  _id: string
  teamId: string
  developerId: string
  deviceId: string
  providerId: string
  providerAccountFingerprint?: string
  periodStart?: number
  periodEnd?: number
  periodKey: string
  dataIdentity: string
  summary: UsageSummary
  summaryVersion: string
  extractorVersion: ExtractorVersion
  metricFamilies: string[]
  rawPayloadId?: string
  capturedAt: number
  updatedAt: number
}

export type NewUsageSnapshotRecord = Omit<UsageSnapshotRecord, "_id">

export type MetricSampleRecord = {
  _id: string
  teamId: string
  providerId: string
  providerAccountFingerprint?: string
  developerId?: string
  deviceId?: string
  metricKey: string
  value: number
  unit: string
  sampleDay: string
  periodStart?: number
  periodEnd?: number
  bucket?: MetricReportingBucket
  source: MetricSource
  coverage?: unknown
  summaryVersion: string
  extractorVersion: ExtractorVersion
  capturedAt: number
  updatedAt: number
}

export type NewMetricSampleRecord = Omit<MetricSampleRecord, "_id">

export type ProviderAccountRecord = {
  _id: string
  teamId: string
  developerId: string
  providerId: string
  teamAccountFingerprint: string
  label: string
  status: ProviderAccountStatus
  firstSharedAt: number
  lastSharedAt: number
  updatedAt: number
}

export type NewProviderAccountRecord = Omit<ProviderAccountRecord, "_id">

export type SyncErrorRecord = {
  _id: string
  teamId: string
  developerId?: string
  deviceId?: string
  providerId?: string
  errorCode: string
  message: string
  details?: {
    reason: string
    field?: string
  }
  createdAt: number
  expiresAt: number
}

export type NewSyncErrorRecord = Omit<SyncErrorRecord, "_id">

export type UsageIngestStore = Pick<
  DesktopApiStore,
  | "getTeam"
  | "getTokenByHash"
  | "getDeveloper"
  | "getDeviceByDeviceId"
  | "updateDevice"
  | "updateDeveloper"
  | "updateToken"
> & {
  createRawPayload: (payload: NewRawPayloadRecord) => Promise<RawPayloadRecord>
  getUsageSnapshot: (
    snapshot: Pick<
      UsageSnapshotRecord,
      "teamId" | "developerId" | "deviceId" | "providerId" | "periodKey" | "dataIdentity"
    >
  ) => Promise<UsageSnapshotRecord | null>
  createUsageSnapshot: (
    snapshot: NewUsageSnapshotRecord
  ) => Promise<UsageSnapshotRecord>
  updateUsageSnapshot: (
    snapshotId: string,
    patch: Partial<NewUsageSnapshotRecord>
  ) => Promise<UsageSnapshotRecord>
  getMetricSample: (
    sample: Pick<
      MetricSampleRecord,
      | "teamId"
      | "providerId"
      | "developerId"
      | "deviceId"
      | "metricKey"
      | "sampleDay"
      | "periodStart"
      | "periodEnd"
      | "providerAccountFingerprint"
    >
  ) => Promise<MetricSampleRecord | null>
  createMetricSample: (sample: NewMetricSampleRecord) => Promise<MetricSampleRecord>
  updateMetricSample: (
    sampleId: string,
    patch: Partial<NewMetricSampleRecord>
  ) => Promise<MetricSampleRecord>
  getProviderAccount: (
    account: Pick<
      ProviderAccountRecord,
      "teamId" | "developerId" | "providerId" | "teamAccountFingerprint"
    >
  ) => Promise<ProviderAccountRecord | null>
  createProviderAccount: (
    account: NewProviderAccountRecord
  ) => Promise<ProviderAccountRecord>
  updateProviderAccount: (
    accountId: string,
    patch: Partial<NewProviderAccountRecord>
  ) => Promise<ProviderAccountRecord>
  createSyncError: (error: NewSyncErrorRecord) => Promise<SyncErrorRecord>
}

export type UsageBatchResult =
  | {
      ok: true
      message: string
      acceptedCount: number
      rejectedProviderIds: string[]
      serverTime: string
    }
  | DesktopApiError

export type NormalizedBatch = {
  deviceId: string
  providers: unknown[]
}

export type ProviderRejection = {
  providerId: string
  code: string
  message: string
  field?: string
}

export const UNKNOWN_PROVIDER_ID = "unknown-provider"
