# Decision 0128: Shared provider account fingerprints

## Status

Accepted

## Context

Provider account sharing needs a stable way to distinguish multiple accounts for the same provider without uploading raw account identifiers.

Provider identity quality differs. Codex can expose a provider account id. Cursor can expose an email or token subject. Claude may only expose a provider home or keychain source today. JetBrains AI Assistant currently exposes a local quota file source.

If every provider builds account fingerprints differently, account labels, sharing consent, and upload identity can drift or leak provider-specific private values.

## Decision

eUsage uses one shared helper to build provider account fingerprints for all providers.

The helper accepts provider id, identity kind, identity value, and optional team fingerprint.

Local account fingerprints are stable on the desktop app and use a local salt. Team account fingerprints are stable only within one team and include the team fingerprint.

Uploads use the team account fingerprint in provider account metadata and provider data identity.

Raw account identifiers, emails, local paths, credential source names, and labels are not part of team payloads unless the developer explicitly shares a label for a shared provider account.

## Consequences

All providers use one privacy model for account identity.

The same provider account shared with different teams has different backend fingerprints.

Provider plugins still need to report the best identity source they can find.

Tests must cover fingerprint stability, team scoping, and absence of raw identity values in upload payloads.

## Alternatives Considered

- Provider-specific fingerprint logic: faster per plugin, but easy to make inconsistent or leaky.
- Plain hash of provider account id: simple, but linkable across teams when the same account is shared.
- Upload raw account id or email: easier dashboard debugging, but too much private data for this product.
