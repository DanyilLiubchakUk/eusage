# Decision 0116: Implementation order is web, Windows shell, then cross-OS functionality

## Status

Accepted

## Context

eUsage needs a web/backend target, a Windows desktop shell, and new desktop team-sync functionality on both macOS and Windows.

Building desktop sync before the web/API contract would create fake endpoints or throwaway code.
Building provider functionality before Windows shell is risky because Windows behavior cannot be tested inside the real app.

## Decision

Implementation order:

1. Web/backend first.
   - `web/`.
   - TanStack Start.
   - Convex schema.
   - Ingest API.
   - Very plain Admin.
   - Very plain TV.
2. Windows shell/tray second.
   - Compile/run on Windows.
   - Tray popup from taskbar corner/overflow.
3. Cross-OS desktop functionality third.
   - Team connection.
   - New UI/UX.
   - Provider reads.
   - Usage uploads.
   - macOS and Windows behavior.

Polished UI work comes after the data loop, provider logic, calculations, and cross-OS behavior work.

## Consequences

Desktop sync gets a real API target.

Windows shell risk is handled before provider-specific Windows reads.

Cross-OS functionality is added after both web/backend and Windows shell exist.

Early Admin/TV screens are intentionally plain so implementation focuses on correctness first.

## Alternatives Considered

- Desktop functionality first: faster UI progress, but backend contract missing.
- Windows shell first: proves tray behavior, but no sync API target.
- Full provider matrix before web: hides product loop risk.
