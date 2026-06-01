# Decision 0015: Upload full plugin payloads

## Status

Accepted

## Context

The dashboard should be able to show any useful usage data that the desktop app already has. If the sync path only uploads a narrow normalized shape, later dashboard features may need desktop app changes or historical data may be missing.

Plugin output is already the source of local UI data.

## Decision

Team sync uploads:

- The full successful plugin output available to the desktop app.
- Normalized source facts extracted by desktop/provider code.

Full payload does not mean raw secrets. Plugins should return redacted payloads, and the desktop app must run a generic secret-field scrubber before upload.

The backend should store enough raw plugin payload data to support future dashboard views, debugging, and reprocessing.

The backend stores desktop-extracted source facts in normalized tables.
The dashboard calculates derived metrics from those stored source facts.

## Consequences

Dashboard development is more flexible because the backend has all data the desktop collected.

Payload size and privacy need attention. Secrets and credentials must be redacted before upload.

The API should include provider ID, capture time, app version, plugin version if available, the full plugin output payload, normalized source facts, `summaryVersion`, and per-provider `extractorVersion`.

## Alternatives Considered

- Normalized source facts only: smaller and cleaner, but loses short-term debug flexibility.
- Normalized metrics plus small raw snapshot: safer than full payload, but may still omit data needed later.
