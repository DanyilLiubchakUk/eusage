# Decision 0009: Team sync runs after probe results

## Status

Accepted

## Context

The desktop app already has an auto-update interval setting. That interval controls when provider probes run.

Adding a second team-sync timer would create duplicate scheduling, confusing settings, and possible uploads of stale data.

The existing probe flow already handles automatic refresh, manual refresh, retry, loading state, and successful probe results.

## Decision

Team sync should run after successful provider probe results.

The desktop app should not add a separate sync interval for team uploads. When a provider probe returns fresh data, the same flow that updates local app state should also enqueue or send the team usage upload.

Manual refreshes and automatic refreshes both use the same sync path because both produce probe results.

Device check-ins are allowed on app start and existing refresh ticks. They are lightweight device health updates, not usage uploads, and do not create a second usage-sync schedule.

## Consequences

The existing auto-update interval setting remains the source of truth for refresh frequency.

Uploads happen only when fresh provider data is available.

Device `lastSeen` can still be updated even when no provider usage changed.

The implementation should avoid blocking UI probe updates on network upload. Failed team sync should be visible in team connection status, but should not break local usage display.

## Alternatives Considered

- Separate fixed sync interval: simple, but can upload stale data and duplicates existing scheduling.
- Admin-configurable sync interval: more control, but unnecessary because refresh interval already exists.
