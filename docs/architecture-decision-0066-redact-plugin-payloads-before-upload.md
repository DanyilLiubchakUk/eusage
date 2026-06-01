# Decision 0066: Redact plugin payloads before team upload

## Status

Accepted

## Context

eUsage stores full successful plugin payloads so future dashboards can use all collected data.

Some providers use local tokens, cookies, API keys, credentials, or authorization headers. Those secrets must not be stored in Convex.

The existing plugin host redacts logs and URLs, but team upload needs its own payload redaction rule.

## Decision

Before team upload:

- Plugins should avoid returning raw secrets.
- Desktop runs a generic JSON scrubber over the plugin payload.
- The scrubber redacts sensitive field names before upload.

Sensitive field names include:

- `token`
- `accessToken`
- `refreshToken`
- `secret`
- `apiKey`
- `key`
- `cookie`
- `authorization`
- `password`
- `credential`

`key` should match obvious secret-key fields such as `apiKey`, `secretKey`, `access_key`, or exact `key`, not every object map key.

The scrubber replaces secret values with a redacted marker or short fingerprint, not the raw value.

## Consequences

Dashboard data remains flexible without storing provider credentials.

Plugin mistakes are less likely to leak secrets to Convex.

Some harmless fields may be redacted if they look secret-like. That is acceptable for v1.

Tests should cover representative payload redaction before upload.

## Alternatives Considered

- Trust plugins only: less code, but one plugin mistake can leak secrets.
- Store literally everything: unacceptable because provider credentials could be stored.
