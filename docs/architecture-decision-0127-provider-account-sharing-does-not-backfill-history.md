# Decision 0127: Provider account sharing does not backfill history by default

## Status

Accepted

## Context

Provider account sharing lets a developer choose which local provider accounts may upload usage to the team deployment.

Some provider data is current account state, such as quota, remaining credits, or current billing-cycle usage. Some provider data is local consumed usage history, such as daily token and cost rows already present on the machine.

Uploading old local history when a developer first enables sharing can surprise the developer. Old local history may predate consent, may include personal usage, or may not be provably tied to the selected provider account.

## Decision

Turning on sharing for a provider account uploads current data only.

eUsage will not silently backfill older local history when an account is first shared.

A future feature may add explicit history sharing for one provider account. That flow should ask the developer to choose a history range with radio-button choices such as last 7 days, last 30 days, or custom range, then confirm before upload.

## Consequences

Account sharing has a safer privacy default.

First-share uploads may show less historical data than older provider sync behavior.

Future history sharing needs account-scoped history proof, date-range controls, preview or clear confirmation, and upload dedupe.

## Alternatives Considered

- Backfill all available local history on first share: stronger dashboards, but surprising and risky when history is not clearly account-scoped.
- Backfill a fixed recent window: simpler than a picker, but still uploads data the developer did not explicitly choose.
- Never support history sharing: safest and simplest, but weakens all-time account analysis when a developer wants to share past work usage.
