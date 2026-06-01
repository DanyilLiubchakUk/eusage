# Decision 0016: Dashboard and TV mode require admin login

## Status

Accepted

## Context

The web app needs an admin dashboard and a TV/fullscreen display mode. The referenced Cursor dashboard has a normal dashboard route and a fullscreen display route with slide rotation, refresh, fullscreen controls, and keyboard navigation.

eUsage usage data belongs to the team deployment and should not be publicly readable by default.

## Decision

The dashboard and TV/fullscreen mode require admin login in v1.

The TV mode should be a full-screen read-only display experience with slide-style views, zoom/fullscreen behavior, and automatic rotation similar to the existing Cursor dashboard pattern.

TV mode should include controls for pause/resume, previous/next slide, and exit fullscreen.

Public read-only TV links are deferred.

## Consequences

Team usage data is protected by Clerk admin auth.

TV setup requires signing in as the deployment owner on the display browser.

The first implementation can focus on one protected display mode instead of separate public read tokens.

## Alternatives Considered

- Public read-only TV token: convenient for wall displays, but adds another token type and leakage risk.
- Fully public dashboard: simplest, but exposes team usage data.
