# ADR 0004: Platform-native tray panel

## Status

Accepted

## Context

eUsage is a tray-first desktop app. On macOS, users expect it in the top menu bar. On Windows, users expect it in the taskbar corner icons area, including the overflow area, with the app UI opening when they click the icon.

The current macOS panel uses macOS-specific panel APIs. Windows cannot rely on that implementation.

## Decision

Keep one tray-first product behavior, with platform-native implementation:

- macOS uses the menu bar icon and macOS panel behavior.
- Windows uses the taskbar corner tray icon and a normal popup window shown near the tray area.

## Consequences

This preserves the same user mental model across platforms: click the tray icon to open eUsage.

The desktop code needs platform-specific panel/window handling. Shared app UI should remain the same, but tray positioning and hide/show behavior must differ by operating system.

## Alternatives Considered

- Normal dock/taskbar app window: simpler technically, but not the product behavior wanted for eUsage.
- macOS-only panel behavior everywhere: not viable on Windows.
