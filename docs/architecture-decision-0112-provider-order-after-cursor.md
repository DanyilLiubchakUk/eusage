# Decision 0112: Provider order after Cursor is Codex, Claude, JetBrains

## Status

Accepted

## Context

Cursor is the first thin-slice provider.
MVP still requires Cursor, Codex, Claude, and JetBrains AI Assistant on macOS and Windows.

After Cursor, the next providers should unlock the highest-value dashboard metrics first.

## Decision

Provider order after Cursor:

1. Codex.
2. Claude.
3. JetBrains AI Assistant.

## Consequences

Token/cost charts arrive before JetBrains quota/credit charts.

Provider work stays sequenced instead of parallel and scattered.

## Alternatives Considered

- Claude before Codex: similar value, but Codex first keeps order simple.
- JetBrains second: useful, but weaker for the dashboard metric story.
