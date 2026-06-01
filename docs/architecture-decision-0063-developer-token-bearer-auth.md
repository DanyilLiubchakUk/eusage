# Decision 0063: Desktop uses Bearer auth for developer tokens

## Status

Accepted

## Context

The desktop app sends authenticated requests for usage upload, device check-in, and disconnect.

The backend needs the raw developer token so it can hash the token and find the active developer record.

Putting the token in a request URL can leak it through logs, browser history, proxies, or screenshots.

## Decision

Desktop backend requests send the developer token in the HTTP `Authorization` header:

```text
Authorization: Bearer eusage_dev_...
```

The backend hashes the bearer token with SHA-256 and matches it against the active developer token hash.

The token must not be sent in backend request URLs.

The `eusage://connect?...token=...` connection string is only a local desktop handoff format used during initial connection.

## Consequences

Collector, check-in, and disconnect endpoints share one simple auth shape.

Backend logs and URLs are less likely to leak developer tokens.

Request body payloads can stay focused on usage, device, and provider data.

## Alternatives Considered

- Token in JSON body: workable, but easier to mix into payload logging.
- Token in URL query: simplest to test, but unsafe for a reusable open source app.
