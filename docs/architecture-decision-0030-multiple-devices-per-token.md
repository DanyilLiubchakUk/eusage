# Decision 0030: One developer token can be used on multiple devices

## Status

Accepted

## Context

A developer may use multiple machines, such as a MacBook and a Windows desktop. The admin should not need to create a separate developer token for every device.

At the same time, device-level sync data matters because different devices can report conflicting or overlapping provider snapshots.

## Decision

The same developer token can be used on multiple devices.

The token still identifies the developer. Each desktop app installation also has a stable device identity.

Usage snapshots are stored with developer, device, provider, and usage period or equivalent data identity.

## Consequences

Developer setup stays simple: one token/connection string per developer.

The backend can distinguish multiple devices for the same developer.

Dashboard logic must avoid blindly double-counting overlapping provider data from multiple devices.

The admin UI can show device-level sync status for a developer.

## Alternatives Considered

- One token per device: clearer device identity, but worse admin/developer UX.
- One active device per developer: simple, but blocks common multi-machine workflows.
