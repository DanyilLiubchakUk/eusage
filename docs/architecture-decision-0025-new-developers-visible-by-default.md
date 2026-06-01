# Decision 0025: New developers are visible by default

## Status

Accepted

## Context

Admins can show or hide developers in dashboard and TV/display configuration.

When a new developer token is created and the developer starts syncing, the product must decide whether that developer appears automatically or waits for manual display configuration.

## Decision

New developers are visible by default.

They appear automatically in admin dashboard views and TV/display mode unless the admin hides them.

## Consequences

Teams see newly connected developers without extra setup.

TV mode may show a new developer as soon as they sync usage.

Admins can still hide developers through dashboard or TV config.

## Alternatives Considered

- Hidden on TV until enabled: safer curation, but more setup and easier to miss new teammates.
