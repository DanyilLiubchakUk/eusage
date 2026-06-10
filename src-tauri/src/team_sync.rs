mod client;
mod payload;
mod provider_accounts;
mod settings;

#[cfg(test)]
mod tests;

use crate::local_http_api::cache::CachedPluginSnapshot;
use client::{TeamUploadResult, send_usage_batch_http};
use payload::{TeamUsageProvider, build_provider_upload};
use provider_accounts::{
    local_provider_account_is_shareable, shared_provider_account_for_snapshot,
};
use serde::Serialize;
use settings::{
    TeamConnectionSettings, clear_team_connection, connection_key, load_connection,
    mark_connection_error, mark_connection_success, valid_connection,
};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

const UPLOAD_SCHEMA_VERSION: &str = "1.0.0";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(5);
const QUIT_FLUSH_TIMEOUT: Duration = Duration::from_secs(3);
pub const TEAM_SYNC_DEBOUNCE_WINDOW: Duration = Duration::from_secs(5);
const TEAM_SYNC_MAX_PENDING_AGE: Duration = Duration::from_secs(60);

#[derive(Debug, Clone)]
struct PendingProvider {
    generation: u64,
    local_account_fingerprint: String,
    upload: TeamUsageProvider,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TeamUsageBatch {
    upload_schema_version: &'static str,
    device_id: String,
    providers: Vec<TeamUsageProvider>,
}

#[derive(Debug, Clone)]
struct SentProvider {
    upload_key: String,
    generation: u64,
}

#[derive(Debug, Clone)]
struct PendingUpload {
    app_data_dir: PathBuf,
    connection: TeamConnectionSettings,
    token: String,
    batch: TeamUsageBatch,
    sent_providers: Vec<SentProvider>,
}

#[derive(Debug, Default)]
struct TeamSyncState {
    pending: BTreeMap<String, PendingProvider>,
    app_data_dir: PathBuf,
    connection_key: Option<String>,
    generation: u64,
    upload_scheduled: bool,
}

#[derive(Debug, PartialEq, Eq)]
enum TeamSyncAttempt {
    Idle,
    Sent,
    RetryableFailure,
    InvalidToken,
}

fn team_sync_state() -> &'static Mutex<TeamSyncState> {
    static STATE: OnceLock<Mutex<TeamSyncState>> = OnceLock::new();
    STATE.get_or_init(|| Mutex::new(TeamSyncState::default()))
}

pub fn upload_snapshot(app_data_dir: &Path, snapshot: &CachedPluginSnapshot) {
    enqueue_snapshot_with_debounce(app_data_dir, snapshot, TEAM_SYNC_DEBOUNCE_WINDOW);
}

pub fn flush_pending_uploads() {
    let _ = upload_pending_once_with(
        QUIT_FLUSH_TIMEOUT,
        || crate::team_credentials::read_team_token(),
        send_usage_batch_http,
        || crate::team_credentials::delete_team_token(),
    );
}

fn enqueue_snapshot_with_debounce(
    app_data_dir: &Path,
    snapshot: &CachedPluginSnapshot,
    debounce: Duration,
) {
    let Some(connection) = load_connection(app_data_dir) else {
        return;
    };

    if !valid_connection(&connection) {
        log::warn!("team sync disabled: saved Team connection is incomplete");
        return;
    }

    let Some(shared_account) =
        shared_provider_account_for_snapshot(app_data_dir, &connection.team_fingerprint, snapshot)
    else {
        return;
    };
    let provider = build_provider_upload(snapshot).attach_provider_account(
        &shared_account.team_account_fingerprint,
        &shared_account.label,
    );
    let should_start_worker = enqueue_provider_upload(
        app_data_dir.to_path_buf(),
        connection_key(&connection),
        shared_account.local_account_fingerprint,
        provider,
    );

    if should_start_worker {
        std::thread::spawn(move || debounced_upload_worker(debounce));
    }
}

fn enqueue_provider_upload(
    app_data_dir: PathBuf,
    connection_key: String,
    local_account_fingerprint: String,
    provider: TeamUsageProvider,
) -> bool {
    let mut state = team_sync_state().lock().expect("team sync state poisoned");
    let next_generation = state.generation.wrapping_add(1);
    let upload_key = provider.upload_key();
    state.generation = next_generation;
    state.app_data_dir = app_data_dir;
    state.connection_key = Some(connection_key);
    state.pending.insert(
        upload_key,
        PendingProvider {
            generation: next_generation,
            local_account_fingerprint,
            upload: provider,
        },
    );

    if state.upload_scheduled {
        false
    } else {
        state.upload_scheduled = true;
        true
    }
}

fn debounced_upload_worker(debounce: Duration) {
    wait_for_upload_window(debounce, TEAM_SYNC_MAX_PENDING_AGE);
    let _ = upload_pending_once_with(
        REQUEST_TIMEOUT,
        || crate::team_credentials::read_team_token(),
        send_usage_batch_http,
        || crate::team_credentials::delete_team_token(),
    );
}

fn wait_for_upload_window(debounce: Duration, max_pending_age: Duration) {
    let started_at = Instant::now();
    loop {
        let generation = {
            team_sync_state()
                .lock()
                .expect("team sync state poisoned")
                .generation
        };
        let elapsed = started_at.elapsed();
        let wait = next_upload_wait(debounce, max_pending_age, elapsed);
        if !wait.is_zero() {
            std::thread::sleep(wait);
        }
        let current_generation = {
            team_sync_state()
                .lock()
                .expect("team sync state poisoned")
                .generation
        };
        if should_upload_after_wait(
            generation,
            current_generation,
            started_at.elapsed(),
            max_pending_age,
        ) {
            return;
        }
    }
}

fn next_upload_wait(debounce: Duration, max_pending_age: Duration, elapsed: Duration) -> Duration {
    max_pending_age
        .checked_sub(elapsed)
        .map(|remaining| remaining.min(debounce))
        .unwrap_or(Duration::ZERO)
}

fn should_upload_after_wait(
    observed_generation: u64,
    current_generation: u64,
    elapsed: Duration,
    max_pending_age: Duration,
) -> bool {
    current_generation == observed_generation || elapsed >= max_pending_age
}

fn upload_pending_once_with<R, F, D>(
    timeout: Duration,
    read_team_token: R,
    send_usage_batch: F,
    delete_team_token: D,
) -> TeamSyncAttempt
where
    R: Fn() -> Result<Option<String>, String>,
    F: Fn(&TeamConnectionSettings, &str, &TeamUsageBatch, Duration) -> TeamUploadResult,
    D: Fn() -> Result<(), String>,
{
    let Some(upload) = prepare_pending_upload(&read_team_token) else {
        return TeamSyncAttempt::Idle;
    };

    match send_usage_batch(&upload.connection, &upload.token, &upload.batch, timeout) {
        TeamUploadResult::Success {
            server_time,
            rejected_provider_ids,
            ..
        } => {
            mark_connection_success(&upload.app_data_dir, &server_time);
            finish_sent_providers(&upload.sent_providers);
            mark_upload_finished(true);
            if !rejected_provider_ids.is_empty() {
                log::warn!(
                    "team sync accepted batch with rejected providers: {:?}",
                    rejected_provider_ids
                );
            }
            TeamSyncAttempt::Sent
        }
        TeamUploadResult::Retryable { message } => {
            mark_connection_error(&upload.app_data_dir, &message);
            mark_upload_finished(false);
            log::warn!("team sync upload failed: {}", message);
            TeamSyncAttempt::RetryableFailure
        }
        TeamUploadResult::InvalidToken { message } => {
            if let Err(error) = delete_team_token() {
                log::warn!("team sync invalid-token cleanup failed: {}", error);
            }
            clear_team_connection(&upload.app_data_dir);
            clear_pending_uploads();
            log::warn!("team sync stopped: {}", message);
            TeamSyncAttempt::InvalidToken
        }
    }
}

fn prepare_pending_upload<R>(read_team_token: &R) -> Option<PendingUpload>
where
    R: Fn() -> Result<Option<String>, String>,
{
    let (app_data_dir, expected_connection_key, sent_providers, providers) = {
        let mut state = team_sync_state().lock().expect("team sync state poisoned");
        if state.pending.is_empty() {
            state.upload_scheduled = false;
            return None;
        }

        let mut sent_providers = Vec::with_capacity(state.pending.len());
        let mut providers = Vec::with_capacity(state.pending.len());
        let mut stale_upload_keys = Vec::new();
        for (upload_key, pending) in state.pending.iter() {
            if !local_provider_account_is_shareable(
                &state.app_data_dir,
                &pending.local_account_fingerprint,
            ) {
                stale_upload_keys.push(upload_key.clone());
                continue;
            }
            sent_providers.push(SentProvider {
                upload_key: upload_key.clone(),
                generation: pending.generation,
            });
            providers.push(pending.upload.clone());
        }
        for upload_key in stale_upload_keys {
            state.pending.remove(&upload_key);
        }
        if providers.is_empty() {
            state.upload_scheduled = false;
            return None;
        }

        (
            state.app_data_dir.clone(),
            state.connection_key.clone(),
            sent_providers,
            providers,
        )
    };

    let Some(connection) = load_connection(&app_data_dir) else {
        drop_pending_if_connection_matches(expected_connection_key.as_deref());
        return None;
    };

    if expected_connection_key.as_deref() != Some(connection_key(&connection).as_str()) {
        drop_pending_if_connection_matches(expected_connection_key.as_deref());
        return None;
    }

    let token = match read_team_token() {
        Ok(Some(token)) if !token.trim().is_empty() => token,
        Ok(_) => {
            mark_connection_error(
                &app_data_dir,
                "Team token is missing. Paste a connection string again.",
            );
            mark_upload_finished(false);
            return None;
        }
        Err(error) => {
            mark_connection_error(&app_data_dir, &error);
            mark_upload_finished(false);
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

fn finish_sent_providers(sent_providers: &[SentProvider]) {
    let mut state = team_sync_state().lock().expect("team sync state poisoned");
    for sent in sent_providers {
        let should_remove = state
            .pending
            .get(&sent.upload_key)
            .map(|current| current.generation == sent.generation)
            .unwrap_or(false);
        if should_remove {
            state.pending.remove(&sent.upload_key);
        }
    }
    state.upload_scheduled = false;
}

fn mark_upload_finished(allow_reschedule: bool) {
    let should_reschedule = {
        let mut state = team_sync_state().lock().expect("team sync state poisoned");
        state.upload_scheduled = false;
        let should_reschedule = allow_reschedule && !state.pending.is_empty();
        if should_reschedule {
            state.upload_scheduled = true;
        }
        should_reschedule
    };

    if should_reschedule {
        std::thread::spawn(move || debounced_upload_worker(TEAM_SYNC_DEBOUNCE_WINDOW));
    }
}

fn clear_pending_uploads() {
    let mut state = team_sync_state().lock().expect("team sync state poisoned");
    state.pending.clear();
    state.upload_scheduled = false;
}

fn drop_pending_if_connection_matches(expected_connection_key: Option<&str>) {
    let mut state = team_sync_state().lock().expect("team sync state poisoned");
    if state.connection_key.as_deref() == expected_connection_key {
        state.pending.clear();
        state.upload_scheduled = false;
    }
}
