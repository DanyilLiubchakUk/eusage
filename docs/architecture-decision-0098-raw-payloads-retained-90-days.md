# Decision 0098: Raw payloads are retained for 90 days

## Status

Accepted

## Context

The desktop uploads full redacted provider payloads.
Raw payloads are useful for debugging and reprocessing extractor logic.

Keeping raw payloads forever increases storage and keeps old detailed data longer than v1 needs.
Dashboards should rely on normalized snapshots and metric samples for long-term reporting.

## Decision

Retain `rawPayloads` for 90 days.

Retain `usageSnapshots` and `metricSamples` for all-time dashboard reporting.

Each `rawPayloads` row has `expiresAt`.
A Convex cleanup cron deletes expired raw payloads.
When a raw payload is deleted, cleanup clears stale `usageSnapshots.rawPayloadId` references.

v1 admin UI does not expose a raw payload viewer.
Raw payloads stay in Convex for backend debugging and short-term reprocessing only.

## Consequences

Storage stays smaller.

Short-term debugging still works.

All-time charts and comparisons still work from normalized data.

Old raw payloads cannot be reprocessed after 90 days.
Extractor changes can only backfill from raw payloads inside the retention window.

## Alternatives Considered

- Keep raw payloads forever: best debugging, but unnecessary storage and longer data retention.
- Keep only summaries: smaller, but weak short-term debugging.
- Admin-configurable retention: flexible, but extra settings for v1.
- Admin raw payload viewer: useful for debugging, but too much surface area for v1.
