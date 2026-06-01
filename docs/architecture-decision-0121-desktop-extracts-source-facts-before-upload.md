# Decision 0121: Desktop extracts source facts before upload

## Status

Accepted

## Context

Provider plugins already know provider-specific local data and API response shapes.
The dashboard needs normalized source facts in Convex for all-time reporting and calculations.

Putting extraction in the web/backend would let extractor logic change without desktop updates, but it moves provider-specific knowledge into the hosted app and makes the upload contract looser.

## Decision

Desktop/provider code extracts normalized source facts before upload.

The usage batch sends:

- `uploadSchemaVersion`.
- Redacted provider payload.
- Normalized source facts for `usageSnapshots.summary`.
- Source metric samples for `metricSamples`.
- `summaryVersion`.
- Per-provider `extractorVersion`.

The web/backend validates and stores these fields.
Normal provider extraction does not live in Convex or Vercel API routes in v1.

Each v1 provider must add tests for:

- Normalized source facts for `usageSnapshots.summary`.
- Source metric samples for `metricSamples`.
- `uploadSchemaVersion`.
- `summaryVersion`.
- Per-provider `extractorVersion`.
- Redacted upload payload shape.

If a provider payload has invalid or missing source facts, backend rejects that provider only, records `syncErrors`, and can still accept other providers in the same batch.
Do not store raw-only provider rows when source facts are invalid.

## Consequences

Provider logic stays close to provider plugins.

Backend ingest is simpler and more validation-focused.

Extractor changes require desktop updates for new uploads.

Invalid source facts do not poison dashboard data.

Provider plugin tests become part of the data contract.

Old raw payloads can still help debugging for 90 days, but v1 does not rely on backend reprocessing as the normal path.

## Alternatives Considered

- Backend extracts source facts: easier to update centrally, but moves provider-specific logic into web/backend.
- Both desktop and backend extract and compare: strong validation, but too much v1 complexity.
