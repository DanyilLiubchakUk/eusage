# Decision 0005: Admin manually creates setup token in v1

## Status

Accepted

## Context

Each team deploys its own eUsage instance on Vercel + Convex Cloud. The first admin needs a bootstrap secret before the app has users.

A setup CLI could generate this token later, but v1 should keep tooling small.

## Decision

For v1, the admin manually creates a random `SETUP_TOKEN` and stores it in Convex environment variables.

The README should show a simple command such as:

```bash
openssl rand -base64 32
```

## Consequences

This avoids building a setup CLI before the product flow is proven.

Admins must copy the token carefully and keep it secret.

Later, eUsage can add a CLI command to generate and validate setup environment values.

## Alternatives Considered

- eUsage setup CLI: cleaner, but extra tooling before v1 needs it.
