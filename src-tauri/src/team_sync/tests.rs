use super::*;
use crate::plugin_engine::runtime::{MetricLine, ProgressFormat};
use payload::build_provider_upload;
use serde_json::{Value, json};
use serial_test::serial;
use settings::{SETTINGS_FILE_NAME, load_connection};
use std::sync::{Arc, Mutex};

fn temp_dir(label: &str) -> PathBuf {
    std::env::temp_dir().join(format!(
        "openusage-team-sync-{}-{}",
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

fn write_connection(dir: &Path) {
    std::fs::create_dir_all(dir).unwrap();
    std::fs::write(
        dir.join(SETTINGS_FILE_NAME),
        serde_json::to_string_pretty(&json!({
            "themeMode": "system",
            "teamConnection": {
                "teamUrl": "https://team.example.com",
                "teamName": "Acme Team",
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
            }
        }))
        .unwrap(),
    )
    .unwrap();
}

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
        source_facts: None,
        raw_payload: None,
        fetched_at: "2026-06-01T12:00:00Z".to_string(),
    }
}

fn read_settings(dir: &Path) -> Value {
    serde_json::from_str(&std::fs::read_to_string(dir.join(SETTINGS_FILE_NAME)).unwrap()).unwrap()
}

#[test]
#[serial]
fn repeated_updates_replace_same_pending_provider() {
    reset_state();
    let dir = temp_dir("replace");
    write_connection(&dir);

    let connection = load_connection(&dir).unwrap();
    let first = build_provider_upload(&make_snapshot("cursor", 10.0));
    let second = build_provider_upload(&make_snapshot("cursor", 20.0));
    assert!(enqueue_provider_upload(
        dir.clone(),
        connection_key(&connection),
        first
    ));
    assert!(!enqueue_provider_upload(
        dir,
        connection_key(&connection),
        second
    ));

    let state = team_sync_state().lock().unwrap();
    assert_eq!(state.pending.len(), 1);
    assert_eq!(state.pending["cursor"].upload.provider_id, "cursor");
    assert_eq!(state.pending["cursor"].generation, 2);
}

#[test]
fn upload_wait_uses_debounce_until_hard_deadline() {
    assert_eq!(
        next_upload_wait(
            TEAM_SYNC_DEBOUNCE_WINDOW,
            TEAM_SYNC_MAX_PENDING_AGE,
            Duration::from_secs(45)
        ),
        TEAM_SYNC_DEBOUNCE_WINDOW
    );

    assert_eq!(
        next_upload_wait(
            TEAM_SYNC_DEBOUNCE_WINDOW,
            TEAM_SYNC_MAX_PENDING_AGE,
            Duration::from_secs(58)
        ),
        Duration::from_secs(2)
    );
}

#[test]
fn hard_deadline_uploads_even_when_generation_keeps_changing() {
    assert!(!should_upload_after_wait(
        1,
        2,
        Duration::from_secs(45),
        TEAM_SYNC_MAX_PENDING_AGE
    ));

    assert!(should_upload_after_wait(
        1,
        2,
        TEAM_SYNC_MAX_PENDING_AGE,
        TEAM_SYNC_MAX_PENDING_AGE
    ));
}

#[test]
fn quiet_debounce_still_uploads_before_hard_deadline() {
    assert!(should_upload_after_wait(
        2,
        2,
        TEAM_SYNC_DEBOUNCE_WINDOW,
        TEAM_SYNC_MAX_PENDING_AGE
    ));
}

#[test]
#[serial]
fn retryable_failure_keeps_pending_batch_in_memory() {
    reset_state();
    let dir = temp_dir("retry");
    write_connection(&dir);
    let connection = load_connection(&dir).unwrap();
    enqueue_provider_upload(
        dir.clone(),
        connection_key(&connection),
        build_provider_upload(&make_snapshot("cursor", 10.0)),
    );

    let attempt = upload_pending_once_with(
        Duration::from_millis(20),
        || Ok(Some("eusage_dev_secret".to_string())),
        |_connection, _token, _batch, _timeout| TeamUploadResult::Retryable {
            message: "offline".to_string(),
        },
        || Ok(()),
    );

    assert_eq!(attempt, TeamSyncAttempt::RetryableFailure);
    assert_eq!(team_sync_state().lock().unwrap().pending.len(), 1);
    let settings = read_settings(&dir);
    assert_eq!(settings["teamConnection"]["syncStatus"], "error");
    assert_eq!(settings["teamConnection"]["lastError"], "offline");
}

#[test]
#[serial]
fn partial_acceptance_response_clears_sent_providers() {
    reset_state();
    let dir = temp_dir("partial");
    write_connection(&dir);
    let connection = load_connection(&dir).unwrap();
    enqueue_provider_upload(
        dir.clone(),
        connection_key(&connection),
        build_provider_upload(&make_snapshot("cursor", 10.0)),
    );
    enqueue_provider_upload(
        dir.clone(),
        connection_key(&connection),
        build_provider_upload(&make_snapshot("broken", 10.0)),
    );

    let attempt = upload_pending_once_with(
        Duration::from_millis(20),
        || Ok(Some("eusage_dev_secret".to_string())),
        |_connection, _token, batch, _timeout| {
            assert_eq!(batch.providers.len(), 2);
            TeamUploadResult::Success {
                accepted_count: 1,
                rejected_provider_ids: vec!["broken".to_string()],
                server_time: "2026-06-01T12:30:00.000Z".to_string(),
            }
        },
        || Ok(()),
    );

    assert_eq!(attempt, TeamSyncAttempt::Sent);
    assert!(team_sync_state().lock().unwrap().pending.is_empty());
    let settings = read_settings(&dir);
    assert_eq!(settings["teamConnection"]["syncStatus"], "connected");
    assert_eq!(
        settings["teamConnection"]["lastContactAt"],
        "2026-06-01T12:30:00.000Z"
    );
    assert!(settings["teamConnection"]["lastError"].is_null());
}

#[test]
#[serial]
fn invalid_token_clears_team_connection_and_pending_uploads() {
    reset_state();
    let dir = temp_dir("invalid");
    write_connection(&dir);
    let connection = load_connection(&dir).unwrap();
    enqueue_provider_upload(
        dir.clone(),
        connection_key(&connection),
        build_provider_upload(&make_snapshot("cursor", 10.0)),
    );
    let deleted = Arc::new(Mutex::new(false));
    let deleted_for_closure = Arc::clone(&deleted);

    let attempt = upload_pending_once_with(
        Duration::from_millis(20),
        || Ok(Some("eusage_dev_secret".to_string())),
        |_connection, _token, _batch, _timeout| TeamUploadResult::InvalidToken {
            message: "Developer token is revoked.".to_string(),
        },
        || {
            *deleted_for_closure.lock().unwrap() = true;
            Ok(())
        },
    );

    assert_eq!(attempt, TeamSyncAttempt::InvalidToken);
    assert!(*deleted.lock().unwrap());
    assert!(team_sync_state().lock().unwrap().pending.is_empty());
    let settings = read_settings(&dir);
    assert!(settings.get("teamConnection").is_none());
    assert_eq!(settings["themeMode"], "system");
}

#[test]
#[serial]
fn quit_flush_uses_bounded_timeout() {
    reset_state();
    let dir = temp_dir("timeout");
    write_connection(&dir);
    let connection = load_connection(&dir).unwrap();
    enqueue_provider_upload(
        dir,
        connection_key(&connection),
        build_provider_upload(&make_snapshot("cursor", 10.0)),
    );

    let seen_timeout = Arc::new(Mutex::new(None));
    let seen_timeout_for_closure = Arc::clone(&seen_timeout);
    let attempt = upload_pending_once_with(
        QUIT_FLUSH_TIMEOUT,
        || Ok(Some("eusage_dev_secret".to_string())),
        move |_connection, _token, _batch, timeout| {
            *seen_timeout_for_closure.lock().unwrap() = Some(timeout);
            TeamUploadResult::Success {
                accepted_count: 1,
                rejected_provider_ids: vec![],
                server_time: "2026-06-01T12:30:00.000Z".to_string(),
            }
        },
        || Ok(()),
    );

    assert_eq!(attempt, TeamSyncAttempt::Sent);
    assert_eq!(*seen_timeout.lock().unwrap(), Some(QUIT_FLUSH_TIMEOUT));
}
