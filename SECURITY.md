# Security Policy

eUsage reads local AI tool usage and can upload summaries to a collector.

## Sensitive Data Rules

- Never upload provider tokens.
- Never upload cookies.
- Never upload raw credential files.
- Never upload full logs.
- Keep collector tokens secret.

## Collector Auth

The collector uses capability tokens:

- `writeToken` lets teammate apps upload snapshots.
- `readToken` lets dashboards read snapshots.
- `EUSAGE_ADMIN_TOKEN` creates organizations.

Use HTTPS outside a trusted LAN.

## Reporting

Open a private security report in your fork repository, or contact the maintainers of the deployment you use.
