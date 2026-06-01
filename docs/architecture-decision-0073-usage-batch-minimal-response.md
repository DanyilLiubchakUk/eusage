# Decision 0073: Usage batch returns minimal sync result

## Status

Accepted

## Context

The desktop app needs to show useful team sync status after uploading a usage batch.

It does not need full stored rows back from Convex because the local app already has provider results.

Returning nothing would make sync status harder to explain.

## Decision

`POST /api/v1/usage/batch` returns a minimal JSON result:

```json
{
  "acceptedCount": 3,
  "rejectedProviderIds": ["cursor"],
  "serverTime": "2026-05-30T12:00:00.000Z"
}
```

`acceptedCount` counts accepted provider payloads.

`rejectedProviderIds` lists provider payloads rejected by validation or redaction checks.

Valid provider payloads are accepted even when another provider payload in the same batch is rejected.

Rejected provider payload details are logged in Convex `syncErrors` with expiry. The desktop UI does not need to show those errors in v1.

`serverTime` lets desktop show backend contact time and debug clock drift.

The endpoint does not return full stored snapshot or payload rows.

## Consequences

Desktop can show last sync status clearly.

Responses stay small.

Debugging rejected providers is possible through short-lived Convex error logs without exposing stored payloads.

One broken provider payload does not block the rest of team sync.

## Alternatives Considered

- Return full stored rows: more debug detail, but larger and unnecessary for desktop UI.
- Return no body on success: simpler, but too weak for sync status.
