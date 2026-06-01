# Decision 0035: Token revoke disables devices, desktop can disconnect locally

## Status

Accepted

## Context

One developer token can be used on multiple devices. The token identifies the developer, while device IDs identify installations.

An admin may revoke a developer token. A developer may also need to disconnect a laptop locally so another developer can connect with their own credentials later.

## Decision

Revoking a developer token marks that developer inactive and stops sync from all devices using that token.

When a device later receives an invalid, revoked, or inactive token response from the backend, it removes the stored raw developer token and stops team sync.

The desktop app must also provide a local disconnect action. Disconnect removes the stored team connection string/token from that device and stops team sync.

After disconnect, the same desktop installation can connect again with a different developer connection string.

## Consequences

Admin token revoke is developer-wide and simple.

Developers can safely sign out of team sync on shared or reassigned machines.

Local disconnect does not delete historical usage already synced to the team deployment.

## Alternatives Considered

- Per-device revoke: more granular, but conflicts with one-token-per-developer v1 simplicity.
