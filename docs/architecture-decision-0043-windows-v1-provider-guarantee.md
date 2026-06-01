# Decision 0043: Windows v1 guarantees four providers

## Status

Accepted

## Context

eUsage must work for Windows developers in v1.

The desktop shell, tray popup, and team sync can be made cross-platform with Tauri. Usage collection is provider-specific because each provider stores local auth, app data, and usage history differently across operating systems.

Trying to make every provider fully cross-platform before Windows release would delay the product and hide the real risk. Windows support should instead guarantee the providers that matter most for the first team workflow.

## Decision

Windows v1 must support these providers:

- Codex.
- Cursor.
- Claude.
- JetBrains AI Assistant.

Other providers may work on Windows when their data source is already cross-platform, but they are not part of the Windows v1 guarantee.

Provider support must be visible in the desktop UI so Windows users can see which providers are supported, unsupported, or not configured.

## Consequences

Windows work can focus on the providers needed for v1 instead of every plugin.

The desktop app still needs platform-aware provider data paths and credential handling.

Provider support can expand after v1 without changing the core Windows tray/team-sync path.

The product must not imply full provider parity between macOS and Windows until each provider has been tested.

## Alternatives Considered

- Full provider parity before Windows release: more complete, but too slow and risky for v1.
- App shell only on Windows with no provider guarantee: easy to ship, but not useful enough for Windows developers.
