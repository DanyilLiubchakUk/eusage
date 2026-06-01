# Decision 0019: Upsert latest usage snapshot per developer, provider, and period

## Status

Accepted

## Context

Desktop sync can send the same provider usage data many times. The dashboard needs all available historical periods, but does not need duplicate rows for the same developer, provider, and usage period every time the desktop refreshes.

The synced payload should still preserve all provider data available for that period.

## Decision

Store latest usage snapshots keyed by developer, provider, and usage period or equivalent data identity.

When the same developer/provider/period data arrives again, overwrite the existing snapshot with the latest payload and summary.

Usage snapshots are the dashboard source of truth.

v1 does not store every usage upload as immutable history.

The snapshot record should preserve summary fields, capture/upload timestamps, app version, plugin version, and any provider period fields available.

The full redacted payload can live in a linked raw payload record.

## Consequences

Dashboard queries stay simpler and avoid repeated duplicate payloads.

All-time comparisons still work because each historical period remains stored.

Exact sync-by-sync usage upload history is not preserved in v1.

## Alternatives Considered

- Immutable event log: preserves every upload, but duplicates repeated provider snapshots and makes dashboard queries heavier.
- Event log plus snapshot table: best long-term, but more code and storage for v1.
