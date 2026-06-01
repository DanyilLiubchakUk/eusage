# Decision 0075: Store rejected sync errors with expiry

## Status

Accepted

## Context

Provider payload rejection is useful for debugging, but noisy for developers.

The desktop provider card already shows local provider probe status. Backend rejection is a sync/storage concern, not a local provider failure.

Convex does not provide a simple table-level TTL for normal documents. Convex supports scheduled functions and cron jobs that can delete documents later.

## Decision

Rejected provider payload errors are stored in a Convex `syncErrors` table.

Each `syncErrors` row has `expiresAt`.

A Convex cron runs cleanup and deletes expired `syncErrors` rows.

v1 default retention is 30 days.

Store only debugging metadata:

- Team ID.
- Developer ID.
- Device ID.
- Provider ID.
- Error code.
- Short message.
- Created time.
- Expires time.

Do not store raw provider payloads or secrets in `syncErrors`.

Do not show rejected provider payload errors in desktop/provider UI in v1.

## Consequences

Backend sync problems stay debuggable.

Desktop UI stays quiet.

Error logs do not grow forever.

Implementation needs a small Convex cleanup cron instead of native table TTL.

## Alternatives Considered

- Show provider sync errors in desktop UI: more visible, but noisy and mixes local probe with backend sync.
- Keep errors forever: easier, but log table grows without value.
- No error log: simple, but harder to debug rejected payloads.
