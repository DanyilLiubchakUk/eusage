use super::payload::build_provider_upload;
use super::provider_accounts::shared_provider_account_for_label_update;
use super::settings::{connection_key, load_connection, valid_connection};
use crate::local_http_api::cache::CachedPluginSnapshot;
use std::path::Path;
use std::time::Duration;

pub(crate) fn upload_current_shared_provider_account_data(
    app_data_dir: &Path,
    provider_id: &str,
    local_account_fingerprint: &str,
    label: &str,
) -> Result<(), String> {
    let should_start_worker = enqueue_current_shared_provider_account_data_with(
        app_data_dir,
        provider_id,
        local_account_fingerprint,
        label,
        crate::local_http_api::cached_snapshot,
    )?;

    if should_start_worker {
        std::thread::spawn(move || super::debounced_upload_worker(Duration::ZERO));
    }

    Ok(())
}

fn enqueue_current_shared_provider_account_data_with<R>(
    app_data_dir: &Path,
    provider_id: &str,
    local_account_fingerprint: &str,
    label: &str,
    read_cached_snapshot: R,
) -> Result<bool, String>
where
    R: Fn(&str) -> Option<CachedPluginSnapshot>,
{
    let provider_id = provider_id.trim();
    if provider_id.is_empty() {
        return Err("Provider ID is required.".to_string());
    }

    let local_account_fingerprint = local_account_fingerprint.trim();
    if local_account_fingerprint.is_empty() {
        return Err("Provider Account fingerprint is required.".to_string());
    }

    let label = label.trim();
    if label.is_empty() {
        return Err("Provider Account label is required.".to_string());
    }

    let Some(connection) = load_connection(app_data_dir) else {
        return Ok(false);
    };
    if !valid_connection(&connection) {
        return Err("Saved Team connection is incomplete.".to_string());
    }

    let Some(snapshot) = read_cached_snapshot(provider_id) else {
        return Ok(false);
    };
    let shared_account = match shared_provider_account_for_label_update(
        app_data_dir,
        &connection.team_fingerprint,
        &snapshot,
        local_account_fingerprint,
        label,
    ) {
        Ok(account) => account,
        Err(error) => {
            log::debug!("current Provider Account upload skipped: {}", error);
            return Ok(false);
        }
    };

    let provider = build_provider_upload(&snapshot).attach_provider_account(
        &shared_account.team_account_fingerprint,
        &shared_account.label,
    );

    Ok(super::enqueue_provider_upload(
        app_data_dir.to_path_buf(),
        connection_key(&connection),
        shared_account.local_account_fingerprint,
        provider,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::plugin_engine::provider_account::{
        ProviderAccountIdentityConfidence, ProviderAccountIdentityKind,
    };
    use crate::plugin_engine::runtime::{MetricLine, ProgressFormat, ProviderAccountDetection};
    use serde_json::json;
    use sha2::{Digest, Sha256};

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
            source_facts: None,
            raw_payload: None,
            fetched_at: "2026-06-01T12:00:00Z".to_string(),
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
    fn queues_current_cached_provider_data_for_shared_account() {
        reset_state();
        let dir = temp_dir("shared");
        let local_fingerprint = write_settings(&dir, true);

        let should_start = enqueue_current_shared_provider_account_data_with(
            &dir,
            "cursor",
            &local_fingerprint,
            "Cursor Work",
            |_| Some(snapshot()),
        )
        .unwrap();

        assert!(should_start);
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
    fn missing_current_cached_provider_data_waits_for_next_probe() {
        reset_state();
        let dir = temp_dir("missing-cache");
        let local_fingerprint = write_settings(&dir, true);

        let should_start = enqueue_current_shared_provider_account_data_with(
            &dir,
            "cursor",
            &local_fingerprint,
            "Cursor Work",
            |_| None,
        )
        .unwrap();

        assert!(!should_start);
        assert!(super::super::team_sync_state()
            .lock()
            .unwrap()
            .pending
            .is_empty());
    }

    #[test]
    fn unshared_account_does_not_queue_current_data() {
        reset_state();
        let dir = temp_dir("unshared");
        let local_fingerprint = write_settings(&dir, false);

        let should_start = enqueue_current_shared_provider_account_data_with(
            &dir,
            "cursor",
            &local_fingerprint,
            "Cursor Work",
            |_| Some(snapshot()),
        )
        .unwrap();

        assert!(!should_start);
        assert!(super::super::team_sync_state()
            .lock()
            .unwrap()
            .pending
            .is_empty());
    }
}
