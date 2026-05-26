# ADR 0007: Token-derived teammate identity

## Status

Accepted

## Context

The desktop app needs to upload usage for a teammate. If the desktop app sends teammate identity in the request body, a user or compromised client could spoof another teammate. Keeping teammate identity in local settings also creates confusion when the stored name does not match the token owner.

Per-teammate write tokens already identify the teammate on the server side.

## Decision

The collector derives teammate identity from the write token. The desktop app stores only the collector URL, organization ID, and write token for team sync.

The desktop app may display the connected teammate name after a successful test connection, but that name comes from the server response.

## Consequences

This keeps upload authorization simple and safer:

- The client cannot choose which teammate it uploads as.
- Desktop setup has fewer fields.
- Setup mistakes are easier to detect with a test connection.

## Alternatives Considered

- Store teammate name/id locally: convenient but confusing and not authoritative.
- Let desktop pick teammate from a list: requires read/admin access and more setup UI.
