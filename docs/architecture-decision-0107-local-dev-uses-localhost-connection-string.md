# Decision 0107: Local dev uses localhost connection string

## Status

Accepted

## Context

Local development should test the same connection flow as production.
Special dev-only token fields or env-based desktop setup would hide real setup bugs.

## Decision

Local dev uses the same connection string shape:

```text
eusage://connect?url=http://localhost:3000&token=eusage_dev_...
```

The desktop still calls `/api/v1/team-config` and authenticated desktop API routes through the app URL.

## Consequences

Local testing matches production setup.

Desktop needs no special local connection path.

## Alternatives Considered

- Special dev mode fields: more code paths.
- Desktop reads env vars in dev: convenient, but does not test real onboarding.
