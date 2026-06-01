# Decision 0044: Use cross-platform provider credentials API

## Status

Accepted

## Context

Windows v1 must support Codex, Cursor, Claude, and JetBrains AI Assistant.

Some providers store local credentials outside normal files. The current plugin host exposes a macOS-focused keychain API. That naming and behavior does not fit Windows, where provider credentials may need Windows credential storage or other platform-specific access.

Keeping macOS-only credential access would make Windows support incomplete for important providers.

## Decision

Add a cross-platform provider credentials API for plugins.

The canonical plugin host API should be named `credentials`.

Platform backing:

- macOS: Keychain.
- Windows: Windows Credential Manager or equivalent Windows credential storage.

The existing `keychain` API can remain as a compatibility alias while plugins migrate.

Codex, Cursor, and Claude should use the cross-platform credentials API when they need local credential storage. JetBrains AI Assistant can continue using local files unless credential access becomes necessary.

## Consequences

Provider plugin code can express intent without hardcoding macOS naming.

Windows support can use the correct OS credential store instead of pretending Keychain exists.

The plugin host must redact credential values in logs and tests must cover allowed credential access.

Existing plugins do not need to migrate all at once because the old keychain API can stay as an alias.

## Alternatives Considered

- Keep the API named `keychain` on all platforms: fastest, but confusing and macOS-specific.
- Avoid Windows credential support in v1: simpler, but too risky for Cursor and Claude.
