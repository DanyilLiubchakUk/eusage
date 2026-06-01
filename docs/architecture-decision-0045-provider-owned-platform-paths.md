# Decision 0045: Provider plugins own platform path candidates

## Status

Accepted

## Context

Windows v1 must support Codex, Cursor, Claude, and JetBrains AI Assistant.

Provider usage data is stored in provider-specific locations. Those locations differ by operating system. For example, macOS apps commonly store state under `~/Library/Application Support`, while Windows apps commonly store state under the user's AppData folders.

The product needs provider-specific path handling without creating a large central registry before v1.

## Decision

Each provider plugin owns its platform-specific path candidates.

Plugins should use the desktop platform value from the host context and try known paths for that provider on that platform.

The host should provide generic file, credentials, and SQLite capabilities. It should not own provider-specific path maps in v1.

## Consequences

Provider logic stays close to the provider plugin.

Adding Windows support for a provider usually means adding Windows path candidates inside that provider's plugin.

The host remains simpler and avoids a central list of provider internals.

Some path logic may be duplicated across providers, but this is acceptable for v1.

## Alternatives Considered

- Host-owned named provider paths: cleaner long-term, but creates central provider knowledge too early.
- Manual user-selected file paths: flexible, but poor v1 setup experience.
