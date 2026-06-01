# Decision 0007: Developer identity comes from the token record

## Status

Accepted

## Context

Each developer has a managed token record with admin-controlled metadata such as name, label, fingerprint, and status.

If the desktop app also sends developer identity during sync, metadata can drift or be spoofed by a modified client.

## Decision

During sync, the backend derives developer identity from the token record only.

The desktop app sends the developer token in the HTTP `Authorization: Bearer ...` header. The backend hashes it, finds the active token record, and attributes usage to the developer attached to that record.

The backend ignores any developer name or developer ID sent by the desktop app.

## Consequences

Admin-managed developer metadata remains the source of truth.

Desktop sync requests are smaller and harder to spoof.

Developers cannot rename themselves from the desktop app in v1. Admins manage names and metadata in the dashboard.

## Alternatives Considered

- Desktop sends developer name too: convenient, but creates spoofing and metadata drift.
