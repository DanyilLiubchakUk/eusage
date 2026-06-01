# Decision 0046: Bundle SQLite for Windows provider reads

## Status

Accepted

## Context

Several provider plugins read local SQLite databases. The current host SQLite API shells out to the `sqlite3` command.

Windows users should not need to install SQLite manually before eUsage can read provider usage data.

Replacing the host implementation with an embedded Rust SQLite library would avoid bundling an executable, but it is more implementation work before the Windows v1 path is proven.

## Decision

For v1, bundle a Windows `sqlite3.exe` with the desktop app and make the host SQLite API use the bundled binary on Windows.

Plugins continue using the existing `ctx.host.sqlite.query(...)` and `ctx.host.sqlite.exec(...)` API.

macOS can keep using the current behavior unless packaging later requires the same bundled-binary approach there.

## Consequences

Windows users do not need to install SQLite manually.

The plugin API stays unchanged.

The release process must package the correct SQLite binary for each supported Windows architecture.

The app owns responsibility for updating or replacing the bundled SQLite binary if needed.

## Alternatives Considered

- Embedded Rust SQLite library: cleaner long-term, but more code before v1.
- User-installed SQLite: unacceptable v1 setup experience.
