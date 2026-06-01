# [AFK] Batch desktop probe uploads through team sync

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/13

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

49, 50, 62, 63, 64

## What to build

Wire successful desktop provider probe results into team sync with redaction, source facts, 30-second debounce, memory-only retry, partial acceptance handling, invalid-token disconnect, and bounded quit flush.

## Acceptance criteria

- [ ] Successful provider results enqueue team-sync upload data without blocking local provider UI updates.
- [ ] Repeated updates for the same provider during the debounce window replace the older pending provider result.
- [ ] After no changes for the configured 30-second window, the full batch posts to the team usage endpoint.
- [ ] Retryable upload failures stay in memory and retry on the next refresh while the app remains open.
- [ ] Invalid, revoked, or inactive token responses delete the stored raw token and stop team sync.
- [ ] Tests cover debounce replacement, retry, partial acceptance response handling, invalid-token disconnect, redaction, and quit flush timeout.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/9
- https://github.com/DanyilLiubchakUk/eusage/issues/12
