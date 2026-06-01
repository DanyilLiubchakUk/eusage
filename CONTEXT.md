# Context

## Glossary

### Team Deployment

A copy of eUsage deployed and operated by one customer team.

- Use when: A team forks or deploys eUsage to its own Vercel and Convex projects.
- Do not use for: A central eUsage SaaS shared by many teams.
- Related terms: Admin, Developer, Dashboard.

### Team

The group of developers tracked inside one team deployment.

- Use when: Talking about the people, settings, tokens, and usage data owned by one deployment.
- Do not use for: Multiple organizations inside one deployment.
- Related terms: Team Deployment, Admin, Developer.

### Setup Token

A deployment owner secret used only to claim the first admin during initial setup.

- Use when: Talking about proving control of a team deployment before an owner exists.
- Do not use for: Admin login after setup or developer desktop sync.
- Related terms: Team Deployment, Admin.

### Admin

The person who owns setup and team management for one team deployment.

- Use when: Talking about inviting developers, configuring the deployment, and managing team access.
- Do not use for: A developer who only installs the desktop app.
- Related terms: Developer, Team Deployment.

### Developer

A teammate whose desktop app reports local AI tool usage to the team deployment.

- Use when: Talking about the person installing the macOS or Windows desktop app.
- Do not use for: The admin role unless that person is also being tracked as a user.
- Related terms: Admin, Desktop App.

### Developer Status

Whether a developer can currently sync usage or is kept for historical review only.

- Use when: Talking about active and inactive developers.
- Do not use for: Device health or provider setup state.
- Related terms: Developer, Desktop App, Dashboard.

### Developer Token

A per-developer secret used by the desktop app to sync usage to a team deployment.

- Use when: Talking about desktop team connection, token rotation, token revoke, or token fingerprints.
- Do not use for: Setup Token, admin login, or Provider Credential.
- Related terms: Developer, Desktop App, Team Deployment.

### Device

One desktop app installation connected by a developer.

- Use when: Talking about a specific macOS or Windows machine sending usage.
- Do not use for: The developer's identity or dashboard usage grouping.
- Related terms: Developer, Desktop App, Device Status.

### Device Status

The operational state of one connected device.

- Use when: Talking about connected, stale, disconnected, or archived desktop installations.
- Do not use for: Developer status, provider setup state, or usage totals.
- Related terms: Device, Developer, Desktop App.

### Dashboard

The web UI used by admins and TV displays to view team usage.

- Use when: Talking about the browser-based team experience.
- Do not use for: The desktop tray/menu bar UI.
- Related terms: Team Deployment.

### Desktop App

The macOS or Windows app installed by each developer to collect and sync local usage.

- Use when: Talking about menu bar, taskbar tray, local provider probes, and sync.
- Do not use for: The web dashboard or hosted backend.
- Related terms: Developer, Dashboard.

### Provider

An AI tool or platform whose usage data eUsage can collect and show.

- Use when: Talking about sources such as Codex, Cursor, Claude, or JetBrains AI Assistant.
- Do not use for: A developer, team deployment, or hosting service.
- Related terms: Desktop App, Dashboard.

### Provider Credential

A local secret that lets the desktop app read usage from a provider.

- Use when: Talking about provider API keys, session tokens, OAuth tokens, or cookies used for local usage collection.
- Do not use for: eUsage developer tokens used to sync data to a team deployment.
- Related terms: Provider, Developer, Desktop App.
