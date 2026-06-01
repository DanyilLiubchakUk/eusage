# Decision 0049: Windows first run explains tray overflow

## Status

Accepted

## Context

Windows apps can create a tray icon, but Windows may place new tray icons in the taskbar corner overflow. Applications cannot reliably force their icon to be pinned as always visible.

eUsage should feel easy to find for Windows developers after installation.

## Decision

On first run, Windows should show a short guidance screen or notice explaining that eUsage lives in the taskbar corner or overflow area.

The guidance should tell users they can pin eUsage if they want it always visible.

The app should not attempt hacks or registry changes to force tray icon visibility.

## Consequences

Windows users know where the app is after install.

The product avoids fragile or invasive OS behavior changes.

Support docs can reuse the same wording when users cannot find the tray icon.

## Alternatives Considered

- Ignore tray overflow: simpler, but likely creates support confusion.
- Force tray visibility through hacks: fragile, invasive, and not appropriate for v1.
