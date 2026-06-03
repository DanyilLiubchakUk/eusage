# Decision 0115: Provider-platform proof uses manual checklist

## Status

Accepted

## Context

Provider support depends on local apps, CLIs, credentials, storage paths, OS credential stores, and signed-in state.
Unit tests cannot prove the real local setup works on macOS and Windows.

## Decision

Each required provider on each platform must pass a manual checklist:

- Provider app or CLI is installed.
- Provider user is signed in.
- Provider plugin tests pass for normalized source facts and upload redaction shape.
- eUsage provider card shows data.
- Team upload succeeds.
- Admin shows provider/developer row.
- TV includes the provider metric.
- Browser screenshot proves affected Admin and TV surfaces.
- TV large-display viewport screenshot proves TV readability when the provider affects TV slides.

Required providers:

- Cursor.
- Codex.
- Claude.
- JetBrains AI Assistant.

Required platforms:

- macOS.
- Windows x64.

## Consequences

MVP proof covers real user setup.

Automated tests still matter, but they are not enough for provider/platform readiness.

## Alternatives Considered

- Automated tests only: misses local credential and path issues.
- Screenshot/video proof for every provider: useful later, but too heavy for v1.
