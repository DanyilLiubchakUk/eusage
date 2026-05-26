# Context

## Glossary

### Organization

A team or company using eUsage to combine teammate usage in one shared place.

- Use when: Usage belongs to a shared workspace with multiple teammates and dashboards.
- Do not use for: A single teammate, an auth provider account, or a deployment host account.
- Related terms: Teammate, Dashboard, Collector.

### Teammate

A person whose desktop app reports local AI tool usage to an organization.

- Use when: Talking about the human source of uploaded usage snapshots.
- Do not use for: A machine, API token, or Vercel/GitHub user.
- Related terms: Organization, Write Token.

### Collector

The service that receives usage snapshots from teammate desktop apps and stores them for dashboards.

- Use when: Describing the central ingest and read surface for team usage data.
- Do not use for: The desktop app, dashboard UI, or provider plugin.
- Related terms: Dashboard, Write Token, Read Token.

### Dashboard

The shared web view that shows organization usage across teammates.

- Use when: Talking about the TV or browser view for monitoring combined usage.
- Do not use for: The desktop menu bar panel on a teammate machine.
- Related terms: Collector, Organization.

### Write Token

A secret that lets a teammate desktop app upload usage snapshots for one organization.

- Use when: Authorizing desktop-to-collector writes.
- Do not use for: Dashboard viewing or organization administration.
- Related terms: Read Token, Organization.

### Read Token

A secret that lets a dashboard read usage snapshots for one organization.

- Use when: Authorizing TV or browser dashboard reads.
- Do not use for: Desktop upload authorization.
- Related terms: Write Token, Dashboard.
