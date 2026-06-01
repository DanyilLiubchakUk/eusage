# Decision 0120: Web tests use separate command

## Status

Accepted

## Context

The repo already has desktop/plugin-oriented tests.
The new `web/` app needs pure metric tests from day one.

Keeping a separate command makes the web boundary explicit.

## Decision

Use a separate web test command:

```bash
bun test:web
```

This command covers `web/src/lib/metrics` tests and later web-specific tests.

## Consequences

Web tests are easy to run alone.

Existing desktop/plugin test commands stay separate.

Local docs need to list `bun test:web`.

## Alternatives Considered

- One repo-wide test command only: fewer commands, but less clear while web is being added.
