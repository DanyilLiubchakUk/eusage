# Decision 0130: Account-bound provider plugin outputs

## Status

Accepted

## Context

Provider plugins currently return one provider-level output per refresh. That output can include Provider Account detections, source facts, metric lines, and a raw payload.

ePort calculated usage can produce multiple Codex or Claude account partitions from one provider refresh. Treating those partitions as one merged provider output would make local display repeat the same metric lines under every visible Provider Account, and Team upload would not know which shared Provider Account owns the data.

## Decision

Provider plugins may return account-bound child outputs:

```ts
type ProviderAccountOutput = {
  providerAccountDetections: [ProviderAccountDetection];
  lines: MetricLine[];
  sourceFacts: ProviderSourceFacts;
  rawPayload?: unknown;
};

type PluginOutput = {
  providerId: string;
  displayName: string;
  plan?: string;
  lines: MetricLine[];
  providerAccountDetections?: ProviderAccountDetection[];
  providerAccountOutputs?: ProviderAccountOutput[];
  sourceFacts?: ProviderSourceFacts;
  rawPayload?: unknown;
};
```

`providerAccountOutputs` is additive. Existing provider-level output behavior remains valid.

Each child output maps to exactly one Provider Account detection. Each child output carries its own metric lines, source facts, stable `sourceFacts.dataIdentity`, and optional raw payload.

If a provider partition cannot map to exactly one Provider Account, the plugin must use a fallback Provider Account or return an explicit error output. It must not silently merge ambiguous account data into another child output or into provider-level lines.

Local display should render child output lines under the matching visible Provider Account when account-bound outputs exist. It should fall back to provider-level lines when a plugin has no account-bound outputs.

Team upload should upload account-bound child outputs separately, after the normal Provider Account visibility, detection, and sharing gates pass.

## Consequences

One provider refresh can represent multiple account-specific local usage totals without pretending they are one provider snapshot.

The contract preserves the existing Provider Account privacy model: raw account identifiers stay local, and Team upload still uses team-scoped Provider Account fingerprints.

Plugins that only have one provider-level result do not need to change.

Future ePort calculated usage readers can express two Provider Accounts with different token totals in one Codex or Claude refresh.

## Alternatives Considered

- Merge all account partitions into provider-level lines: simple, but local display and Team upload cannot safely attribute usage.
- Run one full provider plugin probe per account: clearer ownership, but slower and awkward for providers that naturally discover partitions in one scan.
- Put account-specific metrics inside provider-level `rawPayload`: flexible, but invisible to local display and Team upload contracts.
