# ADR 0002: Per-teammate write tokens

## Status

Accepted

## Context

Desktop apps need to upload usage snapshots to the hosted collector. A single shared organization write token would be simpler to distribute, but it would make every teammate equivalent for writes. If one teammate leaves or leaks the token, the whole team would need to rotate the shared token. It would also let any holder submit usage for any teammate unless the collector trusts request body identity.

## Decision

Each teammate gets their own write token. The collector resolves teammate identity from the token record, not from the uploaded request body.

## Consequences

This keeps the v1 auth model simple while improving safety:

- One teammate can be revoked without rotating every desktop app.
- A leaked write token can only spoof one teammate.
- The collector does not trust client-provided teammate identity.
- Setup must generate and distribute one write token per teammate.

## Alternatives Considered

- Shared organization write token: simpler initial setup, but poor revocation and easy teammate spoofing.
- Full user login: stronger identity, but too much account and session machinery for v1 self-hosted teams.
