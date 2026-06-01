# Decision 0040: Developer tokens use SHA-256 hashing

## Status

Accepted

## Context

Raw developer tokens are shown once and should not be stored in recoverable form.

HMAC hashing with a server secret gives stronger database-leak protection, but adds another required environment variable. That hurts self-deployed setup UX.

Developer tokens will be long random values, so plain SHA-256 hashing is acceptable for v1.

## Decision

Store developer token hashes using SHA-256 of the raw token.

Example:

```text
tokenHash = SHA256(rawToken)
```

The raw token is never stored after creation or rotation.

## Consequences

No `TOKEN_HASH_SECRET` environment variable is needed.

Self-deployed setup has fewer required secrets.

Developer token generation must use high entropy. Short or human-chosen tokens are not allowed.

If the database leaks, attackers still need to guess a long random token to use it.

## Alternatives Considered

- HMAC-SHA256 with `TOKEN_HASH_SECRET`: stronger, but adds setup complexity and a long-lived env secret.
