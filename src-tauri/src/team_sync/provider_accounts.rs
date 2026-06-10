use crate::local_http_api::cache::CachedPluginSnapshot;
use crate::plugin_engine::runtime::ProviderAccountDetection;
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::path::Path;

const SETTINGS_FILE_NAME: &str = "settings.json";
const REGISTRY_KEY: &str = "providerAccountRegistry";
const SHARING_KEY: &str = "providerAccountSharing";
const LOCAL_SALT_KEY: &str = "providerAccountLocalSalt";

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct SharedProviderAccount {
    pub local_account_fingerprint: String,
    pub team_account_fingerprint: String,
    pub label: String,
}

pub(super) fn shared_provider_account_for_snapshot(
    app_data_dir: &Path,
    team_fingerprint: &str,
    snapshot: &CachedPluginSnapshot,
) -> Option<SharedProviderAccount> {
    let settings = read_settings_value(app_data_dir)?;
    let local_salt = string_field(settings.get(LOCAL_SALT_KEY))?;
    let shared_fingerprints = shared_local_account_fingerprints(&settings);
    if shared_fingerprints.is_empty() {
        return None;
    }
    let shareable_accounts = shareable_local_accounts(&settings);
    if shareable_accounts.is_empty() {
        return None;
    }

    let mut matches = snapshot
        .provider_account_detections
        .iter()
        .filter(|detection| detection.provider_id.trim() == snapshot.provider_id)
        .filter_map(|detection| {
            let local_fingerprint =
                fingerprint_provider_account(detection, "local", local_salt.as_str())?;
            if !shared_fingerprints.contains(&local_fingerprint) {
                return None;
            }
            let label = shareable_accounts.get(&local_fingerprint)?.clone();
            let team_fingerprint =
                fingerprint_provider_account(detection, "team", team_fingerprint)?;
            Some(SharedProviderAccount {
                local_account_fingerprint: local_fingerprint,
                team_account_fingerprint: team_fingerprint,
                label,
            })
        })
        .collect::<Vec<_>>();

    matches.dedup_by(|a, b| {
        a.local_account_fingerprint == b.local_account_fingerprint
            && a.team_account_fingerprint == b.team_account_fingerprint
    });

    match matches.as_slice() {
        [account] => Some(account.clone()),
        [] => None,
        _ => {
            log::warn!(
                "team sync skipped {}: multiple shared provider accounts matched one snapshot",
                snapshot.provider_id
            );
            None
        }
    }
}

pub(super) fn local_provider_account_is_shareable(
    app_data_dir: &Path,
    local_account_fingerprint: &str,
) -> bool {
    let Some(settings) = read_settings_value(app_data_dir) else {
        return false;
    };
    let local_account_fingerprint = local_account_fingerprint.trim();
    !local_account_fingerprint.is_empty()
        && shared_local_account_fingerprints(&settings).contains(local_account_fingerprint)
        && shareable_local_accounts(&settings).contains_key(local_account_fingerprint)
}

fn read_settings_value(app_data_dir: &Path) -> Option<serde_json::Value> {
    let data = std::fs::read_to_string(app_data_dir.join(SETTINGS_FILE_NAME)).ok()?;
    serde_json::from_str::<serde_json::Value>(&data).ok()
}

fn shared_local_account_fingerprints(settings: &serde_json::Value) -> HashSet<String> {
    settings
        .get(SHARING_KEY)
        .and_then(|value| value.get("sharedLocalAccountFingerprints"))
        .and_then(serde_json::Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(|item| string_field(Some(item)))
                .collect::<HashSet<_>>()
        })
        .unwrap_or_default()
}

fn shareable_local_accounts(settings: &serde_json::Value) -> HashMap<String, String> {
    settings
        .get(REGISTRY_KEY)
        .and_then(|value| value.get("accounts"))
        .and_then(serde_json::Value::as_array)
        .map(|accounts| {
            accounts
                .iter()
                .filter(|account| {
                    string_field(account.get("visibility")).as_deref() == Some("visible")
                })
                .filter(|account| {
                    string_field(account.get("detectionState")).as_deref() == Some("detected")
                })
                .filter_map(|account| {
                    Some((
                        string_field(account.get("localAccountFingerprint"))?,
                        string_field(account.get("label"))?,
                    ))
                })
                .collect::<HashMap<_, _>>()
        })
        .unwrap_or_default()
}

fn fingerprint_provider_account(
    detection: &ProviderAccountDetection,
    scope: &str,
    scope_secret: &str,
) -> Option<String> {
    let provider_id = detection.provider_id.trim();
    let identity_value = detection.identity_value.trim();
    let scope_secret = scope_secret.trim();
    if provider_id.is_empty() || identity_value.is_empty() || scope_secret.is_empty() {
        return None;
    }

    let value = [
        "provider-account-fingerprint:v1",
        scope,
        provider_id,
        identity_kind(detection),
        identity_value,
        scope_secret,
    ]
    .join("\0");
    Some(sha256_hex(value.as_bytes()))
}

fn identity_kind(detection: &ProviderAccountDetection) -> &'static str {
    use crate::plugin_engine::provider_account::ProviderAccountIdentityKind;

    match detection.identity_kind {
        ProviderAccountIdentityKind::ProviderAccountId => "providerAccountId",
        ProviderAccountIdentityKind::ProviderEmail => "providerEmail",
        ProviderAccountIdentityKind::ProviderUserId => "providerUserId",
        ProviderAccountIdentityKind::LocalProfilePath => "localProfilePath",
        ProviderAccountIdentityKind::CredentialSource => "credentialSource",
    }
}

fn sha256_hex(value: &[u8]) -> String {
    Sha256::digest(value)
        .iter()
        .map(|byte| format!("{:02x}", byte))
        .collect()
}

fn string_field(value: Option<&serde_json::Value>) -> Option<String> {
    value
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::plugin_engine::provider_account::{
        ProviderAccountIdentityConfidence, ProviderAccountIdentityKind,
    };
    use crate::plugin_engine::runtime::{MetricLine, ProgressFormat};

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
            source_facts: None,
            raw_payload: None,
            fetched_at: "2026-06-01T12:00:00Z".to_string(),
        }
    }

    fn write_settings(dir: &Path, account_patch: serde_json::Value, shared: bool) -> String {
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
                "providerAccountLocalSalt": local_salt,
                "providerAccountRegistry": { "accounts": [serde_json::Value::Object(account)] },
                "providerAccountSharing": { "sharedLocalAccountFingerprints": shared_fingerprints },
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
            shared_provider_account_for_snapshot(&dir, "team-fingerprint", &snapshot()).unwrap();

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
    fn unshared_hidden_or_not_detected_accounts_do_not_upload() {
        let dir = temp_dir("unshared");
        write_settings(&dir, serde_json::json!({}), false);
        assert!(
            shared_provider_account_for_snapshot(&dir, "team-fingerprint", &snapshot()).is_none()
        );

        let dir = temp_dir("hidden");
        write_settings(&dir, serde_json::json!({ "visibility": "hidden" }), true);
        assert!(
            shared_provider_account_for_snapshot(&dir, "team-fingerprint", &snapshot()).is_none()
        );

        let dir = temp_dir("missing");
        write_settings(
            &dir,
            serde_json::json!({ "detectionState": "notDetected" }),
            true,
        );
        assert!(
            shared_provider_account_for_snapshot(&dir, "team-fingerprint", &snapshot()).is_none()
        );
    }
}
