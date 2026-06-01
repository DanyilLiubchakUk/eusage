# Decision 0084: Cursor pool TV shows missing data as small note

## Status

Accepted

## Context

Some developers may not report Cursor on-demand budget data.

The Cursor pool slide can still be useful when most developers have valid budget data.

A large warning banner would make the TV display feel broken.

Hiding the slide would lose useful team signal.

## Decision

Cursor pool TV shows missing budget data as a small note.

Example:

```text
4/5 developers reporting budget data
```

The note should appear near the pool metadata, not as a warning banner.

## Consequences

TV stays readable and calm.

Admins can see the data is incomplete.

Useful pool information remains visible.

## Alternatives Considered

- Warning banner: too loud for partial missing data.
- Hide slide: hides useful data.
