# Decision 0048: Windows v1 uses unsigned installer

## Status

Accepted

## Context

Windows developers need an easy way to install the desktop app for free.

Code signing improves trust and reduces Windows SmartScreen warnings, but it requires a certificate, setup, renewal, and release-process work. v1 should prove the product before adding paid signing infrastructure.

Tauri can produce Windows installers, including NSIS-style installers, without requiring a paid certificate.

## Decision

Windows v1 ships an unsigned x64 installer.

The expected first package is an installer `.exe`, not only a portable executable.

Code signing is deferred until after the Windows v1 path is proven.

## Consequences

Windows teammates can install eUsage for free.

Some users may see Windows SmartScreen or unsigned-publisher warnings.

Documentation must explain the warning honestly and tell teams how to verify the release source.

Future signed releases can reuse the installer flow with certificate configuration added later.

## Alternatives Considered

- Wait for code signing: better install trust, but delays v1 and adds cost.
- Portable executable only: fastest, but worse install, startup, and tray experience.
