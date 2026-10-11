use super::provider_accounts::local_provider_account_is_shareable;
use super::settings::read_connection_with_token;
use super::*;

pub(super) fn prepare_pending_upload<R>(
    worker_connection_key: Option<&str>,
    read_team_token: &R,
) -> Option<PendingUpload>
where
    R: Fn() -> Result<Option<String>, String>,
{
    prepare_pending_upload_with(worker_connection_key, read_team_token, || {})
}

pub(super) fn prepare_pending_upload_with<R>(
    worker_connection_key: Option<&str>,
    read_team_token: &R,
    before_snapshot: impl FnOnce(),
) -> Option<PendingUpload>
where
    R: Fn() -> Result<Option<String>, String>,
{
    let (app_data_dir, expected_connection_key, mut sent_providers, mut providers) = {
        let mut state = team_sync_state().lock().expect("team sync state poisoned");
        // A sleeping worker from before reconnect cannot claim the replacement queue.
        if worker_connection_key.is_some_and(|key| state.connection_key.as_deref() != Some(key)) {
            return None;
        }
        if state.pending.is_empty() {
            state.upload_scheduled = false;
            return None;
        }
        let mut sent = Vec::with_capacity(state.pending.len());
        let mut providers = Vec::with_capacity(state.pending.len());
        for (key, pending) in &state.pending {
            sent.push(SentProvider {
                upload_key: key.clone(),
                generation: pending.generation,
                local_account_fingerprint: pending.local_account_fingerprint.clone(),
            });
            providers.push(pending.upload.clone());
        }
        (
            state.app_data_dir.clone(),
            state.connection_key.clone(),
            sent,
            providers,
        )
    };

    before_snapshot();
    let snapshot =
        read_connection_with_token(&app_data_dir, expected_connection_key.as_deref(), || {
            // Consent and the connection/token pair share one cancellation boundary.
            let mut dropped = Vec::new();
            for index in (0..sent_providers.len()).rev() {
                if !local_provider_account_is_shareable(
                    &app_data_dir,
                    &sent_providers[index].local_account_fingerprint,
                ) {
                    dropped.push(sent_providers.remove(index));
                    providers.remove(index);
                }
            }
            if !dropped.is_empty() {
                let mut state = team_sync_state().lock().expect("team sync state poisoned");
                if state.connection_key == expected_connection_key {
                    for sent in dropped {
                        if state
                            .pending
                            .get(&sent.upload_key)
                            .is_some_and(|pending| pending.generation == sent.generation)
                        {
                            state.pending.remove(&sent.upload_key);
                        }
                    }
                }
            }
            if providers.is_empty() {
                return Ok(None);
            }
            read_team_token()
        });
    let (connection, token) = match snapshot {
        Ok(Some(snapshot)) => snapshot,
        Ok(None) => {
            drop_pending_if_connection_matches(expected_connection_key.as_deref());
            return None;
        }
        Err(_) if providers.is_empty() => {
            mark_upload_finished(expected_connection_key.as_deref(), true);
            return None;
        }
        Err(error) => {
            if let Some(connection) = load_connection(&app_data_dir) {
                if expected_connection_key.as_deref() == Some(connection_key(&connection).as_str())
                {
                    mark_connection_error(&app_data_dir, &connection, &error);
                }
            }
            mark_upload_finished(expected_connection_key.as_deref(), false);
            return None;
        }
    };
    Some(PendingUpload {
        app_data_dir,
        batch: TeamUsageBatch {
            upload_schema_version: UPLOAD_SCHEMA_VERSION,
            device_id: connection.device_id.clone(),
            providers,
        },
        connection,
        token,
        sent_providers,
    })
}
