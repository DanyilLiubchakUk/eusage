use super::*;
use crate::plugin_engine::provider_account::{
    ProviderAccountIdentityConfidence, ProviderAccountIdentityKind,
};
use crate::plugin_engine::runtime::{
    MetricLine, ProgressFormat, ProviderAccountDetection, ProviderAccountOutput,
    ProviderMetricSample, ProviderSourceFacts,
};
use serde_json::{json, Value};
use serial_test::serial;
use settings::SETTINGS_FILE_NAME;
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

const PROVIDER_ACCOUNT_LOCAL_SALT: &str = "desktop-local-salt";

#[derive(Clone)]
struct AccountSetting {
    detection: ProviderAccountDetection,
    label: &'static str,
    visibility: &'static str,
    detection_state: &'static str,
    shared: bool,
}

fn temp_dir(label: &str) -> PathBuf {
    std::env::temp_dir().join(format!(
        "openusage-account-bound-team-sync-{}-{}",
        label,
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ))
}

fn reset_state() {
    let mut state = team_sync_state().lock().unwrap();
    *state = TeamSyncState::default();
}

fn account_detection(provider_id: &str, identity_value: &str) -> ProviderAccountDetection {
    ProviderAccountDetection {
        provider_id: provider_id.to_string(),
        provider_name: provider_id.to_string(),
        identity_kind: ProviderAccountIdentityKind::ProviderAccountId,
        identity_value: identity_value.to_string(),
        identity_confidence: ProviderAccountIdentityConfidence::High,
        label: None,
    }
}

fn account(
    provider_id: &str,
    identity_value: &str,
    label: &'static str,
    shared: bool,
) -> AccountSetting {
    account_with(provider_id, identity_value, label, "visible", shared)
}

fn account_with(
    provider_id: &str,
    identity_value: &str,
    label: &'static str,
    visibility: &'static str,
    shared: bool,
) -> AccountSetting {
    AccountSetting {
        detection: account_detection(provider_id, identity_value),
        label,
        visibility,
        detection_state: "detected",
        shared,
    }
}

fn account_output(provider_id: &str, identity_value: &str, tokens: f64) -> ProviderAccountOutput {
    ProviderAccountOutput {
        provider_account_detections: vec![account_detection(provider_id, identity_value)],
        lines: vec![MetricLine::Progress {
            label: "Today".to_string(),
            used: tokens,
            limit: tokens,
            format: ProgressFormat::Count {
                suffix: "tokens".to_string(),
            },
            resets_at: None,
            period_duration_ms: None,
            color: None,
        }],
        source_facts: account_source_facts(provider_id, identity_value, tokens),
        raw_payload: Some(json!({
            "eportPartition": { "providerAccountFingerprint": identity_value },
            "accessToken": "secret-token",
        })),
    }
}

fn account_source_facts(
    provider_id: &str,
    identity_value: &str,
    tokens: f64,
) -> ProviderSourceFacts {
    let mut extractor_version = BTreeMap::new();
    extractor_version.insert(provider_id.to_string(), "1.0.0".to_string());
    let mut provider_summary = serde_json::Map::new();
    provider_summary.insert(
        provider_id.to_string(),
        json!({
            "todayTokens": tokens,
            "eportAccountFingerprint": identity_value,
        }),
    );

    ProviderSourceFacts {
        period_start: Some(date_millis("2026-06-01T00:00:00.000Z")),
        period_end: Some(date_millis("2026-06-02T00:00:00.000Z")),
        period_key: Some(format!("{provider_id}:2026-06-01")),
        data_identity: Some(format!(
            "eport:{provider_id}:{identity_value}:daily:2026-06-01"
        )),
        summary: json!({
            "tokensTotal": tokens,
            "provider": Value::Object(provider_summary),
        }),
        summary_version: "1.0.0".to_string(),
        extractor_version,
        metric_families: vec!["tokens".to_string()],
        metric_samples: vec![ProviderMetricSample {
            metric_key: format!("{provider_id}.tokens.total"),
            value: tokens,
            unit: "tokens".to_string(),
            sample_day: "2026-06-01".to_string(),
            source: "calculated".to_string(),
            period_start: Some(date_millis("2026-06-01T00:00:00.000Z")),
            period_end: Some(date_millis("2026-06-02T00:00:00.000Z")),
            bucket: None,
            coverage: None,
        }],
    }
}

fn date_millis(value: &str) -> i64 {
    time::OffsetDateTime::parse(value, &time::format_description::well_known::Rfc3339)
        .unwrap()
        .unix_timestamp_nanos()
        .div_euclid(1_000_000) as i64
}

fn account_bound_snapshot(
    provider_id: &str,
    outputs: Vec<ProviderAccountOutput>,
    parent_detections: Vec<ProviderAccountDetection>,
) -> CachedPluginSnapshot {
    CachedPluginSnapshot {
        provider_id: provider_id.to_string(),
        display_name: provider_id.to_string(),
        plan: Some("Pro".to_string()),
        lines: Vec::new(),
        provider_account_detections: parent_detections,
        provider_account_outputs: outputs,
        source_facts: Some(account_source_facts(provider_id, "native", 1.0)),
        raw_payload: None,
        fetched_at: "2026-06-01T12:00:00Z".to_string(),
    }
}

fn write_account_bound_connection(
    dir: &Path,
    account_settings: Vec<AccountSetting>,
) -> Vec<String> {
    std::fs::create_dir_all(dir).unwrap();
    let local_fingerprints = account_settings
        .iter()
        .map(|account| {
            fingerprint_provider_account(&account.detection, "local", PROVIDER_ACCOUNT_LOCAL_SALT)
        })
        .collect::<Vec<_>>();
    let accounts = account_settings
        .iter()
        .zip(local_fingerprints.iter())
        .map(|(account, local_fingerprint)| {
            json!({
                "providerId": account.detection.provider_id,
                "localAccountFingerprint": local_fingerprint,
                "label": account.label,
                "visibility": account.visibility,
                "identityConfidence": "high",
                "confirmationState": "unconfirmed",
                "firstSeenAt": "2026-06-01T12:00:00.000Z",
                "lastSeenAt": "2026-06-01T12:00:00.000Z",
                "detectionState": account.detection_state,
            })
        })
        .collect::<Vec<_>>();
    let shared_fingerprints = account_settings
        .iter()
        .zip(local_fingerprints.iter())
        .filter_map(|(account, local_fingerprint)| account.shared.then(|| json!(local_fingerprint)))
        .collect::<Vec<_>>();

    std::fs::write(
        dir.join(SETTINGS_FILE_NAME),
        serde_json::to_string_pretty(&json!({
            "teamConnection": {
                "teamUrl": "https://team.example.com",
                "teamName": "Acme Team",
                "teamFingerprint": "team-fingerprint",
                "tokenFingerprint": "abcd1234...wxyz7890",
                "deviceId": "device-1",
                "endpoints": { "usageBatch": "/api/v1/usage/batch" }
            },
            "providerAccountLocalSalt": PROVIDER_ACCOUNT_LOCAL_SALT,
            "providerAccountRegistry": { "accounts": accounts },
            "providerAccountSharing": {
                "teamFingerprint": "team-fingerprint",
                "sharedLocalAccountFingerprints": shared_fingerprints,
            },
        }))
        .unwrap(),
    )
    .unwrap();

    local_fingerprints
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
        "providerAccountId",
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
fn account_bound_outputs_upload_independently_for_shared_accounts() {
    reset_state();
    let dir = temp_dir("shared");
    write_account_bound_connection(
        &dir,
        vec![
            account("codex", "acct-work", "Codex Work", true),
            account("codex", "acct-side", "Codex Side", true),
        ],
    );
    let snapshot = account_bound_snapshot(
        "codex",
        vec![
            account_output("codex", "acct-work", 100.0),
            account_output("codex", "acct-side", 250.0),
        ],
        Vec::new(),
    );

    assert!(enqueue_snapshot_uploads(&dir, &snapshot));

    let state = team_sync_state().lock().unwrap();
    assert_eq!(state.pending.len(), 2);
    let mut uploads = state
        .pending
        .values()
        .map(|pending| serde_json::to_value(&pending.upload).unwrap())
        .collect::<Vec<_>>();
    uploads.sort_by_key(|upload| upload["providerAccountLabel"].as_str().unwrap().to_string());
    assert_eq!(uploads[0]["providerId"], "codex");
    assert_eq!(uploads[0]["providerAccountLabel"], "Codex Side");
    assert_eq!(uploads[0]["summary"]["tokensTotal"], 250.0);
    assert!(uploads[0]["dataIdentity"]
        .as_str()
        .unwrap()
        .starts_with("provider-account:"));
    assert!(uploads[0]["dataIdentity"]
        .as_str()
        .unwrap()
        .contains("eport:codex:acct-side:daily:2026-06-01"));
    assert_eq!(uploads[1]["providerAccountLabel"], "Codex Work");
    assert_eq!(uploads[1]["summary"]["tokensTotal"], 100.0);
    assert!(uploads[1]["dataIdentity"]
        .as_str()
        .unwrap()
        .contains("eport:codex:acct-work:daily:2026-06-01"));
    assert_eq!(
        uploads[0]["providerAccountFingerprint"]
            .as_str()
            .unwrap()
            .len(),
        64
    );
    assert!(!serde_json::to_string(&uploads)
        .unwrap()
        .contains("secret-token"));
}

#[test]
#[serial]
fn hidden_or_unshared_account_bound_outputs_do_not_upload() {
    reset_state();
    let dir = temp_dir("private");
    write_account_bound_connection(
        &dir,
        vec![
            account_with("claude", "acct-hidden", "Claude Hidden", "hidden", true),
            account("claude", "acct-local", "Claude Local", false),
        ],
    );
    let snapshot = account_bound_snapshot(
        "claude",
        vec![
            account_output("claude", "acct-hidden", 100.0),
            account_output("claude", "acct-local", 250.0),
        ],
        Vec::new(),
    );

    assert!(!enqueue_snapshot_uploads(&dir, &snapshot));
    assert!(team_sync_state().lock().unwrap().pending.is_empty());
}

#[test]
#[serial]
fn ambiguous_provider_level_snapshot_still_allows_account_bound_uploads() {
    reset_state();
    let dir = temp_dir("ambiguous-parent");
    let work = account_detection("codex", "acct-work");
    let side = account_detection("codex", "acct-side");
    let local_fingerprints = write_account_bound_connection(
        &dir,
        vec![
            account("codex", "acct-work", "Codex Work", true),
            account("codex", "acct-side", "Codex Side", true),
        ],
    );
    let snapshot = account_bound_snapshot(
        "codex",
        vec![account_output("codex", "acct-side", 250.0)],
        vec![work, side],
    );

    assert!(enqueue_snapshot_uploads(&dir, &snapshot));

    let state = team_sync_state().lock().unwrap();
    assert_eq!(state.pending.len(), 1);
    let pending = state.pending.values().next().unwrap();
    assert_eq!(pending.local_account_fingerprint, local_fingerprints[1]);
    let upload = serde_json::to_value(&pending.upload).unwrap();
    assert_eq!(upload["providerAccountLabel"], "Codex Side");
    assert!(upload["dataIdentity"]
        .as_str()
        .unwrap()
        .contains("eport:codex:acct-side:daily:2026-06-01"));
}

#[test]
#[serial]
fn repeated_account_bound_upload_replaces_pending_provider() {
    reset_state();
    let dir = temp_dir("replace");
    write_account_bound_connection(
        &dir,
        vec![account("codex", "acct-work", "Codex Work", true)],
    );
    let first = account_bound_snapshot(
        "codex",
        vec![account_output("codex", "acct-work", 100.0)],
        Vec::new(),
    );
    let second = account_bound_snapshot(
        "codex",
        vec![account_output("codex", "acct-work", 200.0)],
        Vec::new(),
    );

    assert!(enqueue_snapshot_uploads(&dir, &first));
    assert!(!enqueue_snapshot_uploads(&dir, &second));

    let state = team_sync_state().lock().unwrap();
    assert_eq!(state.pending.len(), 1);
    let pending = state.pending.values().next().unwrap();
    assert_eq!(pending.generation, 2);
    let upload = serde_json::to_value(&pending.upload).unwrap();
    assert_eq!(upload["summary"]["tokensTotal"], 200.0);
}
