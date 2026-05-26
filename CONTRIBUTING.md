# Contributing to eUsage

eUsage keeps scope narrow:

- Track AI subscription usage.
- Share team snapshots with an opt-in collector.
- Show a TV dashboard.

## Rules

- Keep changes small.
- Add tests for bugs when practical.
- Do not add provider secrets, tokens, cookies, or raw logs to collector payloads.
- New provider plugins must document request/response fields and redaction needs.
- UI changes need screenshots before PR.

## Local Checks

```bash
bun run build
bun run test
bun run collector:test
```

## License

By contributing, you agree your contribution is licensed under MIT.
