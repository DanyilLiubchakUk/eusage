# Decision 0008: Usage uploads go through the Vercel app API

## Status

Accepted

## Context

Each team has a self-deployed Vercel app and Convex Cloud project. Developer desktop apps connect with one connection string that contains the team app URL and developer token.

The desktop app could upload directly to Convex HTTP endpoints, but that would expose another deployment URL to desktop configuration and make future backend URL changes harder.

## Decision

Developer desktop apps upload usage to the team's Vercel app API.

Desktop API routes are TanStack Start server routes inside `web/`, deployed as Vercel Functions:

```text
GET  /api/v1/team-config
POST /api/v1/device/check-in
POST /api/v1/usage/batch
POST /api/v1/device/disconnect
```

The Vercel API validates the developer token, derives developer identity from the token record, and writes usage to Convex.

The desktop app sends the token with an HTTP `Authorization: Bearer ...` header for authenticated endpoints, not in the request URL.

`GET /api/v1/team-config` is public and returns only safe metadata.

The desktop app treats the Vercel app URL as the stable team deployment surface.

Admin dashboard and TV use Clerk-authenticated Convex functions directly instead of routing all admin CRUD through Vercel API routes.

## Consequences

Developer setup stays simple: app URL plus token.

Teams can change Convex project details without reconnecting desktop apps.

Vercel handles recurring desktop uploads and device check-ins, roughly one request per connected developer every few minutes.

## Alternatives Considered

- Direct Convex HTTP upload: fewer hops, but exposes Convex URL to desktop setup and makes backend URL changes more visible.
- Route all admin CRUD through Vercel API routes: more control, but more boilerplate for v1.
