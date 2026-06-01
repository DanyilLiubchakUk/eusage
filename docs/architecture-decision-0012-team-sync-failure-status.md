# Decision 0012: Team sync failures show small team status

## Status

Accepted

## Context

Team sync uploads are separate from local provider probes. A provider can refresh successfully while the team upload fails because of network, token, or deployment issues.

Showing sync failures as provider failures would confuse local data quality with remote upload status. Toasting every failure would be noisy when a developer is offline or the team deployment is unavailable.

## Decision

Team sync failures should show in a small team connection/status area.

Provider cards should continue to show local probe results when the local probe succeeded. Team sync errors should not mark provider cards as failed.

Invalid, revoked, or inactive developer tokens are not normal retryable sync failures. The desktop app should mark the team connection invalid, remove the stored raw developer token, and require a new connection string.

## Consequences

Developers can keep using local usage data even when team sync is temporarily down.

The app needs a team status surface such as "Team sync failed 2 min ago" or "Last synced 10 min ago".

The admin dashboard can separately show stale devices under developers.

## Alternatives Considered

- Provider-level warning: more visible, but noisy and mixes local probe status with team sync status.
- Toast every failure: obvious, but annoying during network outages.
