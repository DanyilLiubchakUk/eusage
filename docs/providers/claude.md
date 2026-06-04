# Claude Code

> Reverse-engineered, undocumented API. May change without notice.

## Overview

- **Protocol:** REST (plain JSON)
- **Base URL:** `https://api.anthropic.com`
- **Auth provider:** `platform.claude.com` (OAuth 2.0)
- **Client ID:** `9d1c250a-e61b-44d9-88ed-5944d1962f5e`
- **Beta header required:** `anthropic-beta: oauth-2025-04-20`
- **Utilization:** integer percentage (0-100)
- **Credits:** cents (divide by 100 for dollars)
- **Timestamps:** ISO 8601 (response), unix milliseconds (credentials file)

## Endpoints

### GET /api/oauth/usage

Returns rate limit windows and optional extra credits.

#### Headers

| Header | Required | Value |
|---|---|---|
| Authorization | yes | `Bearer <access_token>` |
| Accept | yes | `application/json` |
| Content-Type | yes | `application/json` |
| anthropic-beta | yes | `oauth-2025-04-20` |

#### Response

```jsonc
{
  "five_hour": {
    "utilization": 25,              // % used in 5h rolling window
    "resets_at": "2026-01-28T15:00:00Z"
  },
  "seven_day": {
    "utilization": 40,              // % used in 7-day window
    "resets_at": "2026-02-01T00:00:00Z"
  },
  "seven_day_opus": {               // separate weekly Opus limit (optional, plan-dependent)
    "utilization": 0,
    "resets_at": "2026-02-01T00:00:00Z"
  },
  "seven_day_omelette": {           // separate weekly Claude Design limit (optional, plan-dependent)
    "utilization": 0,
    "resets_at": "2026-02-01T00:00:00Z"
  },
  "extra_usage": {                  // on-demand overage credits (optional)
    "is_enabled": true,
    "used_credits": 500,            // cents spent
    "monthly_limit": 10000,         // cents cap (0 = unlimited)
    "currency": "USD"
  }
}
```

All windows are enforced simultaneously — hitting any limit throttles the user.

## Authentication

### Credential Storage Locations

Claude Code stores subscription OAuth credentials differently by OS.

eUsage Claude plugin auth lookup order on macOS:

1. macOS Keychain service for the current user.
2. Legacy macOS Keychain service lookup.
3. `CLAUDE_CONFIG_DIR/.credentials.json` when `CLAUDE_CONFIG_DIR` is set, otherwise `~/.claude/.credentials.json`.

The default Keychain service name is:

```text
Claude Code-credentials
```

When `CLAUDE_CONFIG_DIR` is set, Claude Code may use a config-specific service name instead. eUsage checks this hashed name before the default service:

```text
Claude Code-credentials-<sha256(CLAUDE_CONFIG_DIR).slice(0, 8)>
```

eUsage Claude plugin auth lookup order on Windows v1:

1. `CLAUDE_CONFIG_DIR/.credentials.json` when `CLAUDE_CONFIG_DIR` is set.
2. `~/.claude/.credentials.json`, which resolves to `%USERPROFILE%\.claude\.credentials.json`.

Windows v1 does not use macOS Keychain lookup. Current Claude Code docs state Windows stores credentials in the user profile `.claude` credentials file.

Credential values use this JSON structure:

```jsonc
{
  "claudeAiOauth": {
    "accessToken": "<jwt>",          // OAuth access token (Bearer)
    "refreshToken": "<token>",
    "expiresAt": 1738300000000,      // unix ms
    "scopes": ["..."],
    "subscriptionType": "pro",
    "rateLimitTier": "..."
  }
}
```

On macOS, `~/.claude/.credentials.json` can be left behind by older Claude Code versions, so it is treated as a fallback when Keychain does not contain usable credentials.

## Source facts uploaded to team sync

Claude source facts are extracted on desktop before upload:

- `summaryVersion`: `1.0.0`
- `extractorVersion.claude`: `1.0.0`
- Daily period key: `claude:YYYY-MM-DD`
- Provider fields: plan name, subscription type, rate-limit tier, five-hour session percent/reset/window, seven-day weekly percent/reset/window, optional model windows, extra usage spent, monthly limit, currency, today tokens, and today estimated cost.
- Top-level summary fields: session quota percent, optional extra usage budget fields, optional extra usage credits used, today's token total, and today's estimated cost.
- Metric samples: session percent, weekly percent, optional model-window percents, extra usage spent/monthly limit, daily total/input/output/cache creation/cache read tokens, and daily estimated cost.
- Daily token and estimated-cost samples include Reporting Day bucket metadata with UTC start/end boundaries.
- Raw payload shape: usage body, auth metadata, and ccusage daily rows, with secret-shaped fields replaced by `[REDACTED]`.

Dashboard merge scope:

- Rate-limit percentages, model windows, and extra-usage budget values come from the Claude cloud account and should not be summed across devices.
- Daily token and estimated-cost samples come from local ccusage history on the reporting device and should be summed across devices for the same developer.

### Token Refresh

Access tokens are short-lived JWTs. Refreshed proactively 5 minutes before expiration, or reactively on 401/403.

```
POST https://platform.claude.com/v1/oauth/token
Content-Type: application/json
```

```json
{
  "grant_type": "refresh_token",
  "refresh_token": "<refresh_token>",
  "client_id": "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
  "scope": "user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload"
}
```

```jsonc
{
  "access_token": "<new_jwt>",
  "refresh_token": "<new_refresh_token>",  // may be same as previous
  "expires_in": 3600                       // seconds
}
```
