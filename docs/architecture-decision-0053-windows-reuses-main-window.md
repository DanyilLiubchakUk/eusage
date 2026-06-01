# Decision 0053: Windows tray popup reuses main window

## Status

Accepted

## Context

Windows needs a tray popup window near the taskbar tray area.

The current Tauri config already defines a hidden undecorated `main` window sized like a tray popup. macOS wraps that window in an NSPanel-style panel. Windows does not need NSPanel and can use a normal undecorated Tauri window.

Creating a second Windows-only popup window would add routing and state duplication before v1 needs it.

## Decision

On Windows, reuse the existing hidden `main` Tauri window as the tray popup.

Tray click should show, hide, and position the `main` window near the taskbar tray area.

macOS keeps the NSPanel behavior.

## Consequences

The current window config stays useful on both platforms.

Windows implementation can focus on platform-specific show/hide/position behavior instead of a new window model.

Future work can split out a dedicated popup window if the main window grows beyond tray-popup needs.

## Alternatives Considered

- Separate `tray-popup` window: cleaner separation, but more code and state for v1.
- Normal centered app window: simpler, but does not match the desired Windows tray-corner UX.
