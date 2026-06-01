# Decision 0106: Connection string contains only URL and token

## Status

Accepted

## Context

Developers need a simple copy/paste setup.
The desktop app should not know Convex deployment details.

Team name, app version, API version, and endpoint paths can be discovered from the public safe `team-config` endpoint.

## Decision

The connection string contains only:

- Team app URL.
- Developer token.

Format:

```text
eusage://connect?url=https://your-eusage.vercel.app&token=eusage_dev_...
```

Local dev uses the same format with localhost:

```text
eusage://connect?url=http://localhost:3000&token=eusage_dev_...
```

Desktop discovers all safe metadata from `GET /api/v1/team-config`.

## Consequences

Connection strings stay small.

Desktop config does not include Convex URLs.

Team metadata can change without issuing new developer tokens.

## Alternatives Considered

- Include team name/fingerprint: avoids one metadata call, but can go stale.
- Include Convex URL: exposes backend deployment details to desktop config.
- Special local dev connection fields: convenient, but creates a different setup path.
