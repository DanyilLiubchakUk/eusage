# Decision 0086: TV mode starts with five slides and playback controls

## Status

Accepted

## Context

TV mode should be useful as a wall display without requiring an admin to design a slide deck from scratch.

Slides need enough time on screen to be read from a distance.

Admins still need basic controls while setting up or presenting.

## Decision

Default TV slides:

- `Team Overview`
- `Developer Leaderboard`
- `Provider Breakdown`
- `Cursor Pool`
- `Sync Health`

`Team Overview` leads with team usage/spend in the selected range and percent change vs the previous comparable range.

`Team Overview` also shows supporting metrics:

- Cursor pool.
- Top provider.
- Active developers.
- Sync health.

TV mode auto-rotates slides.

Default slide duration is 10 seconds.

Admins can manage slide order and per-slide duration in TV settings.

TV controls:

- Pause/resume.
- Previous slide.
- Next slide.
- Exit fullscreen.

Controls should be available on hover or keyboard, without cluttering the wall display.

Every TV slide shows `Oldest update: ...` for the oldest visible data used by that slide.
The label uses days, hours, minutes, and seconds, omitting leading zero units.
Examples:

- `9d 3h 4m 12s ago`
- `3h 4m 12s ago`
- `4m 12s ago`
- `12s ago`

## Consequences

TV works out of the box.

Admins can pause or navigate during review.

Slides stay readable instead of changing too quickly.

The TV settings UI needs slide order and per-slide duration controls.

Every slide remains honest about data freshness.

## Alternatives Considered

- Dense TV rotation with many slides: more content, but harder to read.
- Cursor Pool only: faster, but too narrow for the TV product.
