# Decision 0059: Developer status is active or inactive

## Status

Accepted

## Context

Each developer has one current token used for desktop sync.

Admins need to stop sync for a developer without deleting historical usage. They also need to re-enable a developer by issuing a new token.

Separate revoked status is less useful when v1 does not keep a token history table.

## Decision

Developer status has two v1 states:

- `active`.
- `inactive`.

Revoking a developer token makes the developer inactive.

Rotating a token for an active developer keeps the developer active and replaces the current token record.

Re-enabling an inactive developer generates a new token and marks the developer active.

## Consequences

Developer lifecycle stays simple.

Historical usage remains attached to inactive developers.

TV/display mode hides inactive developers by default.

If token history is added later, a separate revoked-token concept may be introduced.

## Alternatives Considered

- `active`, `inactive`, and `revoked`: more explicit, but unnecessary without token history.
- Boolean `isActive`: too weak for readable admin UI and future lifecycle expansion.
