# Decision 0124: Usage batch has upload schema version

## Status

Accepted

## Context

Desktop API routes are versioned under `/api/v1`.
The usage batch payload also has its own envelope shape.

`summaryVersion` describes normalized summary shape.
`extractorVersion` describes provider extraction logic.
Neither describes the full upload envelope.

## Decision

Every usage batch includes:

```text
uploadSchemaVersion: "1.0.0"
```

This is separate from:

- `/api/v1` route version.
- `summaryVersion`.
- `extractorVersion`.

## Consequences

Backend can validate upload envelope compatibility.

Desktop/backend compatibility errors can be clearer.

Future payload envelope changes do not have to mean route changes unless the HTTP contract changes too.

## Alternatives Considered

- `/api/v1` only: simpler, but transport and payload meaning get mixed.
- `summaryVersion` only: versions normalized facts, not the full upload envelope.
