# Decision 0017: Store full payload plus summary fields

## Status

Accepted

## Context

Team sync uploads full successful plugin payloads and desktop-extracted source facts so the dashboard can use all data the desktop app collected.

The dashboard also needs common values quickly: cost, limits, remaining usage, reset times, provider health, and timestamps. Recomputing those from raw payloads on every render would make dashboard queries heavier and more fragile.

## Decision

Store both:

- The full redacted plugin output payload.
- Normalized source facts for dashboard queries.

In the normalized Convex schema, the usage snapshot can store summary fields while a linked raw payload record stores the full redacted payload.

`usageSnapshots.summary` uses a hybrid shape:

- Strict common fields for dashboard queries.
- Provider-specific nested details for provider-only metrics.

Raw payloads are retained for 90 days.
Usage snapshots and metric samples are retained for all-time dashboard reporting.

Example shape:

```ts
{
  providerId,
  capturedAt,
  uploadedAt,
  appVersion,
  pluginVersion,
  payloadRef,
  summary: {
    tokensTotal,
    estimatedCostUsd,
    budgetUsedUsd,
    budgetLimitUsd,
    quotaPercent,
    creditsUsed,
    creditsRemaining,
    requestsUsed,
    provider: {
      cursor: {
        onDemandLimitUsd,
        onDemandUsedUsd,
        pooledLimitUsd,
        pooledUsedUsd
      }
    }
  }
}
```

The strict common fields can grow only when dashboard queries need them.
Provider-specific fields can grow as provider extractors improve.

## Consequences

The backend preserves all collected data short-term while keeping common dashboard views fast long-term.

If summary logic changes, raw payloads can be reprocessed only while they are still inside the 90 day retention window.

The desktop/provider extraction path must compute source fields consistently before upload.

The backend ingest path validates source fields and stores them.
It does not own normal provider extraction in v1.

The ingest path should reject or log loudly if obvious secret fields reach it after desktop redaction.

A Convex cleanup cron deletes expired raw payloads and clears stale `rawPayloadId` references from snapshots.

## Alternatives Considered

- Full payload only: maximum flexibility, but slower and more repetitive dashboard logic.
- Summary only: fast and compact, but loses short-term debugging and reprocessing.
