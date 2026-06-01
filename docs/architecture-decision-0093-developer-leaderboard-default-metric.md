# Decision 0093: Developer leaderboard defaults to total visible usage

## Status

Accepted

## Context

Developer leaderboard should compare team usage without being locked to one provider.

Cursor-specific views are still important, but provider filters already allow narrowing.

## Decision

Developer leaderboard defaults to total spend/usage across visible providers.

Provider filters can narrow the leaderboard to Cursor or another provider.

## Consequences

Leaderboard works for the whole product, not only Cursor.

Admins can still answer Cursor-specific questions.

## Alternatives Considered

- Cursor-only leaderboard: useful for the current team, but too narrow.
- Sync freshness leaderboard: useful for health, but not usage performance.
