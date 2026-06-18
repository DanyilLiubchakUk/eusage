use super::*;
use crate::local_http_api::cache::CachedPluginSnapshot;
use crate::plugin_engine::provider_account::{
    ProviderAccountIdentityConfidence, ProviderAccountIdentityKind,
};
use crate::plugin_engine::runtime::{
    MetricLine, ProgressFormat, ProviderAccountDetection, ProviderAccountOutput,
    ProviderMetricSample, ProviderSourceFacts,
};
use serde_json::json;
use serial_test::serial;
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::path::Path;

fn reset_state() {
    let mut state = super::super::team_sync_state().lock().unwrap();
    *state = super::super::TeamSyncState::default();
}

fn temp_dir(label: &str) -> std::path::PathBuf {
    std::env::temp_dir().join(format!(
        "openusage-current-provider-account-upload-{}-{}",
        label,
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ))
}

fn detection() -> ProviderAccountDetection {
    ProviderAccountDetection {
        provider_id: "cursor".to_string(),
        provider_name: "Cursor".to_string(),
        identity_kind: ProviderAccountIdentityKind::ProviderEmail,
        identity_value: "work@example.com".to_string(),
        identity_confidence: ProviderAccountIdentityConfidence::High,
        label: Some("Cursor Work".to_string()),
    }
}

fn snapshot() -> CachedPluginSnapshot {
    CachedPluginSnapshot {
        provider_id: "cursor".to_string(),
        display_name: "Cursor".to_string(),
        plan: Some("Pro".to_string()),
        lines: vec![MetricLine::Progress {
            label: "Usage".to_string(),
            used: 42.0,
            limit: 100.0,
            format: ProgressFormat::Percent,
            resets_at: None,
            period_duration_ms: None,
            color: None,
        }],
        provider_account_detections: vec![detection()],
        provider_account_outputs: Vec::new(),
        source_facts: None,
        raw_payload: None,
        fetched_at: "2026-06-01T12:00:00Z".to_string(),
    }
}

fn account_bound_snapshot() -> CachedPluginSnapshot {
    let mut snapshot = snapshot();
    snapshot.provider_account_detections = Vec::new();
    snapshot.provider_account_outputs = vec![ProviderAccountOutput {
        provider_account_detections: vec![detection()],
        lines: vec![MetricLine::Progress {
            label: "Today".to_string(),
            used: 123.0,
            limit: 123.0,
            format: ProgressFormat::Count {
                suffix: "tokens".to_string(),
            },
            resets_at: None,
            period_duration_ms: None,
            color: None,
        }],
        source_facts: account_bound_source_facts(),
        raw_payload: Some(json!({
            "eportPartition": { "providerAccountFingerprint": "acct-work" },
            "accessToken": "secret-token",
        })),
    }];
    snapshot
}

fn account_bound_source_facts() -> ProviderSourceFacts {
    let mut extractor_version = BTreeMap::new();
    extractor_version.insert("cursor".to_string(), "1.0.0".to_string());

    ProviderSourceFacts {
        period_start: Some(DateParse::millis("2026-06-01T00:00:00.000Z")),
        period_end: Some(DateParse::millis("2026-06-02T00:00:00.000Z")),
        period_key: Some("cursor:2026-06-01".to_string()),
        data_identity: Some("eport:cursor:acct-work:daily:2026-06-01".to_string()),
        summary: json!({
            "tokensTotal": 123.0,
            "provider": {
                "cursor": {
                    "todayTokens": 123.0,
                    "eportAccountFingerprint": "acct-work",
                },
            },
        }),
        summary_version: "1.0.0".to_string(),
        extractor_version,
        metric_families: vec!["tokens".to_string()],
        metric_samples: vec![ProviderMetricSample {
            metric_key: "cursor.tokens.total".to_string(),
            value: 123.0,
            unit: "tokens".to_string(),
            sample_day: "2026-06-01".to_string(),
            source: "calculated".to_string(),
            period_start: Some(DateParse::millis("2026-06-01T00:00:00.000Z")),
            period_end: Some(DateParse::millis("2026-06-02T00:00:00.000Z")),
            bucket: None,
            coverage: None,
        }],
    }
}

struct DateParse;

impl DateParse {
    fn millis(value: &str) -> i64 {
        time::OffsetDateTime::parse(value, &time::format_description::well_known::Rfc3339)
            .unwrap()
            .unix_timestamp_nanos()
            .div_euclid(1_000_000) as i64
    }
}

fn write_settings(dir: &Path, shared: bool) -> String {
    std::fs::create_dir_all(dir).unwrap();
    let local_salt = "desktop-local-salt";
    let local_fingerprint = fingerprint_provider_account(&detection(), "local", local_salt);
    let shared_fingerprints = if shared {
        json!([local_fingerprint])
    } else {
        json!([])
    };
    std::fs::write(
        dir.join(super::super::settings::SETTINGS_FILE_NAME),
        serde_json::to_string_pretty(&json!({
            "teamConnection": {
                "teamUrl": "https://team.example.com",
                "teamName": "Acme Team",
                "teamFingerprint": "team-fingerprint",
                "tokenFingerprint": "abcd1234...wxyz7890",
                "deviceId": "device-1",
                "endpoints": {
                    "teamConfig": "/api/v1/team-config",
                    "deviceCheckIn": "/api/v1/device/check-in",
                    "usageBatch": "/api/v1/usage/batch",
                    "deviceDisconnect": "/api/v1/device/disconnect"
                },
                "syncStatus": "never",
                "lastContactAt": null,
                "deviceStatus": "connected",
                "lastError": null
            },
            "providerAccountLocalSalt": local_salt,
            "providerAccountRegistry": {
                "accounts": [{
                    "providerId": "cursor",
                    "localAccountFingerprint": local_fingerprint,
                    "label": "Cursor Work",
                    "visibility": "visible",
                    "identityConfidence": "high",
                    "confirmationState": "unconfirmed",
                    "firstSeenAt": "2026-06-01T12:00:00.000Z",
                    "lastSeenAt": "2026-06-01T12:00:00.000Z",
                    "detectionState": "detected"
                }]
            },
            "providerAccountSharing": {
                "teamFingerprint": "team-fingerprint",
                "sharedLocalAccountFingerprints": shared_fingerprints
            }
        }))
        .unwrap(),
    )
    .unwrap();
    local_fingerprint
}

fn fingerprint_provider_account(
    detection: &ProviderAccountDetection,
    scope: &str,
    scope_secret: &str,
) -> String {
    let value = [
        "provider-account-fingerprint:v1",
        scope,
        detection.provider_id.as_str(),
        "providerEmail",
        detection.identity_value.as_str(),
        scope_secret,
    ]
    .join("\0");

    Sha256::digest(value.as_bytes())
        .iter()
        .map(|byte| format!("{:02x}", byte))
        .collect()
}

#[test]
#[serial]
fn queues_current_cached_provider_data_for_shared_account() {
    reset_state();
    let dir = temp_dir("shared");
    let local_fingerprint = write_settings(&dir, true);

    let enqueue = enqueue_current_shared_provider_account_data_with(
        &dir,
        "cursor",
        &local_fingerprint,
        "Cursor Work",
        |_| Some(snapshot()),
    )
    .unwrap();

    assert_eq!(
        enqueue,
        CurrentSharedProviderAccountEnqueue {
            current_data_queued: true,
            should_start_worker: true,
        }
    );
    let state = super::super::team_sync_state().lock().unwrap();
    assert_eq!(state.pending.len(), 1);
    let pending = state.pending.values().next().unwrap();
    assert_eq!(pending.local_account_fingerprint, local_fingerprint);
    let upload = serde_json::to_value(&pending.upload).unwrap();
    assert_eq!(upload["providerAccountLabel"], "Cursor Work");
    assert_eq!(
        upload["providerAccountFingerprint"].as_str().unwrap().len(),
        64
    );
    assert!(upload["dataIdentity"]
        .as_str()
        .unwrap()
        .starts_with("provider-account:"));
}

#[test]
#[serial]
fn queues_current_cached_account_bound_data_for_shared_account() {
    reset_state();
    let dir = temp_dir("shared-account-bound");
    let local_fingerprint = write_settings(&dir, true);

    let enqueue = enqueue_current_shared_provider_account_data_with(
        &dir,
        "cursor",
        &local_fingerprint,
        "Cursor Work",
        |_| Some(account_bound_snapshot()),
    )
    .unwrap();

    assert_eq!(
        enqueue,
        CurrentSharedProviderAccountEnqueue {
            current_data_queued: true,
            should_start_worker: true,
        }
    );
    let state = super::super::team_sync_state().lock().unwrap();
    assert_eq!(state.pending.len(), 1);
    let pending = state.pending.values().next().unwrap();
    assert_eq!(pending.local_account_fingerprint, local_fingerprint);
    let upload = serde_json::to_value(&pending.upload).unwrap();
    assert_eq!(upload["providerAccountLabel"], "Cursor Work");
    assert_eq!(upload["summary"]["tokensTotal"], 123.0);
    assert!(upload["dataIdentity"]
        .as_str()
        .unwrap()
        .contains("eport:cursor:acct-work:daily:2026-06-01"));
    assert!(!serde_json::to_string(&upload)
        .unwrap()
        .contains("secret-token"));
}

#[test]
#[serial]
fn missing_current_cached_provider_data_waits_for_next_probe() {
    reset_state();
    let dir = temp_dir("missing-cache");
    let local_fingerprint = write_settings(&dir, true);

    let enqueue = enqueue_current_shared_provider_account_data_with(
        &dir,
        "cursor",
        &local_fingerprint,
        "Cursor Work",
        |_| None,
    )
    .unwrap();

    assert_eq!(
        enqueue,
        CurrentSharedProviderAccountEnqueue {
            current_data_queued: false,
            should_start_worker: false,
        }
    );
    assert!(super::super::team_sync_state()
        .lock()
        .unwrap()
        .pending
        .is_empty());
}

#[test]
#[serial]
fn unshared_account_does_not_queue_current_data() {
    reset_state();
    let dir = temp_dir("unshared");
    let local_fingerprint = write_settings(&dir, false);

    let enqueue = enqueue_current_shared_provider_account_data_with(
        &dir,
        "cursor",
        &local_fingerprint,
        "Cursor Work",
        |_| Some(snapshot()),
    )
    .unwrap();

    assert_eq!(
        enqueue,
        CurrentSharedProviderAccountEnqueue {
            current_data_queued: false,
            should_start_worker: false,
        }
    );
    assert!(super::super::team_sync_state()
        .lock()
        .unwrap()
        .pending
        .is_empty());
}

#[test]
#[serial]
fn reports_current_data_queued_when_worker_already_exists() {
    reset_state();
    let dir = temp_dir("shared-existing-worker");
    let local_fingerprint = write_settings(&dir, true);

    let first = enqueue_current_shared_provider_account_data_with(
        &dir,
        "cursor",
        &local_fingerprint,
        "Cursor Work",
        |_| Some(snapshot()),
    )
    .unwrap();
    let second = enqueue_current_shared_provider_account_data_with(
        &dir,
        "cursor",
        &local_fingerprint,
        "Cursor Work",
        |_| Some(snapshot()),
    )
    .unwrap();

    assert!(first.should_start_worker);
    assert_eq!(
        second,
        CurrentSharedProviderAccountEnqueue {
            current_data_queued: true,
            should_start_worker: false,
        }
    );
}
