# [AFK] Sync JetBrains AI Assistant source facts end to end

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/17

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

35, 37, 41, 62, 68, 70

## What to build

Add JetBrains AI Assistant as the fourth required provider slice. Quota cache data from JetBrains IDEs becomes normalized source facts, syncs to Convex, and appears in Admin and TV.

## Acceptance criteria

- [ ] JetBrains extractor emits quota used, limit, remaining, reset timestamp, period duration when present, summary version, extractor version, metric samples, and redacted payload shape.
- [ ] macOS and Windows JetBrains config directory candidates are implemented and documented.
- [ ] When multiple IDE quota files exist, the valid entry with the latest quota window is selected.
- [ ] Admin shows JetBrains quota status and provider/developer rows.
- [ ] TV includes JetBrains in provider breakdown and quota pressure where reported.
- [ ] Tests cover quota XML parsing, invalid file behavior, multiple IDE selection, redaction, and Windows path candidates where practical.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/16
