# Hosted Web Deployment

The hosted eUsage dashboard lives in `web/`.

v1 supports one organization per Vercel + Convex deployment.

## Vercel

1. Import the GitHub repo into Vercel.
2. Set Root Directory to `web`.
3. Keep the build settings from `web/vercel.json`.
4. Add environment variables:
   - `CONVEX_DEPLOY_KEY`: Convex deploy key for this project.
   - `SETUP_TOKEN`: owner-only setup secret for the setup UI.
5. Deploy.

After the Vercel project is linked to `web`, normal pushes to the Git branch deploy the dashboard automatically.

After deploy, open `/setup`, enter `SETUP_TOKEN`, and create the single organization for this deployment.

## Local Development

```bash
bun install
bun run web:dev
```

For Convex development:

```bash
bun --cwd web run convex:dev
```

The first Convex dev run creates the local Convex deployment and generated types.

## Current Routes

- `/`: hosted app landing screen.
- `/setup`: owner setup screen. Creates the organization once, then manages tokens.
- `/tv/:orgId`: TV dashboard shell.

## Current Collector HTTP Routes

Collector uploads go directly to the Convex HTTP Actions URL, not through Vercel.

- `GET /health`: hosted collector health check.
- `POST /v1/snapshots`: teammate desktop upload endpoint. Requires `Authorization: Bearer <writeToken>`.
