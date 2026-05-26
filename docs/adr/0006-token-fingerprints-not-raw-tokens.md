# ADR 0006: Token fingerprints instead of raw token storage

## Status

Accepted

## Context

Setup UI needs to help owners distinguish tokens later. For example, the owner should know which token belongs to "Danyil desktop" or "Office TV" without storing or revealing the full secret.

Raw token storage would make token recovery convenient, but would increase the damage if Convex data is exposed.

## Decision

Store token hashes for authentication. Store safe metadata for display:

- label
- token type
- first few token characters
- last few token characters
- created time
- last used time when available
- revoked time when available

Do not store raw write or read tokens in Convex.

The setup UI shows the raw token only once at creation. Later it shows a fingerprint like `eu_write_abcd******wxyz`.

## Consequences

This keeps token management usable without making the database a secret vault.

If an owner loses a raw token, they cannot recover it. They must rotate or create a new token.

## Alternatives Considered

- Store raw tokens: convenient, but unsafe if database contents leak.
- Store encrypted tokens: more complex, still needs key management, not needed for v1.
- Store only hashes with no display metadata: safer but hard to manage after setup.
