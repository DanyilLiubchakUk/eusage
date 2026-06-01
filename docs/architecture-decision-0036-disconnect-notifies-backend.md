# Decision 0036: Local disconnect notifies backend when possible

## Status

Accepted

## Context

The desktop app can disconnect from team sync locally by deleting its stored team connection.

If the backend is not notified, the admin dashboard only sees that the device became stale after its last sync.

## Decision

When the desktop app disconnects locally, it should try to notify the team deployment.

If the notify request succeeds, the backend marks that device disconnected.

If the desktop is offline or the request fails, local disconnect still succeeds and team credentials are removed from the device.

## Consequences

Admin device status is clearer when disconnect happens online.

Local disconnect remains reliable even without network access.

The backend must treat missing disconnect events as normal and rely on last-seen/stale status as fallback.

## Alternatives Considered

- Local-only disconnect: simpler, but less clear in admin device status.
