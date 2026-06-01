# Decision 0109: Cursor provider card shows setup, signed out, and unreadable states

## Status

Accepted

## Context

Cursor Windows v1 requires the local Cursor app to be installed and signed in.

When Cursor is missing or unreadable, team connection should still work and other providers should still sync.

## Decision

Cursor provider card uses explicit states:

- `Setup needed`: Cursor app not found.
- `Signed out`: Cursor auth not found or invalid.
- `Unreadable`: Cursor storage exists but cannot be read or parsed.

Each state shows short fix text.

Team connection and other provider sync remain available.

## Consequences

Developer onboarding stays clear.

Cursor failures do not block team sync.

Provider errors are actionable instead of generic.

## Alternatives Considered

- Generic error: less useful.
- Block team connection: mixes team auth with provider setup.
- Hide Cursor until working: too hard to debug.
