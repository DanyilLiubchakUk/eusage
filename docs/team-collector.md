# Team Collector

The collector receives teammate usage snapshots and serves a TV dashboard.

Design goal: no accounts, no database setup, no SaaS dependency.

## Auth Model

Each organization has two tokens:

- `writeToken`: used by teammate desktop apps to upload snapshots.
- `readToken`: used by the TV dashboard and read-only API.

Tokens are stored hashed in the collector data file. Raw tokens are shown only when the organization is created.

This is not full user auth. It is capability-token auth. For small teams, it is enough and simple.

## Run

```bash
USAGEBOARD_ADMIN_TOKEN=change-me bun run collector:dev
```

Optional:

```bash
PORT=8787
USAGEBOARD_DATA_FILE=/var/lib/usageboard/store.json
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
    "writeToken": "ub_write_xxx",
    "teammateId": "alex",
    "teammateName": "Alex"
  }
}
```

The desktop app uploads after successful provider probes.

Payload shape:

```json
{
  "orgId": "acme-team",
  "teammateId": "alex",
  "teammateName": "Alex",
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

### `GET /v1/orgs/:orgId/usage`

Header:

```text
Authorization: Bearer READ_TOKEN
```

Returns teammates and latest provider snapshots.

### `GET /tv/:orgId?token=READ_TOKEN`

TV dashboard. Refreshes every 15 seconds.

## Deployment

LAN-only:

```bash
USAGEBOARD_ADMIN_TOKEN=change-me PORT=8787 bun run collector:dev
```

Internet:

- Run collector behind HTTPS.
- Keep `USAGEBOARD_ADMIN_TOKEN` secret.
- Treat `writeToken` and `readToken` like passwords.
- Rotate tokens by creating a new org until token rotation UI exists.
