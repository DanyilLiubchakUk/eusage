# Decision 0102: Cursor is the first thin-slice provider

## Status

Accepted

## Context

The first implementation milestone should prove the full desktop-to-dashboard loop with one real provider before building the full dashboard.

Cursor has the strongest first product signal because it exposes plan usage, on-demand usage, API percent, and pool/budget data.

## Decision

Use Cursor as the first real provider for the end-to-end thin slice.

The first slice must send real Cursor data from desktop to Vercel API to Convex, then show it in minimal Admin and TV views.

The first TV proof shows Cursor on-demand pool/budget remaining.

## Consequences

The first milestone proves the most unique TV value early.

Cursor extractor fields and pool/budget summary fields are first-class in the initial schema work.

MVP is not done after Cursor alone.
Codex, Claude, and JetBrains follow after the Cursor slice works, and all four providers must work on macOS and Windows before v1 MVP is complete.

## Alternatives Considered

- Codex first: good token/cost story, but weaker product proof.
- Claude first: good token/cost story, but similar to Codex.
- JetBrains first: useful, but weakest first TV signal.
