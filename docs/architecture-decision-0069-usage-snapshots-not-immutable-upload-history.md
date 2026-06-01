# Decision 0069: Usage snapshots are source of truth

## Status

Accepted

## Context

Desktop apps can upload the same provider usage data many times.

The dashboard needs all available historical periods, but does not need every repeated upload attempt.

Keeping immutable usage events would help deep debugging, but adds storage, query complexity, and another table to keep in sync with snapshots.

## Decision

`usageSnapshots` are the dashboard source of truth in v1.

When the same developer, device, provider, and usage period or data identity arrives again, eUsage overwrites the existing snapshot.

`auditEvents` stores small operational events only. It does not store every usage upload.

Daily `metricSamples` may store derived chart values, but not full raw upload history.

v1 does not preserve exact sync-by-sync usage upload history.

## Consequences

Dashboard queries stay simple and fast.

Repeated provider uploads do not create duplicate dashboard rows.

All-time reporting still works because each historical usage period remains stored.

Deep upload forensics are limited in v1.

Over-time charts can still use daily derived samples.

## Alternatives Considered

- Immutable `usageEvents` plus snapshots: more debug power, but more storage and code.
- Immutable events only: clean event model, but worse dashboard performance and complexity for v1.
