use super::*;
use crate::plugin_engine::runtime::{
    ProgressFormat, ProviderMetricBucket, ProviderMetricSample, ProviderSourceFacts,
};

fn make_snapshot(provider_id: &str, used: f64) -> CachedPluginSnapshot {
    CachedPluginSnapshot {
        provider_id: provider_id.to_string(),
        display_name: provider_id.to_string(),
        plan: Some("Pro".to_string()),
        lines: vec![MetricLine::Progress {
            label: "Session".to_string(),
            used,
            limit: 100.0,
            format: ProgressFormat::Percent,
            resets_at: None,
            period_duration_ms: None,
            color: None,
        }],
        provider_account_detections: Vec::new(),
        provider_account_outputs: Vec::new(),
        source_facts: None,
        raw_payload: None,
        fetched_at: "2026-06-01T12:00:00Z".to_string(),
    }
}

#[test]
fn provider_upload_contains_redacted_payload_and_source_facts() {
    let snapshot = make_snapshot("cursor", 42.0);
    let provider = build_provider_upload(&snapshot);
    let payload = provider.payload.as_object().unwrap();

    assert_eq!(provider.provider_id, "cursor");
    assert_eq!(provider.period_key, "2026-06-01");
    assert_eq!(provider.summary["quotaPercent"], 42.0);
    assert!(payload.get("providerId").is_some());
    assert!(
        provider
            .metric_samples
            .iter()
            .any(|sample| sample.metric_key == "cursor.session.used")
    );
}

#[test]
fn provider_upload_prefers_plugin_source_facts_and_redacts_raw_payload() {
    let mut extractor_version = BTreeMap::new();
    extractor_version.insert("cursor".to_string(), "1.0.0".to_string());
    let mut snapshot = make_snapshot("cursor", 42.0);
    snapshot.raw_payload = Some(json!({
        "usage": {
            "planUsage": { "apiPercentUsed": 17.0 },
            "accessToken": "secret-token"
        }
    }));
    snapshot.source_facts = Some(ProviderSourceFacts {
        period_start: Some(1_770_000_000_000),
        period_end: Some(1_772_592_000_000),
        period_key: Some("cursor:2026-02-02:2026-03-04".to_string()),
        data_identity: Some("cursor:billing-cycle".to_string()),
        summary: json!({
            "provider": {
                "cursor": {
                    "apiPercentUsed": 17.0,
                    "individualLimitUsd": 100.0,
                    "individualUsedUsd": 40.0,
                    "pooledLimitUsd": 500.0,
                    "pooledUsedUsd": 120.0
                }
            }
        }),
        summary_version: "1.0.0".to_string(),
        extractor_version,
        metric_families: vec!["cursorPool".to_string()],
        metric_samples: vec![ProviderMetricSample {
            metric_key: "cursor.api.percentUsed".to_string(),
            value: 17.0,
            unit: "percent".to_string(),
            sample_day: "2026-06-01".to_string(),
            source: "providerReported".to_string(),
            period_start: Some(1_770_000_000_000),
            period_end: Some(1_772_592_000_000),
            bucket: Some(ProviderMetricBucket {
                kind: "reportingDay".to_string(),
                day: "2026-06-01".to_string(),
                reporting_time_zone: "UTC".to_string(),
                start_ms: 1_770_000_000_000,
                end_ms: 1_770_086_400_000,
            }),
            coverage: None,
        }],
    });

    let provider = build_provider_upload(&snapshot);

    assert_eq!(provider.period_key, "cursor:2026-02-02:2026-03-04");
    assert_eq!(provider.summary_version, "1.0.0");
    assert_eq!(provider.metric_families, vec!["cursorPool"]);
    assert_eq!(
        provider.summary["provider"]["cursor"]["pooledLimitUsd"],
        500.0
    );
    assert_eq!(
        provider.metric_samples[0].metric_key,
        "cursor.api.percentUsed"
    );
    assert_eq!(
        provider.metric_samples[0].bucket.as_ref().unwrap().day,
        "2026-06-01"
    );
    assert_eq!(provider.payload["usage"]["accessToken"], REDACTED_VALUE);
    assert!(
        !serde_json::to_string(&provider.payload)
            .unwrap()
            .contains("secret-token")
    );
}

#[test]
fn provider_account_fingerprint_namespaces_upload_identity() {
    let provider = build_provider_upload(&make_snapshot("cursor", 42.0))
        .attach_provider_account("team-account-fingerprint", "Cursor Work");
    let json = serde_json::to_value(&provider).unwrap();

    assert_eq!(
        json["providerAccountFingerprint"],
        "team-account-fingerprint"
    );
    assert_eq!(json["providerAccountLabel"], "Cursor Work");
    assert_eq!(
        provider.data_identity,
        "provider-account:team-account-fingerprint:cursor:2026-06-01"
    );
    assert_eq!(
        provider.upload_key(),
        "cursor|provider-account:team-account-fingerprint:cursor:2026-06-01"
    );
}

#[test]
fn redaction_scrubs_secret_shaped_fields() {
    let redacted = redact_json_value(json!({
        "accessToken": "secret",
        "nested": {
            "api_key": "also-secret",
            "ordinary": "keep"
        },
        "items": [{ "refreshToken": "refresh" }]
    }));

    assert_eq!(redacted["accessToken"], REDACTED_VALUE);
    assert_eq!(redacted["nested"]["api_key"], REDACTED_VALUE);
    assert_eq!(redacted["nested"]["ordinary"], "keep");
    assert_eq!(redacted["items"][0]["refreshToken"], REDACTED_VALUE);
    assert!(!serde_json::to_string(&redacted).unwrap().contains("secret"));
}
