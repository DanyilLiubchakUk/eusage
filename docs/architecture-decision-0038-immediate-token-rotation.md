# Decision 0038: Token rotation revokes old token immediately

## Status

Accepted

## Context

Admins can re-enable inactive developers or rotate developer credentials by issuing a new token.

A grace period would reduce disruption, but would require tracking multiple active tokens for one developer and explaining overlap behavior.

## Decision

When an admin rotates a developer token, the old token is revoked immediately.

Devices using the old token stop syncing until the developer pastes the new connection string.

## Consequences

Token rotation is simple and secure.

Developers may need to reconnect all devices after rotation.

No grace-period token lifecycle is needed in v1.

## Alternatives Considered

- Grace period: smoother, but more token lifecycle complexity.
