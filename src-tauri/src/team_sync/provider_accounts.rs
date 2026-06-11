use crate::local_http_api::cache::CachedPluginSnapshot;
use crate::plugin_engine::runtime::ProviderAccountDetection;
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::path::Path;

const SETTINGS_FILE_NAME: &str = "settings.json";
const TEAM_CONNECTION_KEY: &str = "teamConnection";
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
    let shared_fingerprints = shared_local_account_fingerprints(&settings, team_fingerprint);
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

pub(super) fn shared_provider_account_for_label_update(
    app_data_dir: &Path,
    team_fingerprint: &str,
    snapshot: &CachedPluginSnapshot,
    local_account_fingerprint: &str,
    label: &str,
) -> Result<SharedProviderAccount, String> {
    let local_account_fingerprint = local_account_fingerprint.trim();
    if local_account_fingerprint.is_empty() {
        return Err("Provider Account fingerprint is required.".to_string());
    }
    let label = label.trim();
    if label.is_empty() {
        return Err("Provider Account label is required.".to_string());
    }

    let settings = read_settings_value(app_data_dir)
        .ok_or_else(|| "Provider Account settings are missing.".to_string())?;
    let local_salt = string_field(settings.get(LOCAL_SALT_KEY))
        .ok_or_else(|| "Provider Account local salt is missing.".to_string())?;
    if !shared_local_account_fingerprints(&settings, team_fingerprint)
        .contains(local_account_fingerprint)
    {
        return Err("Provider Account is not shared with team.".to_string());
    }
    if !shareable_local_accounts(&settings).contains_key(local_account_fingerprint) {
        return Err("Provider Account is not shareable.".to_string());
    }

    let mut matches = snapshot
        .provider_account_detections
        .iter()
        .filter(|detection| detection.provider_id.trim() == snapshot.provider_id)
        .filter_map(|detection| {
            let local_fingerprint =
                fingerprint_provider_account(detection, "local", local_salt.as_str())?;
            if local_fingerprint != local_account_fingerprint {
                return None;
            }
            let team_fingerprint =
                fingerprint_provider_account(detection, "team", team_fingerprint)?;
            Some(SharedProviderAccount {
                local_account_fingerprint: local_fingerprint,
                team_account_fingerprint: team_fingerprint,
                label: label.to_string(),
            })
        })
        .collect::<Vec<_>>();

    matches.dedup_by(|a, b| {
        a.local_account_fingerprint == b.local_account_fingerprint
            && a.team_account_fingerprint == b.team_account_fingerprint
    });

    match matches.as_slice() {
        [account] => Ok(account.clone()),
        [] => Err(
            "Shared Provider Account needs a fresh provider scan before updating Team metadata."
                .to_string(),
        ),
        _ => Err("Multiple Provider Account detections matched the shared account.".to_string()),
    }
}

pub(super) fn local_provider_account_is_shareable(
    app_data_dir: &Path,
    local_account_fingerprint: &str,
) -> bool {
    let Some(settings) = read_settings_value(app_data_dir) else {
        return false;
    };
    let Some(team_fingerprint) = current_team_fingerprint(&settings) else {
        return false;
    };
    let local_account_fingerprint = local_account_fingerprint.trim();
    !local_account_fingerprint.is_empty()
        && shared_local_account_fingerprints(&settings, &team_fingerprint)
            .contains(local_account_fingerprint)
        && shareable_local_accounts(&settings).contains_key(local_account_fingerprint)
}

fn read_settings_value(app_data_dir: &Path) -> Option<serde_json::Value> {
    let data = std::fs::read_to_string(app_data_dir.join(SETTINGS_FILE_NAME)).ok()?;
    serde_json::from_str::<serde_json::Value>(&data).ok()
}

fn current_team_fingerprint(settings: &serde_json::Value) -> Option<String> {
    settings
        .get(TEAM_CONNECTION_KEY)
        .and_then(|value| string_field(value.get("teamFingerprint")))
}

fn shared_local_account_fingerprints(
    settings: &serde_json::Value,
    team_fingerprint: &str,
) -> HashSet<String> {
    let active_team_fingerprint = team_fingerprint.trim();
    if active_team_fingerprint.is_empty() {
        return HashSet::new();
    }
    settings
        .get(SHARING_KEY)
        .filter(|value| {
            string_field(value.get("teamFingerprint")).as_deref() == Some(active_team_fingerprint)
        })
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
#[path = "provider_accounts_tests.rs"]
mod tests;
