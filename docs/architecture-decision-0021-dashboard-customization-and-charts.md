# Decision 0021: Dashboard customization and Chart.js charts

## Status

Accepted

## Context

Admins need the dashboard and TV mode to show different views of team usage. The same stored usage data should support developer comparisons, provider comparisons, time range filtering, and slide-style TV views.

v1 should avoid a full drag-and-drop dashboard builder, but still provide meaningful customization.

## Decision

v1 dashboard customization includes:

- Show or hide developers.
- Show or hide providers/platforms with checkboxes.
- Choose date range.
- Choose comparison mode.
- Compare each developer over time.
- Compare all developers in total.
- Compare usage per provider/platform.
- Show provider-specific charts such as Cursor credit pool usage.
- Configure TV slide order.
- Configure TV slide duration.
- Configure dashboard theme/display mode.

Persistence split:

- Persisted: date range, global provider visibility, TV visibility, and dashboard defaults.
- Temporary: one-off Admin Overview focus filters for developer/provider review unless the control is explicitly a settings control.

Overview should not persist every exploratory filter click.

Dashboards may render multiple chart types using Chart.js in React.

Admin Overview is a dense analytics dashboard.

TV mode is separate and uses curated fullscreen slides, not the dense admin layout.

## Consequences

Admins can tailor dashboard and TV mode without building custom layouts.

Chart data should be derived from stored summary fields and full payloads.

The implementation should keep chart containers responsive and stable so TV/fullscreen mode does not jump or overlap.

## Alternatives Considered

- Filters only: too limited for TV/dashboard customization.
- Full custom dashboard builder: powerful, but too much v1 UI and state.
