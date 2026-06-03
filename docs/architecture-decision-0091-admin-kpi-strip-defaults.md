# Decision 0091: Admin KPI strip defaults

## Status

Accepted

## Context

Admin Overview needs a quick read before deeper charts and tables.

KPI cards should summarize team activity, data freshness, and Cursor budget status without becoming noisy.

## Decision

Default KPI strip cards:

- Team spend/usage.
- Active developers.
- Top provider.
- Sync health.
- Cursor budget remaining.

## Consequences

Overview starts with useful scan-level signal.

Cursor budget remains visible because it matters to the team.

The KPI strip stays small.

## Alternatives Considered

- Provider-agnostic KPIs only: cleaner, but less useful for the current Cursor-heavy workflow.
- Many KPI cards: more data, but noisy.
