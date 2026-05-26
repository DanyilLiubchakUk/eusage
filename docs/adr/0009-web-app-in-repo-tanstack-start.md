# ADR 0009: Web app lives in /web with TanStack Start

## Status

Accepted

## Context

eUsage needs a hosted dashboard and setup UI that can be deployed to Vercel and backed by Convex.

The existing repository already contains the desktop app. Mixing hosted dashboard code into the desktop source would blur ownership and make Vercel project detection harder.

## Decision

Create a `web/` workspace for the hosted eUsage app.

The web app uses TanStack Start for the UI and route structure. Convex functions live beside it in `web/convex`.

Vercel should be configured with Root Directory set to `web`. The `web/vercel.json` file owns install and build commands for that project.

## Consequences

Desktop and hosted dashboard code can evolve separately while staying in one repo.

Vercel still requires selecting `web` as the project root during import or project setup. After that, Git pushes deploy the web project automatically.

## Alternatives Considered

- Keep web code at repo root: simpler for Vercel, but mixes desktop and hosted app concerns.
- Create a separate repo: cleaner deployment boundary, but harder to keep open source fork setup simple.
- Use Next.js: strong Vercel default, but the accepted direction is TanStack Start.
