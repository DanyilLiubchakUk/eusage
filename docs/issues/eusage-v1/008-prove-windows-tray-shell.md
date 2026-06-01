# [HITL] Prove Windows tray shell

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/11

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

HITL

## User stories covered

52, 53, 54, 68, 69, 70

## What to build

Make the Tauri desktop shell run cleanly on Windows x64 with a tray icon, tray popup near the taskbar corner or overflow, first-run tray guidance, and no provider-specific Windows collection yet.

## Acceptance criteria

- [ ] The desktop app compiles and runs as a native Windows x64 app outside WSL.
- [ ] The tray icon appears in the taskbar corner or overflow and opens a tray-style popup.
- [ ] The popup can close, reopen, and quit cleanly from the tray flow.
- [ ] First-run Windows guidance explains tray overflow and manual pinning without OS hacks.
- [ ] Local development docs describe the Windows run/test order.
- [ ] Manual Windows verification notes are added to the issue or docs after testing on the real Windows machine.

## Local implementation notes

- macOS keeps the NSPanel tray popup.
- Windows/non-macOS uses the hidden undecorated `main` Tauri window as the tray popup.
- Left-click tray toggles the popup.
- Right-click tray menu still owns Settings, About, Debug Level, and Quit.
- Real Windows x64 run/install verification is still HITL.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/4
