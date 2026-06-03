# Decision 0125: TV display link uses random read token

## Status

Accepted

## Context

TV mode is meant to run on a shared wall display.

Requiring Clerk sign-in on the TV browser protects data, but it makes day-to-day display setup awkward.

Making `/tv` fully public would expose team usage, spend, developer names, and sync health to anyone who finds the deployment URL.

The team is small, so v1 needs a simple read-only display path without adding multi-user roles.

## Decision

Admins can create a read-only TV display link with a long random token.

Each team has at most one active TV display link in v1.

The raw display token is shown only once on create or rotate.

The backend stores only:

- Token hash.
- Fingerprint.
- Status.
- Created timestamp.
- Rotated or revoked timestamp when applicable.

The existing raw display token cannot be re-shown.

The display link can show curated TV slides without Clerk sign-in.

Route split:

- `/tv` is the Clerk-protected admin TV cockpit.
- `/tv/display/:token` is the read-only wall-display route.

The token lives in the path, not a query string.

Use `/tv/display/:token`, not `/tv/display?token=...`.

The normal admin TV route stays Clerk-protected and owns TV settings, slide config, visibility, inline preview, and display-link management.

The admin TV cockpit shows settings and an inline TV preview on desktop-sized screens, plus actions to open or copy the display link.

Admin cockpit and display route use the same TV slide renderer.

The shells differ:

- `/tv` wraps the renderer with admin settings, drag ordering, enable toggles, per-slide duration inputs, visibility controls, inline preview frame, and display-link actions.
- `/tv/display/:token` renders the same slide renderer full-screen with playback controls only.

TV settings changes save immediately in v1.

Immediate-save controls include:

- Drag reorder.
- Enable/disable.
- Per-slide duration.
- Date range.
- Developer visibility.
- Provider visibility.

Valid per-slide duration is 5-300 seconds, with 10 seconds as the default.

Invalid or empty duration values show an inline error and do not save.

At least one TV slide must stay enabled.

The admin UI prevents disabling the last enabled slide.

Backend validation rejects TV settings with zero enabled slides.

If only one slide is enabled, playback controls stay visible but previous, next, and pause/resume are disabled.

This keeps the TV control layout stable while making the single-slide state clear.

The UI shows small `Saved` and `Save failed` states.

Save failures are visible, not silent.

The display route has no settings panel.

The display route keeps read-only playback controls on hover or keyboard:

- Pause/resume.
- Previous slide.
- Next slide.
- Exit fullscreen.

The display route still uses the configured TV settings:

- Enabled slides.
- Slide order.
- Per-slide duration.
- Date range.
- Developer visibility.
- Provider visibility.

The public display link is read-only.

Plain `/tv` is not world-readable.

Admins can rotate or revoke the display link.

Rotating the display link invalidates the old link immediately.

If the admin loses the display link, they rotate it and copy the new link.

All TV displays use the same team TV settings.

Invalid, revoked, or missing display tokens show a clean fullscreen unavailable state:

```text
TV link unavailable
Ask an admin to rotate the display link.
```

The unavailable state must not show team name, developer names, providers, usage data, setup state, or owner details.

The display route must not redirect invalid viewers to `/tv`, because the viewer may not be an admin.

TV display data refresh uses reactive data updates plus a local clock tick for freshness labels.

The display route must not hard-reload on a timer.

The local clock can tick every second only to reformat `Updates: ...`.

Playback state is memory-only in v1.

Paused state and current slide are not persisted in URL, local storage, or Convex.

After browser reload, the display starts from the first enabled slide and auto-plays.

Admin TV settings persist; viewer playback controls do not.

## Consequences

TV browsers can run without an admin session.

Leaked display links can be rotated or revoked.

Hash-only storage keeps database readers from using raw display links.

Implementation needs a small display-token table or team-level token field.

Display-link queries must return only TV-safe data after TV visibility filters.

The display-link UI stays simple because there is no named link inventory in v1.

TV slide layouts must be readable on large wall displays such as 54-inch TVs and still work well on desktop browsers.

TV displays avoid blank/loading flashes from periodic page reloads.

Reload behavior stays predictable and simple.

No developer login or multi-admin role model is added.

## Alternatives Considered

- Clerk-protected TV only: safest, but awkward for shared wall displays.
- Fully public `/tv`: simplest, but exposes team usage to anyone with the deployment URL.
- Store raw display token: fastest to re-show, but any database reader could open the TV display.
- Multiple named display links: useful for many rooms, but unnecessary for one small team deployment in v1.
- Per-user TV access: more controlled, but too much role management for v1.
