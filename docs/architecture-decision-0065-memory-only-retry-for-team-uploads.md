# Decision 0065: Retry failed team uploads in memory only

## Status

Accepted

## Context

Team usage uploads can fail because the network is down, Vercel is unavailable, or the team deployment has a temporary server issue.

Dropping failed uploads immediately would reduce trust in the dashboard.

Persisting a failed-upload queue to disk would be more reliable across app restarts, but adds queue storage, cleanup, corruption handling, and more edge cases.

## Decision

For v1, retryable team upload failures stay in memory.

The desktop app retries the pending batch on the next refresh while the app stays open.

If a newer successful provider result arrives for the same provider before retry, it replaces the older pending result.

The desktop app does not persist a failed-upload queue to disk.

Invalid, revoked, or inactive developer tokens are not retryable upload failures.

## Consequences

Offline or temporary server failures get a simple retry path.

The app remains simple and avoids a local queue database.

If the app quits before retry succeeds, the next launch depends on normal provider refresh to rebuild and upload latest snapshots.

## Alternatives Considered

- Persistent retry queue: better delivery guarantees, but too much v1 complexity.
- Drop failed upload immediately: simplest, but weak dashboard trust.
