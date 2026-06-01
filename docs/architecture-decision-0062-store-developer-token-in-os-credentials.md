# Decision 0062: Desktop stores developer token in OS credentials

## Status

Accepted

## Context

The desktop app needs the raw developer token after the first team connection.

The raw token authorizes usage uploads and device check-ins. Losing it should disconnect team sync; leaking it would let another machine upload as that developer.

Keeping the token in a normal config file would be simpler, but worse for macOS and Windows desktop security.

## Decision

The desktop app stores the raw developer token in OS credential storage:

- macOS: Keychain.
- Windows: Windows Credential Manager or equivalent Windows credential storage.

The desktop app stores only non-secret connection metadata in normal app config:

- Team URL.
- Team name.
- Token fingerprint.
- Device ID.

## Consequences

Developer team sync uses the same secure-storage direction as provider credentials.

The Team page can show useful connection metadata without exposing the raw token.

Disconnect must remove the stored developer token from OS credential storage.

Windows support needs credential storage before team sync is production-ready.

## Alternatives Considered

- Store raw token in app config: simpler, but too easy to leak through file copies, backups, or debug logs.
- Ask for the token on every launch: secure, but bad desktop UX.
