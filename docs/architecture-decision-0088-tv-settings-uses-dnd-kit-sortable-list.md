# Decision 0088: TV settings uses dnd-kit sortable list

## Status

Accepted

## Context

Admins need to reorder TV slides, enable or disable slides, and set per-slide duration.

Hand-rolled drag and drop is easy to get wrong, especially for keyboard and accessibility behavior.

## Decision

Use `dnd-kit` for the TV slide settings sortable list.

The TV settings UI should show a vertical list of slide rows.

Each row includes:

- Drag handle.
- Slide name.
- Enabled toggle.
- Duration input.

Use `@dnd-kit/core` and `@dnd-kit/sortable`.

## Consequences

Slide ordering uses a maintained React drag-and-drop library.

Implementation avoids custom drag/drop behavior.

Keyboard sortable behavior is available through dnd-kit sensors.

The UI still needs normal non-drag controls for toggles and duration inputs.

## Alternatives Considered

- Build custom drag/drop: less dependency, but more bug risk.
- JSON config editor: fastest, but poor admin UX.
