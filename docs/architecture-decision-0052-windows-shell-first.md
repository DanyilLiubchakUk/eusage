# Decision 0052: Build Windows shell before Windows provider support

## Status

Accepted

## Context

Windows v1 must work as a real desktop app, not only as provider parsing logic.

The current desktop code has macOS-specific panel wiring. Provider support also needs Windows paths and credential handling, but provider work is hard to verify until the Windows app can compile, install, run, and open from the tray.

The web/backend target should exist first so desktop team sync has a real API contract.

## Decision

Overall implementation order:

1. Build web/backend first.
2. Make the Tauri desktop shell compile and run on Windows.
3. Add the Windows tray popup window.
4. Verify Windows install/dev run behavior.
5. Add team connection and team sync status UI on top of the working shell.
6. Add and verify Windows support for Codex, Cursor, Claude, and JetBrains AI Assistant.

## Consequences

The first Windows milestone proves the app can live in the taskbar tray.

Provider fixes happen after there is a working Windows app to test inside.

The web/backend contract comes before Windows shell work.
Dashboard polish should not block the first Windows desktop proof.

## Alternatives Considered

- Provider support before app shell: harder to test because the app may not run on Windows yet.
- Web dashboard first: useful later, but does not prove Windows desktop support.
