# ADR 0010: Desktop uploads use the Convex HTTP URL directly

## Status

Accepted

## Context

The hosted eUsage app has two public surfaces:

- The Vercel URL for setup and TV dashboard UI.
- The Convex HTTP Actions URL for collector writes.

Desktop apps send usage snapshots every few minutes. Routing every upload through Vercel first would add another serverless hop and another place to debug failures.

## Decision

Desktop apps upload usage snapshots directly to the Convex HTTP Actions URL.

The setup UI should show both URLs:

- Dashboard URL: the Vercel app URL.
- Collector URL: the Convex `.convex.site` URL.

The desktop app stores the collector URL separately from dashboard/read URLs.

## Consequences

This keeps collector writes simple and avoids Vercel function cost for recurring uploads.

The owner must copy the correct Convex collector URL into teammate setup instructions. The UI must label this clearly.

## Alternatives Considered

- Proxy uploads through Vercel: one public app URL, but adds another serverless hop and cost for every desktop upload.
