use super::*;

#[test]
#[serial]
fn sleeping_old_worker_cannot_send_reconnected_queue() {
    use std::sync::{
        atomic::{AtomicUsize, Ordering},
        mpsc,
    };
    reset_state();
    let dir = temp_dir("sleeping-worker");
    write_connection(&dir);
    let old_key = connection_key(&load_connection(&dir).unwrap());
    assert!(enqueue_provider_upload(
        dir.clone(),
        old_key.clone(),
        LOCAL_ACCOUNT_FINGERPRINT.to_string(),
        build_provider_upload(&make_snapshot("cursor", 10.0)),
    ));
    let sends = Arc::new(AtomicUsize::new(0));
    let old_sends = sends.clone();
    let (wake_old, old_woken) = mpsc::channel();
    let old_worker = std::thread::spawn(move || {
        old_woken.recv_timeout(Duration::from_secs(5)).unwrap();
        upload_pending_once_with(
            Some(&old_key),
            Duration::from_millis(20),
            || Ok(Some("eusage_dev_secret".to_string())),
            |_, _, _, _| {
                old_sends.fetch_add(1, Ordering::SeqCst);
                TeamUploadResult::Retryable {
                    message: "stale worker sent".to_string(),
                }
            },
            || panic!("stale worker cannot delete credentials"),
        )
    });

    let mut saved = read_settings(&dir);
    saved["teamConnection"]["connectionId"] = json!("replacement");
    saved["providerAccountSharing"]["connectionId"] = json!("replacement");
    crate::app_settings::set_test_settings(&dir, saved);
    let new_key = connection_key(&load_connection(&dir).unwrap());
    assert!(enqueue_provider_upload(
        dir.clone(),
        new_key.clone(),
        LOCAL_ACCOUNT_FINGERPRINT.to_string(),
        build_provider_upload(&make_snapshot("cursor", 20.0)),
    ));
    let new_sends = sends.clone();
    let (sending, sent) = mpsc::channel();
    let (finish, finished) = mpsc::channel();
    let new_worker = std::thread::spawn(move || {
        upload_pending_once_with(
            Some(&new_key),
            Duration::from_millis(20),
            || Ok(Some("eusage_dev_secret".to_string())),
            |connection, _, batch, _| {
                assert_eq!(connection.connection_id.as_deref(), Some("replacement"));
                assert_eq!(batch.providers.len(), 1);
                new_sends.fetch_add(1, Ordering::SeqCst);
                sending.send(()).unwrap();
                finished.recv_timeout(Duration::from_secs(5)).unwrap();
                TeamUploadResult::Success {
                    server_time: "new-time".to_string(),
                    accepted_count: 1,
                    rejected_provider_ids: Vec::new(),
                }
            },
            || panic!("successful worker cannot delete credentials"),
        )
    });
    sent.recv_timeout(Duration::from_secs(5)).unwrap();
    wake_old.send(()).unwrap();
    assert_eq!(old_worker.join().unwrap(), TeamSyncAttempt::Idle);
    assert!(team_sync_state().lock().unwrap().upload_scheduled);
    assert_eq!(sends.load(Ordering::SeqCst), 1);
    finish.send(()).unwrap();
    assert_eq!(new_worker.join().unwrap(), TeamSyncAttempt::Sent);
    let state = team_sync_state().lock().unwrap();
    assert!(state.pending.is_empty());
    assert!(!state.upload_scheduled);
}

#[test]
#[serial]
fn unsharing_between_queue_snapshot_and_token_snapshot_cancels_upload() {
    reset_state();
    let dir = temp_dir("sharing-boundary");
    write_connection(&dir);
    let connection = load_connection(&dir).unwrap();
    enqueue_provider_upload(
        dir.clone(),
        connection_key(&connection),
        LOCAL_ACCOUNT_FINGERPRINT.to_string(),
        build_provider_upload(&make_snapshot("cursor", 10.0)),
    );
    let upload = super::super::pending_upload::prepare_pending_upload_with(
        None,
        &|| panic!("withdrawn consent must cancel before reading credentials"),
        || {
            assert!(
                crate::team_settings_store::save_sharing(
                    &dir,
                    json!({"sharedLocalAccountFingerprints": []}),
                    None
                )
                .unwrap()
            );
        },
    );
    assert!(upload.is_none());
    assert!(team_sync_state().lock().unwrap().pending.is_empty());
    assert_eq!(read_settings(&dir)["teamConnection"]["syncStatus"], "never");
}

#[test]
#[serial]
fn mismatched_vault_token_never_reaches_sender() {
    reset_state();
    let dir = temp_dir("token-binding");
    write_connection(&dir);
    let connection = load_connection(&dir).unwrap();
    enqueue_provider_upload(
        dir.clone(),
        connection_key(&connection),
        LOCAL_ACCOUNT_FINGERPRINT.to_string(),
        build_provider_upload(&make_snapshot("cursor", 10.0)),
    );
    let attempt = upload_pending_once_with(
        None,
        Duration::from_millis(20),
        || Ok(Some("other-team-token".to_string())),
        |_, _, _, _| panic!("mismatched token must never be sent"),
        || panic!("mismatch must not delete credentials"),
    );
    assert_eq!(attempt, TeamSyncAttempt::Idle);
    assert_eq!(read_settings(&dir)["teamConnection"]["syncStatus"], "error");
}

#[test]
#[serial]
fn stale_invalid_token_response_keeps_reconnected_settings_token_and_queue() {
    reset_state();
    let dir = temp_dir("stale-invalid");
    write_connection(&dir);
    let original = load_connection(&dir).unwrap();
    enqueue_provider_upload(
        dir.clone(),
        connection_key(&original),
        LOCAL_ACCOUNT_FINGERPRINT.to_string(),
        build_provider_upload(&make_snapshot("cursor", 10.0)),
    );
    let attempt = upload_pending_once_with(
        None,
        Duration::from_millis(20),
        || Ok(Some("eusage_dev_secret".to_string())),
        |_connection, _token, _batch, _timeout| {
            let mut settings = read_settings(&dir);
            settings["teamConnection"]["connectionId"] = json!("new-connection");
            crate::app_settings::set_test_settings(&dir, settings);
            let replacement = load_connection(&dir).unwrap();
            assert!(enqueue_provider_upload(
                dir.clone(),
                connection_key(&replacement),
                LOCAL_ACCOUNT_FINGERPRINT.to_string(),
                build_provider_upload(&make_snapshot("codex", 20.0))
            ));
            TeamUploadResult::InvalidToken {
                message: "old token expired".to_string(),
            }
        },
        || panic!("old response must not delete the replacement token"),
    );
    assert_eq!(attempt, TeamSyncAttempt::InvalidToken);
    assert_eq!(
        read_settings(&dir)["teamConnection"]["connectionId"],
        "new-connection"
    );
    assert!(read_settings(&dir).get("providerAccountSharing").is_some());
    let state = team_sync_state().lock().unwrap();
    assert_eq!(state.pending.len(), 1);
    assert!(
        state
            .pending
            .values()
            .all(|pending| pending.upload.provider_id == "codex")
    );
    assert!(state.upload_scheduled);
}

#[test]
#[serial]
fn stale_success_and_error_do_not_change_reconnected_status() {
    for retryable in [false, true] {
        reset_state();
        let dir = temp_dir("stale-status");
        write_connection(&dir);
        let original = load_connection(&dir).unwrap();
        enqueue_provider_upload(
            dir.clone(),
            connection_key(&original),
            LOCAL_ACCOUNT_FINGERPRINT.to_string(),
            build_provider_upload(&make_snapshot("cursor", 10.0)),
        );
        upload_pending_once_with(
            None,
            Duration::from_millis(20),
            || Ok(Some("eusage_dev_secret".to_string())),
            |_connection, _token, _batch, _timeout| {
                let mut settings = read_settings(&dir);
                settings["teamConnection"]["connectionId"] = json!("new-connection");
                crate::app_settings::set_test_settings(&dir, settings);
                if retryable {
                    TeamUploadResult::Retryable {
                        message: "old error".to_string(),
                    }
                } else {
                    TeamUploadResult::Success {
                        server_time: "old-time".to_string(),
                        accepted_count: 1,
                        rejected_provider_ids: Vec::new(),
                    }
                }
            },
            || panic!("status result must not delete credentials"),
        );
        assert_eq!(read_settings(&dir)["teamConnection"]["syncStatus"], "never");
        assert!(read_settings(&dir)["teamConnection"]["lastContactAt"].is_null());
    }
}

#[test]
#[serial]
fn late_enqueue_cannot_replace_new_connection_queue() {
    reset_state();
    let dir = temp_dir("stale-enqueue");
    write_connection(&dir);
    let original = load_connection(&dir).unwrap();
    let mut saved = read_settings(&dir);
    saved["teamConnection"]["connectionId"] = json!("new");
    crate::app_settings::set_test_settings(&dir, saved);
    let current = load_connection(&dir).unwrap();
    assert!(enqueue_provider_upload(
        dir.clone(),
        connection_key(&current),
        LOCAL_ACCOUNT_FINGERPRINT.to_string(),
        build_provider_upload(&make_snapshot("codex", 20.0))
    ));
    assert!(!enqueue_provider_upload(
        dir,
        connection_key(&original),
        LOCAL_ACCOUNT_FINGERPRINT.to_string(),
        build_provider_upload(&make_snapshot("cursor", 10.0))
    ));
    let state = team_sync_state().lock().unwrap();
    assert_eq!(
        state.connection_key.as_deref(),
        Some(connection_key(&current).as_str())
    );
    assert_eq!(state.pending.len(), 1);
    assert!(
        state
            .pending
            .values()
            .all(|pending| pending.upload.provider_id == "codex")
    );
}
