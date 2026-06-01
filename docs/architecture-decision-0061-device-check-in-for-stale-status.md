# Decision 0061: Device check-in keeps stale status accurate

## Status

Accepted

## Context

Device status includes `stale`, derived from device `lastSeen`.

If `lastSeen` changed only when provider usage changed, a working desktop could look stale during quiet usage periods.

Adding a separate usage-sync timer would duplicate the existing refresh schedule and make desktop behavior harder to explain.

## Decision

The desktop app sends a lightweight device check-in on app start and on existing refresh ticks.

The check-in updates device `lastSeen`, OS, app version, and basic sync health metadata.

It does not upload usage payloads.

A device becomes stale after 72 hours without a successful check-in.

## Consequences

Admin device health is useful even when provider usage does not change.

The desktop app does not need a second usage-sync interval.

Network failure can still make a connected device appear stale after 72 hours, which is acceptable for v1.

## Alternatives Considered

- Derive stale only from usage uploads: simpler, but falsely marks quiet working desktops as stale.
- Remove stale status and show only `lastSeen`: simpler, but weaker admin troubleshooting.
- Add a separate heartbeat timer: explicit, but more settings and more background behavior.
