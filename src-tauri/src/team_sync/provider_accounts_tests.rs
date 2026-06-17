use super::*;
use crate::plugin_engine::provider_account::{
    ProviderAccountIdentityConfidence, ProviderAccountIdentityKind,
};
use crate::plugin_engine::runtime::{MetricLine, ProgressFormat};
use std::path::Path;

const TEAM_FINGERPRINT: &str = "team-fingerprint";

fn temp_dir(label: &str) -> std::path::PathBuf {
    std::env::temp_dir().join(format!(
        "openusage-provider-account-gate-{}-{}",
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

fn write_settings(dir: &Path, account_patch: serde_json::Value, shared: bool) -> String {
    write_settings_for_team(
        dir,
        account_patch,
        shared,
        TEAM_FINGERPRINT,
        TEAM_FINGERPRINT,
    )
}

fn write_settings_for_team(
    dir: &Path,
    account_patch: serde_json::Value,
    shared: bool,
    active_team_fingerprint: &str,
    sharing_team_fingerprint: &str,
) -> String {
    std::fs::create_dir_all(dir).unwrap();
    let local_salt = "desktop-local-salt";
    let local_fingerprint =
        fingerprint_provider_account(&detection(), "local", local_salt).unwrap();
    let shared_fingerprints = if shared {
        serde_json::json!([local_fingerprint])
    } else {
        serde_json::json!([])
    };
    let account = serde_json::json!({
        "providerId": "cursor",
        "localAccountFingerprint": local_fingerprint,
        "label": "Cursor Work",
        "visibility": "visible",
        "identityConfidence": "high",
        "confirmationState": "unconfirmed",
        "firstSeenAt": "2026-06-01T12:00:00.000Z",
        "lastSeenAt": "2026-06-01T12:00:00.000Z",
        "detectionState": "detected",
    });
    let mut account = account.as_object().unwrap().clone();
    for (key, value) in account_patch.as_object().unwrap() {
        account.insert(key.to_string(), value.clone());
    }
    std::fs::write(
        dir.join(SETTINGS_FILE_NAME),
        serde_json::to_string_pretty(&serde_json::json!({
            "teamConnection": { "teamFingerprint": active_team_fingerprint },
            "providerAccountLocalSalt": local_salt,
            "providerAccountRegistry": { "accounts": [serde_json::Value::Object(account)] },
            "providerAccountSharing": {
                "teamFingerprint": sharing_team_fingerprint,
                "sharedLocalAccountFingerprints": shared_fingerprints,
            },
        }))
        .unwrap(),
    )
    .unwrap();
    local_fingerprint
}

#[test]
fn shared_provider_account_requires_local_share_and_visible_detected_account() {
    let dir = temp_dir("shared");
    let local_fingerprint = write_settings(&dir, serde_json::json!({}), true);

    let account =
        shared_provider_account_for_snapshot(&dir, TEAM_FINGERPRINT, &snapshot()).unwrap();

    assert_eq!(account.local_account_fingerprint, local_fingerprint);
    assert_eq!(account.label, "Cursor Work");
    assert_eq!(account.team_account_fingerprint.len(), 64);
    assert_ne!(account.team_account_fingerprint, local_fingerprint);
    assert!(!account.team_account_fingerprint.contains("work"));
    assert!(local_provider_account_is_shareable(
        &dir,
        &local_fingerprint
    ));
}

#[test]
fn label_update_uses_current_detection_and_new_label() {
    let dir = temp_dir("label-update");
    let local_fingerprint = write_settings(&dir, serde_json::json!({}), true);

    let account = shared_provider_account_for_label_update(
        &dir,
        TEAM_FINGERPRINT,
        &snapshot(),
        &local_fingerprint,
        "Cursor Team",
    )
    .unwrap();

    assert_eq!(account.local_account_fingerprint, local_fingerprint);
    assert_eq!(account.label, "Cursor Team");
    assert_eq!(account.team_account_fingerprint.len(), 64);
}

#[test]
fn sharing_consent_is_scoped_to_current_team() {
    let dir = temp_dir("team-scope");
    let local_fingerprint = write_settings_for_team(
        &dir,
        serde_json::json!({}),
        true,
        "team-b-fingerprint",
        "team-a-fingerprint",
    );

    assert!(
        shared_provider_account_for_snapshot(&dir, "team-b-fingerprint", &snapshot()).is_none()
    );
    assert!(!local_provider_account_is_shareable(
        &dir,
        &local_fingerprint
    ));

    let settings = read_settings_value(&dir).unwrap();
    assert_eq!(
        settings["providerAccountRegistry"]["accounts"][0]["label"],
        "Cursor Work"
    );
    assert_eq!(
        settings["providerAccountRegistry"]["accounts"][0]["visibility"],
        "visible"
    );
}

#[test]
fn team_account_fingerprint_differs_per_team() {
    let dir = temp_dir("team-fingerprint");
    let local_fingerprint = write_settings_for_team(
        &dir,
        serde_json::json!({}),
        true,
        "team-a-fingerprint",
        "team-a-fingerprint",
    );
    let team_a =
        shared_provider_account_for_snapshot(&dir, "team-a-fingerprint", &snapshot()).unwrap();

    write_settings_for_team(
        &dir,
        serde_json::json!({}),
        true,
        "team-b-fingerprint",
        "team-b-fingerprint",
    );
    let team_b =
        shared_provider_account_for_snapshot(&dir, "team-b-fingerprint", &snapshot()).unwrap();

    assert_eq!(team_a.local_account_fingerprint, local_fingerprint);
    assert_eq!(team_b.local_account_fingerprint, local_fingerprint);
    assert_ne!(
        team_a.team_account_fingerprint,
        team_b.team_account_fingerprint
    );
}

#[test]
fn unshared_hidden_or_not_detected_accounts_do_not_upload() {
    let dir = temp_dir("unshared");
    write_settings(&dir, serde_json::json!({}), false);
    assert!(shared_provider_account_for_snapshot(&dir, TEAM_FINGERPRINT, &snapshot()).is_none());

    let dir = temp_dir("hidden");
    write_settings(&dir, serde_json::json!({ "visibility": "hidden" }), true);
    assert!(shared_provider_account_for_snapshot(&dir, TEAM_FINGERPRINT, &snapshot()).is_none());

    let dir = temp_dir("missing");
    write_settings(
        &dir,
        serde_json::json!({ "detectionState": "notDetected" }),
        true,
    );
    assert!(shared_provider_account_for_snapshot(&dir, TEAM_FINGERPRINT, &snapshot()).is_none());
}
