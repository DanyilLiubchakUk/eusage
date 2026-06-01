# Decision 0100: Usage snapshots store summary and extractor versions

## Status

Accepted

## Context

Provider extractor logic will change.
Dashboard summary fields may also change as charts improve.

Without versions, old rows are hard to reason about and hard to backfill safely.

## Decision

Each `usageSnapshots` row stores:

- `summaryVersion`: semver string, for example `1.0.0`
- `extractorVersion`: provider-keyed semver object, for example `{ cursor: "1.2.0" }`

`summaryVersion` identifies the common summary shape.
`extractorVersion` identifies the provider extraction logic that produced the summary.
It is per provider so Cursor extractor changes do not mark Claude/Codex/JetBrains rows as changed.

Patch changes mean compatible bug fixes.
Minor changes mean new fields or compatible extractor behavior.
Major changes mean incompatible summary meaning or extractor behavior.

## Consequences

Dashboards can detect older normalized rows.

Backfill tools can target rows by version.

Backfill from raw payloads is only possible inside the 90 day raw payload retention window.

## Alternatives Considered

- No versions: simpler now, but painful once extractor logic changes.
- Plugin version only: useful, but does not identify summary shape changes.
- Integer versions: simpler to compare, but weaker when extractor changes branch by provider.
- One global extractor version: simpler, but creates noisy backfill targeting.
