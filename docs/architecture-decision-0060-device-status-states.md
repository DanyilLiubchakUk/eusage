# Decision 0060: Device status has four operational states

## Status

Accepted

## Context

Usage is shown by developer in v1, not by device.

Admins still need to understand whether a developer's desktop installations are currently syncing, stale, intentionally disconnected, or hidden from the normal device list.

Using only `lastSeen` would be simpler, but would make shared laptops and replaced machines harder to understand.

## Decision

Device status has four v1 states:

- `connected`: the device synced recently.
- `stale`: the device has not checked in within 72 hours.
- `disconnected`: the desktop app sent a disconnect event.
- `archived`: the admin hid an old or duplicate device status record.

Device status is operational metadata only.

Dashboard usage totals stay developer-level.

## Consequences

Admin troubleshooting is clearer.

Shared or reassigned laptops are easier to reason about.

Old duplicate devices can be hidden without deleting usage history.

The app needs a simple 72 hour stale threshold based on device `lastSeen`.

## Alternatives Considered

- `active` and `archived` only: simpler, but cannot distinguish stale devices from intentional disconnects.
- No device status: simplest, but weak admin UX.
