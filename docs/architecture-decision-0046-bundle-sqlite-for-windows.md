# Decision 0046: Bundle SQLite for Windows provider reads

## Status

Accepted

## Context

Several provider plugins read local SQLite databases. The current host SQLite API shells out to the `sqlite3` command.

Windows users should not need to install SQLite manually before eUsage can read provider usage data.

Replacing the host implementation with an embedded Rust SQLite library would avoid bundling an executable, but it is more implementation work before the Windows v1 path is proven.

## Decision

For v1, bundle a Windows `sqlite3.exe` with the desktop app and make the host SQLite API use the bundled binary on Windows.
On Windows, eUsage should prefer its bundled SQLite binary first and fall back to a user-installed `sqlite3` on `PATH` only if the bundled binary is missing or unusable.
The Windows x64 `sqlite3.exe` should be vendored in the repository under `src-tauri/resources/bin/windows-x64/` so release builds are deterministic and do not depend on network access or machine-local SQLite installs.
Only `sqlite3.exe` is bundled from the SQLite tools archive; `sqldiff.exe`, `sqlite3_analyzer.exe`, and `sqlite3_rsync.exe` are not needed for eUsage provider reads.
The plugin runtime should pass Tauri's resource directory into the host API so `ctx.host.sqlite` can locate the app-owned SQLite binary without depending on the user's `PATH`.
If neither the bundled SQLite binary nor a fallback `sqlite3` on `PATH` can run, provider cards should show an eUsage SQLite helper problem, not a provider sign-in problem.

Plugins continue using the existing `ctx.host.sqlite.query(...)` and `ctx.host.sqlite.exec(...)` API.

macOS can keep using the current behavior unless packaging later requires the same bundled-binary approach there.

## Consequences

Windows users do not need to install SQLite manually.

The plugin API stays unchanged.

Users who already have SQLite installed are not affected because provider reads use the app-owned binary first.

SQLite helper failures point to updating or reinstalling eUsage instead of asking the user to sign out and sign back into the provider.

The release process must package the correct SQLite binary for each supported Windows architecture.

The app owns responsibility for updating or replacing the bundled SQLite binary if needed.

The repository carries one native binary for Windows x64.

## Alternatives Considered

- Embedded Rust SQLite library: cleaner long-term, but more code before v1.
- User-installed SQLite: unacceptable v1 setup experience.
