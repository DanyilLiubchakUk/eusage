# Decision 0105: Local dev uses web/backend and desktop commands

## Status

Accepted

## Context

eUsage has a hosted web/backend side and a Tauri desktop side.
Local development should be simple enough for macOS and Windows contributors.

Running TanStack Start, Convex, and Tauri as many separate commands is explicit but annoying.
Docker Compose is too much for v1 local dev.

## Decision

Use two local dev commands:

- `bun dev:web`
- `bun dev:desktop`

`bun dev:web` starts TanStack Start and Convex dev.
`bun dev:desktop` starts Tauri.

## Consequences

Local setup stays easy.

Web/backend and desktop logs stay separate.

Package scripts must provide those names.

## Alternatives Considered

- Separate TanStack, Convex, and Tauri commands: explicit, but too many terminals.
- Docker Compose: useful later, but unnecessary for v1.
