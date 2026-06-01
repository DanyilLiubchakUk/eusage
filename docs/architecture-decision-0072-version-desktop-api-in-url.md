# Decision 0072: Version desktop API in URL

## Status

Accepted

## Context

The desktop app will ship separately on macOS and Windows.

Old desktop apps may talk to newer team deployments after backend changes.

Relying only on metadata returned by `team-config` can detect mismatch, but URL versioning makes the route contract obvious.

## Decision

Desktop API routes are versioned in the URL.

v1 routes:

```text
GET  /api/v1/team-config
POST /api/v1/device/check-in
POST /api/v1/usage/batch
POST /api/v1/device/disconnect
```

The team config response may still include `apiVersion: "v1"` for display/debugging.

Breaking API changes should use a new URL version.

Usage batches also include `uploadSchemaVersion`, for example `"1.0.0"`.
The route version describes the HTTP transport contract.
The upload schema version describes the payload envelope.
`summaryVersion` and `extractorVersion` describe normalized source facts inside the payload.

## Consequences

Desktop/backend compatibility is clearer.

Windows and macOS releases can show better errors when their API version is unsupported.

Route paths are slightly longer.

Backend can reject unsupported upload payload shapes without changing URL routes for compatible transport changes.

## Alternatives Considered

- Version only in `team-config` response: simple, but less explicit for request routing.
- No API versioning: fastest now, painful after desktop releases exist.
- Use `/api/v1` only: simpler, but cannot distinguish transport version from payload envelope version.
