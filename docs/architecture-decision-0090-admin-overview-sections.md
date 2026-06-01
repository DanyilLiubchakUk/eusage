# Decision 0090: Admin Overview includes charts and compact detail tables

## Status

Accepted

## Context

Admin Overview should be the all-up page with everything important.

It should feel dense enough to be useful, but should not become a full admin console with every control duplicated.

## Decision

Admin Overview includes:

- KPI strip.
- Team usage over time.
- Developer leaderboard.
- Provider breakdown.
- Cursor pool.
- Sync health.
- Compact detail tables.

KPI strip defaults:

- Team spend/usage.
- Active developers.
- Top provider.
- Sync health.
- Cursor pool remaining.

Compact detail tables:

- Top Developers.
- Provider Status.
- Recent Syncs.
- Available Metrics.

The Admin Overview compact detail tables are admin Overview only.
TV has its own compact available-metrics table on the Team Overview slide.

Admin metric tables should include tooltip explanations for metric meaning and source.

The Admin Overview available-metrics table can show quota pressure as:

- Per developer per provider.
- Per developer average.
- Per provider team average.
- Team average.
- Worst active pressure.
- High-pressure count.

Detailed management controls stay on focused pages such as Developers, Providers, TV, and Settings.

## Consequences

Overview gives a full read of team usage.

Admins can drill into focused pages for edits and deeper workflows.

Implementation avoids duplicating all controls on the Overview page.

## Alternatives Considered

- Small all-up set: cleaner, but too weak for admin review.
- Huge report page with all controls: powerful, but too crowded for v1.
