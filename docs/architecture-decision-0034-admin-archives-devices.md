# Decision 0034: Admin can archive device status records

## Status

Accepted

## Context

Device IDs are random local UUIDs. Reinstalling the desktop app or clearing app data can create a new device ID for the same physical machine.

Device status records can become stale or duplicated over time.

## Decision

Admins can manually archive device status records.

Archiving a device removes it from normal device status lists, but does not delete developer usage history.

Device archival is only for operational cleanup.

## Consequences

Admins can clean stale or duplicate device records without affecting usage dashboards.

No automatic stale-device archival is needed in v1.

Stale status detection uses the 72 hour device `lastSeen` threshold from Decision 0060.

Archived devices can remain available in backend data if needed for support/debugging later.

## Alternatives Considered

- Auto-hide stale devices: less manual work, but requires choosing a threshold.
- Do nothing: simplest, but stale device lists can become cluttered.
