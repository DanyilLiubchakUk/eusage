# UsageBoard

UsageBoard is an open source fork of OpenUsage for team AI subscription usage monitoring.

It has two parts:

- Desktop app: reads local AI tool usage on each teammate machine.
- Collector: receives teammate snapshots and serves a TV dashboard.

This fork is not the official OpenUsage project. Original source code is MIT licensed; the OpenUsage name and logo are not reused.

## Current Status

- macOS app works from the upstream base.
- Windows app needs platform cleanup before release.
- Team collector is included and can run today.
- Signed macOS/Windows releases are planned after signing access is ready.

## Collector

Start the collector:

```bash
USAGEBOARD_ADMIN_TOKEN=change-me bun run collector:dev
```

Create an organization:

```bash
curl -X POST http://127.0.0.1:8787/v1/orgs \
  -H "Authorization: Bearer change-me" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Team"}'
```

The response includes:

- `orgId`
- `writeToken` for teammate apps
- `readToken` for the TV dashboard

TV URL:

```text
http://127.0.0.1:8787/tv/acme-team?token=READ_TOKEN
```

See [docs/team-collector.md](docs/team-collector.md).

## Desktop Team Sync

Team sync is opt-in. Add this to the app `settings.json`:

```json
{
  "teamSync": {
    "enabled": true,
    "collectorUrl": "http://127.0.0.1:8787",
    "orgId": "acme-team",
    "writeToken": "ub_write_xxx",
    "teammateId": "danyil",
    "teammateName": "Danyil"
  }
}
```

When a provider probe succeeds, the app uploads only the provider snapshot.

## Install Plan

macOS:

- Build artifact: `.dmg`
- App appears in `/Applications`
- Runtime UI appears in the macOS menu bar
- Smooth public install needs Apple Developer ID signing and notarization

Windows:

- Build artifact: `.exe` installer first, `.msi` later if needed
- App appears in Start Menu and system tray
- Unsigned installers are free but may show Microsoft SmartScreen warnings
- Signed installers need Windows code signing or Microsoft Store distribution

Collector:

- Runs on any machine with Node/Bun
- For a TV, run it on a LAN machine/server and open `/tv/:orgId`
- For internet use, put it behind HTTPS

## Development

```bash
bun install
bun run test
bun run collector:test
bun tauri dev
```

## License

MIT. See [LICENSE](LICENSE).
