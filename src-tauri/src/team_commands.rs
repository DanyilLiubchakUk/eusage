use crate::{AppState, app_settings, team_credentials, team_settings_store, team_sync};
use serde_json::Value;
use std::sync::Mutex;

// Credential prompts and blocking HTTP requests must not run on the UI thread.
async fn run_blocking<T: Send + 'static>(
    operation: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(operation)
        .await
        .map_err(|error| format!("Team operation failed: {error}"))?
}

#[tauri::command]
pub async fn read_team_settings(state: tauri::State<'_, Mutex<AppState>>) -> Result<Value, String> {
    let path = state
        .lock()
        .map_err(|error| error.to_string())?
        .app_data_dir
        .clone();
    run_blocking(move || team_settings_store::read_team_settings(&path)).await
}

#[tauri::command]
pub async fn read_team_token(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<Option<String>, String> {
    let path = state
        .lock()
        .map_err(|error| error.to_string())?
        .app_data_dir
        .clone();
    run_blocking(move || {
        app_settings::with_team_settings(&path, |_| team_credentials::read_team_token())
    })
    .await
}

#[tauri::command]
pub async fn replace_team_connection(
    state: tauri::State<'_, Mutex<AppState>>,
    settings: Value,
    token: String,
) -> Result<(), String> {
    let path = state
        .lock()
        .map_err(|error| error.to_string())?
        .app_data_dir
        .clone();
    run_blocking(move || team_settings_store::replace_connection(&path, settings, &token)).await
}

#[tauri::command]
pub async fn update_team_connection(
    state: tauri::State<'_, Mutex<AppState>>,
    settings: Value,
    expected_connection_id: Option<String>,
) -> Result<bool, String> {
    let path = state
        .lock()
        .map_err(|error| error.to_string())?
        .app_data_dir
        .clone();
    run_blocking(move || {
        team_settings_store::update_connection(&path, settings, expected_connection_id.as_deref())
    })
    .await
}

#[tauri::command]
pub async fn clear_team_connection(
    state: tauri::State<'_, Mutex<AppState>>,
    expected_connection_id: Option<String>,
) -> Result<bool, String> {
    let path = state
        .lock()
        .map_err(|error| error.to_string())?
        .app_data_dir
        .clone();
    run_blocking(move || {
        team_settings_store::clear_connection(&path, expected_connection_id.as_deref())
    })
    .await
}

#[tauri::command]
pub async fn save_provider_account_sharing(
    state: tauri::State<'_, Mutex<AppState>>,
    settings: Value,
    expected_connection_id: Option<String>,
) -> Result<bool, String> {
    let path = state
        .lock()
        .map_err(|error| error.to_string())?
        .app_data_dir
        .clone();
    run_blocking(move || {
        team_settings_store::save_sharing(&path, settings, expected_connection_id.as_deref())
    })
    .await
}

#[tauri::command]
pub async fn update_shared_provider_account_label(
    state: tauri::State<'_, Mutex<AppState>>,
    provider_id: String,
    local_account_fingerprint: String,
    label: String,
) -> Result<(), String> {
    let app_data_dir = state
        .lock()
        .map_err(|error| error.to_string())?
        .app_data_dir
        .clone();
    run_blocking(move || {
        team_sync::update_shared_provider_account_label(
            &app_data_dir,
            &provider_id,
            &local_account_fingerprint,
            &label,
        )
    })
    .await
}

#[tauri::command]
pub async fn upload_shared_provider_account_current_data(
    state: tauri::State<'_, Mutex<AppState>>,
    provider_id: String,
    local_account_fingerprint: String,
    label: String,
) -> Result<team_sync::CurrentSharedProviderAccountUploadResult, String> {
    let app_data_dir = state
        .lock()
        .map_err(|error| error.to_string())?
        .app_data_dir
        .clone();
    run_blocking(move || {
        team_sync::upload_current_shared_provider_account_data(
            &app_data_dir,
            &provider_id,
            &local_account_fingerprint,
            &label,
        )
    })
    .await
}

#[cfg(test)]
mod tests {
    use super::run_blocking;

    #[tokio::test]
    async fn blocking_team_work_uses_a_different_thread() {
        let caller_thread = std::thread::current().id();
        let worker_thread = run_blocking(|| Ok(std::thread::current().id()))
            .await
            .unwrap();
        assert_ne!(caller_thread, worker_thread);
    }

    #[tokio::test]
    async fn blocking_team_work_preserves_errors() {
        let result = run_blocking::<()>(|| Err("Team is offline".to_string())).await;
        assert_eq!(result, Err("Team is offline".to_string()));
    }
}
