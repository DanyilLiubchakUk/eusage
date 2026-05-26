# Team Collector

The collector receives teammate usage snapshots and serves a TV dashboard.

Design goal: simple setup for small teams.

The current collector is a local development collector. The accepted hosted direction is:

- Vercel hosts the public dashboard and API.
- Convex stores organizations, tokens, teammates, and usage snapshots.
- Each organization self-hosts its own eUsage instance.

## Auth Model

Each self-hosted deployment has one setup token. Each organization has dashboard read tokens. Each teammate has their own write token:

- `SETUP_TOKEN`: stored as a hosting environment variable; used by the owner to create organizations and manage tokens.
- `writeToken`: used by one teammate desktop app to upload snapshots for that teammate.
- `readToken`: used by the TV dashboard and read-only API.

Read and write tokens are stored hashed. Raw tokens are shown only when created. The setup token is not stored in Convex.

For owner convenience, Convex stores safe display metadata for read/write tokens:

- label
- first few token characters
- last few token characters
- token type
- created time
- last used time when available
- revoked time when available

The setup UI can show `eu_write_abcd******wxyz`, but it cannot recover the raw token.

This is not full user auth. It is capability-token auth. For small teams, it is enough and simple.

## Run

```bash
EUSAGE_ADMIN_TOKEN=change-me bun run collector:dev
```

Optional:

```bash
PORT=8787
EUSAGE_DATA_FILE=/var/lib/eusage/store.json
```

## Create Organization

```bash
curl -X POST http://127.0.0.1:8787/v1/orgs \
  -H "Authorization: Bearer change-me" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Team"}'
```

Response:

```json
{
  "orgId": "acme-team",
  "name": "Acme Team",
  "writeToken": "ub_write_xxx",
  "readToken": "ub_read_xxx"
}
```

Save both tokens. They cannot be recovered from the data file.

## Desktop App Config

Add `teamSync` to app `settings.json`:

```json
{
  "teamSync": {
    "enabled": true,
    "collectorUrl": "http://127.0.0.1:8787",
    "orgId": "acme-team",
    "writeToken": "eu_write_xxx"
  }
}
```

The desktop app uploads after successful provider probes.

Payload shape:

```json
{
  "orgId": "acme-team",
  "snapshot": {
    "providerId": "codex",
    "displayName": "Codex",
    "plan": "Pro",
    "lines": [],
    "fetchedAt": "2026-05-26T12:00:00Z"
  }
}
```

## API

### `POST /v1/usage`

Header:

```text
Authorization: Bearer WRITE_TOKEN
```

Body: payload above.

The collector resolves the teammate from the write token. It does not trust teammate identity from the request body.

### `GET /v1/orgs/:orgId/usage`

Header:

```text
Authorization: Bearer READ_TOKEN
```

Returns teammates and latest provider snapshots.

### `GET /tv/:orgId?token=READ_TOKEN`

TV dashboard. Refreshes every 15 seconds.

## Deployment

Local development:

```bash
EUSAGE_ADMIN_TOKEN=change-me PORT=8787 bun run collector:dev
```

Hosted v1:

- Deploy the web dashboard/API to Vercel.
- Use Convex for durable data.
- Keep setup/admin secrets in Vercel and Convex environment variables.
- Treat `writeToken` and `readToken` like passwords.
