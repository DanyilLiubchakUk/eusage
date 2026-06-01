# Decision 0108: Cursor Windows support requires local Cursor install

## Status

Accepted

## Context

Cursor is the first MVP provider and Windows v1 must support Cursor.

Supporting Cursor without the local app would require external API auth work and more risk.
The product already defines provider support as readable when the provider app or CLI is installed and signed in.

## Decision

Cursor Windows v1 requires:

- Cursor desktop app installed.
- Cursor user signed in.
- eUsage can read supported Cursor local storage paths.

The first Windows path candidate is:

```text
%APPDATA%\Cursor\User\globalStorage\state.vscdb
```

Exact Windows path candidates must be verified on a real Windows machine during implementation.

## Consequences

Cursor Windows scope is clear.

eUsage does not need separate Cursor API login for Windows v1.

Provider card can show setup/error status when Cursor is missing, signed out, or unreadable.

## Alternatives Considered

- Support Cursor without local app install: more auth work and higher risk.
- Delay Cursor Windows: conflicts with Windows v1 needs and Cursor-first MVP.
