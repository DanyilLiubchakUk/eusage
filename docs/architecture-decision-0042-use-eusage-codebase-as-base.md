# Decision 0042: Use eUsage codebase as the product base

## Status

Accepted

## Context

eUsage needs a cross-platform desktop app, team sync, a self-deployed web dashboard, and Windows tray support.

CodexBar was evaluated because it has mature provider coverage, provider key setup, and a polished macOS menu bar experience. Its main app is Swift/AppKit and macOS-focused, with Windows handled by a separate related project.

eUsage is already a Tauri, React, and Rust desktop app with provider plugins, tray behavior, updater configuration, and a code structure that can support macOS and Windows from one product base.

## Decision

Use this eUsage/openusage codebase as the base for the product.

Do not switch the product base to CodexBar.

CodexBar can be used only as general product reference while building provider setup and dashboard ideas. It should not become a dependency or implementation foundation for v1.

## Consequences

Windows support stays realistic because Tauri can ship one desktop app across macOS and Windows.

The existing eUsage provider plugin model, React UI, and Rust host can be extended for team connection, team sync, and tray popup behavior.

The product must still fix current macOS-only panel wiring before Windows builds are reliable.

CodexBar's broader provider coverage is not inherited automatically. New provider support must be added to eUsage plugins over time.

## Alternatives Considered

- CodexBar as base: stronger macOS provider/key experience today, but porting the Swift/AppKit UI and macOS-specific behavior to Windows would be a large rewrite.
- Separate macOS and Windows apps: possible later, but too much v1 maintenance for a small-team tool.
