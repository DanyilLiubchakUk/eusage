# Decision 0010: Team sync uploads debounced batches

## Status

Accepted

## Context

Team sync should run after successful provider probe results. Probe results arrive per provider, and several providers may finish close together during one automatic or manual refresh.

Uploading every provider result immediately is simple, but it can create unnecessary requests and fragmented dashboard updates.

Waiting for a whole probe batch to complete can delay useful updates and can be blocked by slow or failed providers.

## Decision

Successful provider results are collected into a pending team-sync batch.

When a successful provider result is added or updated in the pending batch, the desktop app resets a debounce timer.

If no provider result changes for the debounce window, the desktop app sends the whole pending batch to the team's Vercel API.

The v1 debounce window is 5 seconds and must be represented by a named variable so it can be changed easily.

If provider results keep changing, the desktop app still sends the pending batch after 1 minute.

If a team upload fails for a retryable reason, such as network failure or temporary server failure, the desktop app keeps the failed batch in memory and retries it on the next refresh while the app stays open.

If a later provider result updates the same provider in the pending batch before retry, the newer result replaces the older result.

When the backend accepts part of a batch, accepted providers are done. Rejected provider errors are logged in Convex with expiry. Desktop UI does not show provider sync rejection in v1.

## Consequences

The dashboard receives grouped updates without waiting for every provider in a probe batch.

Manual refreshes and automatic refreshes use the same upload batching behavior.

The implementation needs to handle repeated updates for the same provider by replacing that provider's pending result before upload.

If upload fails, the app should surface team sync status without breaking local usage display.

v1 does not need a persistent failed-upload queue.

## Alternatives Considered

- Immediate per-provider upload: freshest, but more requests and fragmented updates.
- Upload only after full probe batch completes: fewer requests, but blocked by slow or failed providers.
- Persist failed uploads to disk: more reliable across restart, but more state, cleanup, and corruption handling.
