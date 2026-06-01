# Decision 0004: Developer setup uses one connection string

## Status

Accepted

## Context

Developers connect their desktop apps with admin-created raw tokens in v1.

Separate fields for URL, team ID, and token create more room for copy/paste mistakes. The desktop setup should feel simple even though the admin is distributing a raw token.

## Decision

The admin UI generates one developer connection string.

The developer pastes that single connection string into the desktop app. The desktop app parses the team deployment URL and developer token from it.

Format:

```text
eusage://connect?url=https://your-eusage.vercel.app&token=eusage_dev_...
```

The connection string contains only:

- Team app URL.
- Developer token.

It does not include Convex URL, Clerk data, team name, endpoint paths, or setup token.
The desktop app discovers safe metadata from `GET /api/v1/team-config`.

Manual advanced fields may exist later, but the primary v1 path is one pasted connection string.

## Consequences

Developer onboarding has fewer steps and fewer mistakes.

The desktop app needs a parser and clear validation errors.

The admin UI can later reuse the same connection string for QR codes or deep links.

## Alternatives Considered

- Two fields: simpler implementation, but worse copy/paste UX.
- Three fields: explicit, but unnecessary for v1 and easier to misconfigure.
- Include metadata in the connection string: fewer first requests, but stale and duplicated metadata.
- Include Convex URL: wrong boundary; desktop should call only the team app URL.
