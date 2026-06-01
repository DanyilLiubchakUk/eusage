# Decision 0070: Use minimal desktop API routes

## Status

Accepted

## Context

The desktop app is an external client. It needs stable HTTP endpoints at the team app URL.

The admin dashboard and TV are part of the hosted web app. They can use Clerk-authenticated Convex functions directly.

Putting all admin CRUD behind Vercel API routes would add many files and duplicate Convex auth/data logic.

## Decision

Use TanStack Start server routes in `web/`, deployed as Vercel Functions, for desktop-only HTTP API:

```text
GET  /api/v1/team-config
POST /api/v1/device/check-in
POST /api/v1/usage/batch
POST /api/v1/device/disconnect
```

Desktop calls the team app URL only.

Desktop does not call Convex directly.

`GET /api/v1/team-config` is public and returns only safe metadata.

The other desktop endpoints require `Authorization: Bearer ...`.

`POST /api/v1/usage/batch` returns a small sync result with accepted count, rejected provider IDs, and server time.

Admin dashboard and TV use Clerk-authenticated Convex functions directly.

## Consequences

Desktop setup stays stable with one team URL.

Convex deployment details stay out of desktop config.

Admin UI avoids extra API boilerplate.

The public HTTP surface stays small.

## Alternatives Considered

- Route all backend actions through Vercel API routes: more central control, but too much boilerplate for v1.
- Desktop uploads directly to Convex HTTP actions: fewer Vercel routes, but exposes Convex details to desktop config.
