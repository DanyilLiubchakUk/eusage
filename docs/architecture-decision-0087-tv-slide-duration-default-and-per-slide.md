# Decision 0087: TV slides default to 10 seconds with per-slide duration

## Status

Accepted

## Context

TV slides should rotate automatically, but different slides need different reading time.

Cursor Budget may need longer than Sync Health. Team Overview may need less than a dense leaderboard.

Admins should control this without code changes.

## Decision

Default TV slide duration is 10 seconds.

Valid per-slide duration is 5-300 seconds.

Empty or invalid duration values show an inline error and do not save.

Admin TV settings manage:

- Slide order.
- Per-slide duration.
- Enabled/disabled slides.

## Consequences

TV starts with a quick default rotation.

Admins can slow down complex slides.

Slides cannot be set below 5 seconds, so TV mode does not become unreadable on large displays.

Slide config needs duration per slide, not one global number only.

## Alternatives Considered

- 20 seconds global default: more readable, but user prefers faster default.
- One global duration only: simpler, but weaker slide UX.
