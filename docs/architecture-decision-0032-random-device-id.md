# Decision 0032: Device ID is a random local UUID

## Status

Accepted

## Context

One developer token can be used on multiple devices. The backend needs a stable device identity to store and compare device-level snapshots.

Hardware-derived IDs can create privacy concerns and may behave differently across operating systems.

## Decision

The desktop app generates a random UUID on first run and stores it locally.

That UUID is the device ID for team sync.

The desktop app may also send non-secret device metadata such as device name, OS, and app version.

## Consequences

Device identity is simple and privacy-safe.

Reinstalling or clearing app data can create a new device ID.

The admin UI may show multiple device records for the same physical machine if the app is reinstalled.

## Alternatives Considered

- Hash hardware or user identifiers: potentially more stable, but worse privacy and platform behavior.
- Admin-created device names only: not reliable enough for backend identity.
