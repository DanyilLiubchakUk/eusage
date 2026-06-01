# Decision 0039: Raw developer tokens are shown once

## Status

Accepted

## Context

Developer tokens authorize desktop sync. If tokens can be revealed later, the backend must store them in recoverable form, increasing risk and requiring encryption key management.

Self-deployed teams need a simple and safe token model.

## Decision

Raw developer tokens are shown only when created or rotated.

After that, eUsage stores only token hash, fingerprint, metadata, and status.

If an admin loses the raw token, they rotate it. Rotation shows a new raw token once and revokes the old token immediately.

## Consequences

Database leaks do not expose usable raw developer tokens.

Admin UI can still identify tokens by fingerprint, developer name, label, last used time, and status.

Admins must copy the connection string when token is created or rotated.

## Alternatives Considered

- Store encrypted tokens and allow reveal: more convenient, but higher risk and requires key management.
