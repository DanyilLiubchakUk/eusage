# Decision 0022: Admin dashboard and TV mode use separate configs

## Status

Accepted

## Context

The admin dashboard and TV/display mode use the same usage data, but they serve different jobs.

Admins need an interactive workspace with filters, tables, detailed comparisons, and management controls. TV mode needs a curated fullscreen slide rotation that is readable from a distance and safe to leave visible on a wall display.

Using one shared config would make it easy to accidentally expose admin-focused detail on the TV, or make the admin dashboard too limited by TV readability constraints.

## Decision

Admin dashboard config and TV/display config are separate.

Admin dashboard config controls the interactive admin view.

TV/display config controls read-only fullscreen slides, including visible developers, visible providers, slide order, per-slide duration, theme, playback state, and display-focused date range.

## Consequences

Admins can keep detailed views for themselves while curating what appears on TV.

The product needs two config surfaces or a clear settings section with separate "Dashboard" and "TV Display" tabs.

TV mode can optimize for large text, fewer charts per slide, readable dwell time, and no editing controls.

## Alternatives Considered

- One shared config: simpler, but less safe and less flexible.
