# Decision 0037: No automatic reconnect after local disconnect

## Status

Accepted

## Context

Local disconnect or backend token rejection removes team credentials from the desktop app. If the disconnect notify request fails while offline, the backend may still consider the device stale rather than disconnected.

The old developer token may still be valid, but local intent was to disconnect this machine.

## Decision

After local disconnect or backend token rejection deletes team credentials, the desktop app must not reconnect automatically.

To reconnect, a developer must paste a connection string again.

Check-in cannot move a device ID to another developer, even if the backend marks
it disconnected. Explicit connect retries an ownership conflict once with a fresh
device ID. This also covers offline disconnect when the backend still has the old
owner. Reconnecting the same developer keeps the saved ID. Startup and refresh
check-ins never register a replacement ID.

## Consequences

Disconnect behavior is clear and final from the local machine's point of view.

No pending reconnect or retry state is needed after credentials are removed.

If backend disconnect notification failed, admin status relies on stale/last-seen fallback until the device is archived or token is revoked.

## Alternatives Considered

- Auto reconnect if old token remains valid: surprising and unsafe for shared/reassigned machines.
