# Decision 0006: One managed token per developer

## Status

Accepted

## Context

Developer desktop apps sync usage into one team deployment. The dashboard needs to compare usage by developer, and admins need a simple way to revoke or rotate access.

A shared team token would be easier to distribute, but it would make attribution weak and revocation painful.

## Decision

Each developer gets their own token.

The admin UI manages developer token records with human-friendly metadata:

- Developer name.
- Token label.
- Token fingerprint.
- Created time.
- Last used time.
- Active or inactive status.
- Optional notes or role metadata later.

Raw token values are only shown when created or rotated.

## Consequences

Usage can be attributed to the correct developer.

Admins can revoke or rotate one developer without affecting the rest of the team.

The product needs a clear token management table in the admin UI.

## Alternatives Considered

- Shared team token: simpler, but poor attribution and revocation.
