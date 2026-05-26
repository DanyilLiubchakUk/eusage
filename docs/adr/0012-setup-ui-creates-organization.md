# ADR 0012: Setup UI creates the organization

## Status

Accepted

## Context

v1 supports one organization per deployment. The deployment owner already has a `SETUP_TOKEN` for owner-only setup actions.

Defining organization identity only through environment variables would make setup more terminal-heavy and harder for non-developer users.

## Decision

The setup UI creates the single organization once.

The owner opens `/setup`, enters the `SETUP_TOKEN`, enters the organization name, and creates the organization record in Convex.

After the organization exists, `/setup` switches to token management instead of showing the create-organization form.

## Consequences

Initial setup is easier and keeps organization name visible in the dashboard.

The implementation needs a protected setup mutation and an already-created state.

The setup UI must not allow creating multiple organizations in v1.

## Alternatives Considered

- Environment variables define organization identity: less UI, but more terminal and deployment-setting work for the owner.
