# Decision 0123: Provider plugins test source facts and upload redaction

## Status

Accepted

## Context

Desktop/provider code extracts normalized source facts before upload.
Those source facts become the dashboard data contract.

Manual provider testing proves local apps, credentials, and OS paths.
It does not prove that extractor output shape stays stable.

## Decision

Each v1 provider plugin must have tests for:

- Normalized source facts for `usageSnapshots.summary`.
- Source metric samples for `metricSamples`.
- `summaryVersion`.
- Per-provider `extractorVersion`.
- Redacted upload payload shape.

This is implemented provider by provider.

Required v1 providers:

- Cursor.
- Codex.
- Claude.
- JetBrains AI Assistant.

## Consequences

Provider extractor regressions are caught before upload.

Dashboard data contract is tested at the plugin boundary.

Manual provider/platform checklist still remains required because tests cannot prove real OS credential and path behavior.

## Alternatives Considered

- Cursor-only tests first: useful for the thin slice, but not enough for MVP.
- Manual testing only: too weak for the normalized upload contract.
