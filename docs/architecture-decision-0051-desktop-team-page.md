# Decision 0051: Desktop app has a Team page

## Status

Accepted

## Context

The desktop app must support team connection, local provider collection, and sync status.

Team connection can succeed even before providers are configured. Provider setup and team sync need separate status surfaces.

Putting team setup only inside general settings or only in a first-run modal would make later management and debugging harder.

## Decision

The desktop app has a dedicated Team page in the main navigation.

The Team page should include:

- Connect and disconnect actions.
- Team deployment URL.
- Developer token fingerprint, not raw token.
- Last sync status.
- Device status.
- Provider support/configuration summary.

## Consequences

Developers have one obvious place to manage team sync.

Team sync status is visible without mixing it into provider cards.

The side navigation needs a Team entry.

The first-run connect flow can still deep-link or navigate to this page.

## Alternatives Considered

- Put team setup in Settings: fewer navigation entries, but hides important sync state.
- First-run modal only: good initial flow, but weak for later disconnect, reconnect, or debugging.
