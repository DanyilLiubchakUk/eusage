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

### Sync Health

How trustworthy current team data looks based on check-ins, sync timestamps, disconnect state, and sync errors.

- Use when: Talking about dashboard or TV freshness bands such as fresh, aging, stale, offline, disconnected, or no data yet.
- Do not use for: Device Status storage state, provider setup state, or usage volume.
- Related terms: Device Status, Dashboard, TV Viewer.

### Dashboard

The web UI used by admins and TV displays to view team usage.

- Use when: Talking about the browser-based team experience.
- Do not use for: The desktop tray/menu bar UI.
- Related terms: Team Deployment.

### TV Viewer

A person looking at the read-only TV display.

- Use when: Talking about someone viewing team usage on a wall display or shared browser.
- Do not use for: Admins configuring TV settings or Developers installing the desktop app.
- Related terms: Dashboard, TV Display Link.

### TV Display Link

A read-only, random-token URL that lets a TV browser show curated dashboard slides without Clerk sign-in.

- Use when: Talking about public-by-link TV access for one team deployment.
- Do not use for: Admin settings, dashboard editing, developer desktop sync, or fully public unauthenticated `/tv`.
- Related terms: TV Viewer, Dashboard, Admin.

### Team Usage

Consumed provider usage by visible developers in the selected dashboard range.

- Use when: Talking about tokens burned and estimated cost shown in Admin or TV.
- Do not use for: Provider quota percentages, rate-limit pressure, Cursor API usage percent, Codex session percent, or sync health.
- Related terms: Dashboard, Provider, Quota Pressure.

### Reporting Time Zone

The single calendar timezone a team uses to define dashboard days and date ranges.

- Use when: Talking about what counts as today, yesterday, Last 7 days, or a custom dashboard range for the team.
- Do not use for: A viewer's display preference, provider reset windows, or exact sync freshness times.
- Related terms: Dashboard, Reporting Day, Team Usage.

### Reporting Day

One calendar day in the team's Reporting Time Zone.

- Use when: Talking about daily consumed usage buckets on Admin or TV.
- Do not use for: Exact sync timestamps, provider billing cycles, or quota states that are only observed at collection time.
- Related terms: Reporting Time Zone, Team Usage, Local Consumed Usage.

### Provider Account Usage

Consumed usage for one developer/provider account, independent of which device reported it.

- Use when: Comparing the same developer/provider usage reported from macOS and Windows devices.
- Do not use for: Device sync health, per-device troubleshooting, or quota pressure.
- Related terms: Provider, Device, Team Usage.

### Local Consumed Usage

Consumed usage measured from one device's local provider history.

- Use when: Talking about Codex or Claude token/cost rows read from local ccusage history on macOS or Windows.
- Do not use for: Cloud account quota, provider budgets, credits, pool values, or percent-used windows.
- Related terms: Device, Tokens Burned, Estimated Cost.

### Tokens Burned

Provider-reported or normalized token consumption in the selected dashboard range.

- Use when: Talking about actual token volume consumed by visible developers.
- Do not use for: Percent-used limits, credits, requests, or budget dollars.
- Related terms: Team Usage, Provider.

### Estimated Cost

Approximate USD cost derived from consumed provider usage in the selected dashboard range.

- Use when: Talking about cost of tokens or other consumed usage that providers report directly or eUsage can estimate from a documented formula.
- Do not use for: Provider plan spend, quota pressure, credits, requests, or missing data shown as zero.
- Related terms: Team Usage, Tokens Burned, Provider Budget.

### Provider Budget

Provider-reported dollar budget, spend, or remaining allowance for an account or plan.

- Use when: Talking about plan spend, budget limits, on-demand allowance, or shared pool money.
- Do not use for: Estimated Cost, Tokens Burned, or Quota Pressure.
- Related terms: Estimated Cost, Cursor Pool, Provider.

### Cursor Pool

Shared Cursor dollar allowance available to a team.

- Use when: Talking about pooled Cursor budget values shared across developers.
- Do not use for: Summed per-developer on-demand budget, Cursor percent-used limits, tokens burned, or estimated cost.
- Related terms: Provider Budget, Cursor On-Demand Budget, Quota Pressure.

### Cursor On-Demand Budget

Per-developer Cursor dollar allowance. Can also describe a team aggregate made by summing visible developers' on-demand budgets when no true shared Cursor Pool exists.

- Use when: Talking about individual Cursor budget values for one developer, or a fallback team budget aggregate across developers.
- Do not use for: Shared Cursor Pool, Cursor percent-used limits, tokens burned, or estimated cost.
- Related terms: Provider Budget, Cursor Pool, Quota Pressure.

### Quota Pressure

How close visible developers are to provider limits.

- Use when: Talking about percent-used values such as Cursor API usage percent or Codex session and weekly percent.
- Do not use for: Tokens burned, estimated cost, credits, or requests.
- Related terms: Team Usage, Provider.

### Observed Quota State

A provider budget, quota, credit, or percent-used value captured at one point in time.

- Use when: Talking about current Cursor or JetBrains usage state such as used, limit, remaining, or percent used.
- Do not use for: Daily consumed usage that can be assigned to a Reporting Day.
- Related terms: Provider Budget, Quota Pressure, Cursor Pool.

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
