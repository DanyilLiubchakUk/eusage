# Decision 0074: Usage batch accepts valid providers independently

## Status

Accepted

## Context

One team sync batch may contain several provider payloads.

One provider payload can fail validation, source-fact validation, or redaction checks while the others are valid.

Rejecting the whole batch would make one bad provider block all team sync.

## Decision

`POST /api/v1/usage/batch` accepts valid provider payloads independently.

Invalid provider payloads are rejected and listed in `rejectedProviderIds`.

Accepted provider payloads are written to Convex.

Rejected provider payloads are not written to Convex.
If source facts are invalid or missing, the provider payload is rejected; do not store raw-only provider rows.

Rejected provider payload errors are written to Convex `syncErrors` with `expiresAt`.

Rejected provider payload errors are not shown in desktop/provider UI in v1.

## Consequences

One broken provider does not block other provider data.

Admins can inspect short-lived backend error logs when debugging sync.

Backend implementation must validate and write each provider payload independently inside the batch.

## Alternatives Considered

- Reject whole batch: simpler, but worse reliability.
- Store raw payload only when source facts fail: hides dashboard gaps and creates orphan debug data.
- Accept everything and mark bad later: stores dirty data.
