# Decision 0041: Windows uses a tray popup window

## Status

Accepted

## Context

macOS uses a menu bar icon and NSPanel-style popup. Windows users expect the app to live in the taskbar tray area and overflow icons.

The current macOS panel implementation uses macOS-only APIs and must not be reused directly for Windows.

## Decision

On Windows, clicking the eUsage tray icon opens a small undecorated floating Tauri window near the taskbar tray area.

The window should behave like a tray popup, not a normal centered app window.

## Consequences

Windows gets a native-feeling tray experience similar to the macOS menu bar panel.

Implementation needs platform-specific panel/window code:

- macOS: NSPanel popup.
- Windows: normal undecorated Tauri window popup.

Windows positioning must account for taskbar location, display scale, and multi-monitor setups.

## Alternatives Considered

- Normal centered app window: simpler, but not the requested tray-corner UX.
- Open hosted dashboard/browser: wrong surface for quick desktop usage status.
