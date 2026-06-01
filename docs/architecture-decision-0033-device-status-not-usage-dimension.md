# Decision 0033: Device is status metadata, not a usage dimension

## Status

Accepted

## Context

One developer can use the same token on multiple devices. The backend stores device identity to avoid snapshot conflicts and support sync health.

The product goal is to compare usage by developer, not by machine.

## Decision

Device is operational metadata in v1, not a dashboard usage dimension.

Admin dashboard usage views show usage per developer, provider, and time range.

Admin may see a small device status list under a developer, including device name, OS, app version, last seen time, and sync health.

Admin does not see per-device usage charts in v1.

## Consequences

Dashboard stays focused on people and providers.

Device metadata still helps debug multi-device sync issues.

Backend can store device-level snapshots while dashboard totals merge them to developer-level views.

## Alternatives Considered

- No device UI at all: cleaner, but harder to debug stale or duplicate device records.
- Per-device usage charts: more detail, but distracts from developer-level team usage.
