# Decision 0031: Latest device snapshot wins for overlapping provider periods

## Status

Accepted

## Context

One developer token can be used on multiple devices. Each device can report the same provider and usage period.

Many AI usage providers report account-level usage. If a developer uses the same provider account on multiple devices, summing device snapshots can double-count usage.

## Decision

For v1 dashboard totals, when the same developer has multiple device snapshots for the same provider and usage period, use the latest uploaded device snapshot.

Do not sum overlapping device snapshots for the same developer/provider/period in v1.

## Consequences

Dashboard totals avoid obvious double counting for account-level providers.

Device-level data is still stored for sync health and debugging.

If one device has stale provider data and another has fresh data, the fresh upload wins.

Provider-specific metric-sample merge rules now apply where source scope is known:

- Account-level providers may keep latest-wins behavior.
- Device-local consumed samples, such as Codex and Claude ccusage token/cost rows, are stored with `deviceId` and summed across devices.

## Alternatives Considered

- Sum all device snapshots: simpler, but likely double-counts account-level usage.
- Provider-specific merge rules now: best long-term, but too much v1 complexity.
