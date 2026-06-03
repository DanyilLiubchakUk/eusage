# Decision 0027: TV provider visibility is separate from global visibility

## Status

Accepted

## Context

Global provider disable hides a provider from all views while still collecting and storing data.

Admin dashboard and TV/display mode use separate configs. TV may need a more curated provider set than the admin dashboard.

## Decision

TV/display mode can hide providers separately from global provider visibility.

Global provider visibility is the top-level filter. If a provider is globally hidden, it is hidden everywhere.

If a provider is globally visible, TV/display config can still hide it from TV mode only.

New globally visible providers are TV-visible by default.

## Consequences

Admins can keep detailed providers visible in the admin dashboard while curating TV mode.

The visibility logic has two layers:

1. Global provider visibility.
2. View-specific visibility such as TV provider visibility.

Data collection and storage continue regardless of visibility settings.

## Alternatives Considered

- Global visibility only: simpler, but weaker TV curation.
