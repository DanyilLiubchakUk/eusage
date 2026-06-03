# [AFK] Detect and override desktop device name

Published issue: https://github.com/DanyilLiubchakUk/eusage/issues/22

## Parent

https://github.com/DanyilLiubchakUk/eusage/issues/3

## Type

AFK

## User stories covered

55, 56, 57

## What to build

Make device labels useful without turning devices into a usage dimension. The desktop app should detect a friendly device name, let the developer override it from the Team page, send that label on device check-in, and keep Admin/TV from showing `Unknown device`.

Device identity stays the random local device ID. Device name is display metadata only.

## Acceptance criteria

- [ ] Desktop detects a friendly device name on macOS and Windows using a Tauri/Rust-safe host-name path.
- [ ] Team page shows the current device name and lets the developer edit, save, and reset to detected name.
- [ ] The saved override is stored in local non-secret team settings and is sent on every device check-in.
- [ ] When no override exists, device check-in sends the detected host name.
- [ ] When no detected host name exists, device check-in sends an OS fallback such as `macOS desktop` or `Windows desktop`.
- [ ] Backend device validation no longer stores `Unknown device` as the default fallback.
- [ ] Admin developer device lists show the friendly device name, OS, app version, status, and last seen time.
- [ ] TV and Overview sync-health surfaces avoid loud device-name clutter; if a device label is shown, it uses the friendly name or OS fallback, never `Unknown device`.
- [ ] Device name changes update display metadata only and do not create a new device identity.
- [ ] Tests cover detected-name fallback, saved override, reset to detected name, check-in payload, backend fallback, and no `Unknown device` UI label.

## Blocked by

- https://github.com/DanyilLiubchakUk/eusage/issues/8
- https://github.com/DanyilLiubchakUk/eusage/issues/12
