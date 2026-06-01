# [AFK] Sync Claude source facts end to end

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/16

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

35, 37, 41, 62, 68, 70

## What to build

Add Claude Code as the third real provider slice. Claude usage and extra usage credits become normalized source facts, sync to Convex, and appear consistently in Admin and TV.

## Acceptance criteria

- [ ] Claude extractor emits five-hour, seven-day, optional model-specific windows, extra usage, monthly limit, summary version, extractor version, metric samples, and redacted payload shape.
- [ ] macOS and Windows credential/file lookup behavior is documented and implemented for supported v1 modes.
- [ ] Desktop uploads Claude data alongside Cursor and Codex without one bad provider blocking the others.
- [ ] Admin shows Claude quota/cost-related metrics with coverage when values are missing.
- [ ] TV includes Claude in provider breakdown and quota pressure where reported.
- [ ] Tests cover Claude extraction, redaction, missing optional windows, extra usage values, and Windows lookup behavior where practical.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/15
