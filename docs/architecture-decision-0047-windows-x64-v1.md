# Decision 0047: Windows v1 supports x64 first

## Status

Accepted

## Context

Windows v1 must support Codex, Cursor, Claude, and JetBrains AI Assistant.

Windows builds will bundle SQLite for provider database reads. Bundled native binaries are architecture-specific, so supporting multiple Windows CPU architectures increases packaging and testing work.

v1 should prove the Windows desktop, provider collection, and team sync path with the most common Windows target first.

## Decision

Windows v1 supports x64 first.

Windows ARM64 support is deferred.

## Consequences

The Windows package can bundle one `sqlite3.exe` target for v1.

Testing can focus on the available Windows x64 machine.

Windows ARM64 users are not a v1 guarantee.

Future Windows ARM64 support needs its own packaged SQLite binary and release verification.

## Alternatives Considered

- x64 and ARM64 in v1: more complete, but more packaging and testing work before Windows support is proven.
