# [AFK] Sync Codex source facts end to end

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/15

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

35, 37, 41, 62, 68, 70

## What to build

Add Codex as the second real provider slice. Local Codex usage becomes normalized source facts, uploads through team sync, and appears in Admin/TV metric tables and provider breakdowns.

## Acceptance criteria

- [ ] Codex extractor emits rate-limit windows, reset times, plan type, optional credits, summary version, extractor version, metric samples, and redacted payload shape.
- [ ] macOS and Windows credential/path lookup behavior is documented and implemented for the supported v1 modes.
- [ ] Desktop uploads Codex data without breaking Cursor uploads in the same batch.
- [ ] Admin shows Codex data in provider status, available metrics, and developer views.
- [ ] TV includes Codex in team overview/provider breakdown with clear no-data behavior when unavailable.
- [ ] Tests cover Codex extraction, redaction, missing optional credits, multi-window quota values, and Windows lookup behavior where practical.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/14
