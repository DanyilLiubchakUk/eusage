# Decision 0011: Try to flush pending team sync on quit

## Status

Accepted

## Context

Team sync batches successful provider results with a debounce window before upload. A user may quit the desktop app while a pending batch exists.

Dropping the pending batch is simple, but can make the dashboard miss the most recent data until the next app run and probe.

Persisting a local retry queue is more reliable, but adds storage, retry, and cleanup behavior.

## Decision

When the desktop app quits and a pending team-sync batch exists, the app should try to flush that batch before shutdown.

The app must not block quit forever. Flush should have a short timeout. If the upload fails or times out, the app may continue quitting.

Failed in-memory retry batches are not persisted during quit.

## Consequences

The dashboard is more likely to receive the latest local results before the developer exits the app.

The implementation needs a bounded shutdown flush path.

v1 does not need a persistent local sync queue. On next launch, normal provider refresh rebuilds the latest usage snapshots.

## Alternatives Considered

- Persist pending batch to disk: more reliable, but more state and retry logic.
- Drop pending batch: simplest, but loses recent updates until the next probe.
