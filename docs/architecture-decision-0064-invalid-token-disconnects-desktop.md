# Decision 0064: Invalid developer token disconnects desktop team sync

## Status

Accepted

## Context

Desktop team sync uses a stored raw developer token.

The backend can reject a request because the token is missing, invalid, revoked, or attached to an inactive developer.

Retrying forever would create noisy failed requests and make the desktop look connected when it is not.

## Decision

When a backend team endpoint rejects the developer token as invalid, revoked, or inactive, the desktop app:

- Marks Team connection as invalid or revoked.
- Stops team sync.
- Removes the raw developer token from OS credential storage.
- Keeps local provider collection working.
- Requires a new connection string to reconnect.

Network failures and temporary server errors remain retryable team-sync failures.

## Consequences

Revocation works on all connected devices after their next backend request.

The developer sees a clear Team connection problem instead of silent failed sync.

Another developer can connect the same machine with a new connection string.

Admin must issue a new token to restore sync.

## Alternatives Considered

- Keep token and retry forever: less disruptive for backend bugs, but noisy and confusing after real revocation.
- Silently ignore team sync: hides data loss from the developer.
