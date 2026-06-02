# Convex Data Model v1

## Shape

One deployment is one team.
Still store `teamId` on rows so code stays explicit and future migration is easier.

Use a typed Convex schema in `convex/schema.ts`.
Use indexes for dashboard queries instead of scanning tables.
Store source facts, not duplicate calculated dashboard values.
Convex queries return source rows.
Shared pure TypeScript functions in `web/src/lib/metrics` calculate totals, averages, percentages, projections, comparisons, and chart aggregates for Admin and TV.

Desktop/provider code extracts normalized source facts before upload.
The web/backend validates and stores those facts.
Normal provider extraction does not live in Convex or Vercel API routes in v1.

## Tables

### `teams`

One row.

- `name`
- `slug`
- `setupCompletedAt`
- `createdAt`
- `updatedAt`

### `admins`

Clerk-backed admin users.

- `teamId`
- `clerkUserId`
- `email`
- `name`
- `role`: `owner` for v1
- `createdAt`
- `updatedAt`

Indexes:

- `by_clerkUserId`
- `by_teamId`

### `developers`

People whose desktop usage is collected.

- `teamId`
- `displayName`
- `email` optional
- `status`: `active` or `inactive`
- `metadata` optional object
- `createdAt`
- `updatedAt`
- `lastSeenAt` optional

Indexes:

- `by_teamId_status`

### `developerTokens`

Managed developer tokens.
Raw token is never stored.

- `teamId`
- `developerId`
- `tokenHash`
- `fingerprint`
- `label`
- `status`: `active`, `revoked`
- `createdAt`
- `rotatedAt` optional
- `revokedAt` optional
- `lastUsedAt` optional

Indexes:

- `by_tokenHash`
- `by_developerId_status`
- `by_teamId_status`

### `devices`

Operational device records.
Not a dashboard usage dimension.

- `teamId`
- `developerId`
- `deviceId`
- `deviceName`
- `os`
- `appVersion`
- `status`: `connected`, `stale`, `disconnected`, `archived`
- `lastSeenAt`
- `lastSyncAt` optional
- `createdAt`
- `updatedAt`

Indexes:

- `by_deviceId`
- `by_developerId_status`
- `by_teamId_status`
- `by_lastSeenAt`

### `providers`

Provider catalog and visibility.

- `teamId`
- `providerId`: `cursor`, `codex`, `claude`, `jetbrains-ai-assistant`
- `name`
- `status`: `enabled`, `disabled`
- `brandColor`
- `createdAt`
- `updatedAt`

Indexes:

- `by_teamId_providerId`
- `by_teamId_status`

### `usageSnapshots`

Dashboard source of truth.
Upserted, not append-only.

- `teamId`
- `developerId`
- `deviceId`
- `providerId`
- `periodStart` optional
- `periodEnd` optional
- `periodKey`
- `dataIdentity`
- `summary`
- `summaryVersion`: semver string
- `extractorVersion`: provider-keyed semver object
- `metricFamilies`
- `rawPayloadId` optional
- `capturedAt`
- `updatedAt`

`summary` uses a hybrid shape.
Common fields are strict source/query fields.
Only store a value when it is provider-reported, estimated by the extractor, or needed as an input after raw payload retention expires.
Do not store duplicate values that can always be calculated from other stored source fields.

- `tokensTotal` optional
- `estimatedCostUsd` optional
- `budgetUsedUsd` optional
- `budgetLimitUsd` optional
- `quotaPercent` optional
- `creditsUsed` optional
- `creditsRemaining` optional
- `requestsUsed` optional

Provider-specific fields live under `summary.provider`.
Example Cursor fields:

- `provider.cursor.planUsedUsd` optional
- `provider.cursor.planLimitUsd` optional
- `provider.cursor.onDemandUsedUsd` optional
- `provider.cursor.onDemandLimitUsd` optional
- `provider.cursor.individualUsedUsd` optional
- `provider.cursor.individualLimitUsd` optional
- `provider.cursor.pooledUsedUsd` optional
- `provider.cursor.pooledLimitUsd` optional
- `provider.cursor.apiPercentUsed` optional

`metricFamilies` stores which families are present:

- `tokens`
- `estimatedCost`
- `budget`
- `quotaPressure`
- `credits`
- `requests`
- `cursorPool`

Indexes:

- `by_team_provider_period`
- `by_team_developer_provider_period`
- `by_team_updatedAt`
- `by_team_developer_updatedAt`

### `rawPayloads`

Full redacted plugin payload.
Linked from `usageSnapshots`.
Retained for 90 days.

- `teamId`
- `developerId`
- `deviceId`
- `providerId`
- `payload`
- `payloadVersion`
- `redactionVersion`
- `capturedAt`
- `updatedAt`
- `expiresAt`

Indexes:

- `by_team_provider_capturedAt`
- `by_developer_provider_capturedAt`
- `by_expiresAt`

Cleanup:

- Convex cron deletes rows after `expiresAt`.
- Cleanup also clears matching `usageSnapshots.rawPayloadId`.
- Dashboards must keep working from `usageSnapshots.summary` and `metricSamples`.

### `metricSamples`

Small source metric history.
One row per day/metric/provider/developer scope.
These are source measurements for over-time charts, not precomputed chart aggregates.

- `teamId`
- `providerId`
- `developerId` optional
- `metricKey`
- `value`
- `unit`
- `sampleDay`
- `periodStart` optional
- `periodEnd` optional
- `source`: `providerReported`, `normalized`, `estimated`
- `coverage` optional object
- `summaryVersion`: semver string
- `extractorVersion`: provider-keyed semver object
- `capturedAt`
- `updatedAt`

Indexes:

- `by_team_metric_day`
- `by_team_provider_metric_day`
- `by_team_developer_metric_day`

### `auditEvents`

Small admin/system events.
Not usage history.

- `teamId`
- `actorAdminId` optional
- `eventType`
- `targetType`
- `targetId` optional
- `message`
- `createdAt`

Indexes:

- `by_team_createdAt`

### `syncErrors`

Short-lived ingest errors.
No raw payloads or secrets.

- `teamId`
- `developerId` optional
- `deviceId` optional
- `providerId` optional
- `errorCode`
- `message`
- `details` optional
- `createdAt`
- `expiresAt`

Indexes:

- `by_team_createdAt`
- `by_expiresAt`

### `dashboardSettings`

Admin dashboard preferences.

- `teamId`
- `defaultDateRange`
- `visibleProviderIds`
- `hiddenDeveloperIds`
- `includeInactiveDevelopers`
- `createdAt`
- `updatedAt`

### `tvSettings`

TV display preferences.

- `teamId`
- `dateRange`
- `visibleProviderIds`
- `visibleDeveloperIds`
- `slides`
- `theme`
- `createdAt`
- `updatedAt`

`slides` row shape:

- `id`
- `enabled`
- `order`
- `durationSeconds`

## Freshness

Do not store temporary freshness rows.
Use normal row timestamps.

TV slide queries return the visible timestamps used by that slide.
The browser keeps only `now` in memory for the ticking label.

## Upsert Keys

`usageSnapshots` upsert key:

```text
teamId + developerId + deviceId + providerId + periodKey + dataIdentity
```

`metricSamples` upsert key:

```text
teamId + providerId + developerId? + metricKey + sampleDay + periodStart? + periodEnd?
```

## Keep v1 Simple

No immutable upload event table.
No per-device usage dashboard.
No hard-delete usage UI.
No temporary freshness table.
No duplicate calculated dashboard values when they can be calculated from stored source values.
