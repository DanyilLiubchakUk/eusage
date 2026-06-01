# Decision 0122: Invalid source facts reject only that provider

## Status

Accepted

## Context

The desktop sends provider payloads plus normalized source facts.
One provider in a batch may have invalid or missing source facts while other providers are valid.

Storing raw-only provider rows would make dashboards silently miss normalized data.
Rejecting the whole batch would block unrelated providers.

## Decision

If a provider payload has invalid or missing source facts:

- Reject that provider only.
- Add the provider ID to `rejectedProviderIds`.
- Store a short-lived `syncErrors` row.
- Accept other valid providers in the same batch.
- Do not store raw-only provider rows.

## Consequences

One bad provider does not block all sync.

Dashboard data stays clean.

Debugging still has short-lived error logs.

## Alternatives Considered

- Store raw payload only: hides dashboard gaps and creates orphan debug data.
- Reject whole batch: lets one provider block all sync.
