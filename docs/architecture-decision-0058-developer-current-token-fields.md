# Decision 0058: Developer record stores current token fields

## Status

Superseded by Decision 0068

Do not implement this decision as written. It is kept only to show the earlier trade-off.

## Context

Each developer gets a managed token for desktop sync. The same developer token can be used on multiple devices.

Admins need to name developers, rotate access, revoke access, and keep historical usage by developer.

Separate token history records would support deeper audit trails, but v1 does not need multiple active or historical tokens per developer.

## Decision

Use one developer record per developer.

The developer record stores the current token hash, token fingerprint, token status, token label, and token timestamps.

Rotating a token updates the same developer record with a new token hash and fingerprint.

Revoking a token marks the developer inactive.

## Consequences

Admin token management stays simple.

Historical usage remains attached to the same developer.

There is no full token history audit in v1.

Future audit needs may add a separate token-history table later.

## Superseded By

Decision 0068 moves token hash and fingerprint fields into a separate `developerTokens` table while keeping one current token per developer in v1.

## Alternatives Considered

- Separate developer and developer-token records: better audit model, but more complexity for v1.
- Treat token record as developer identity: simple, but weak for rotation, reactivation, and history continuity.
