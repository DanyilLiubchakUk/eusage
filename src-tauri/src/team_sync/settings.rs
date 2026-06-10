use serde::Deserialize;
use serde_json::{Map, Value};
use std::path::Path;

pub(super) const SETTINGS_FILE_NAME: &str = "settings.json";
const TEAM_CONNECTION_KEY: &str = "teamConnection";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct TeamConnectionSettings {
    pub team_url: String,
    pub team_name: String,
    pub team_fingerprint: String,
    pub token_fingerprint: String,
    pub device_id: String,
    pub endpoints: TeamApiEndpoints,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct TeamApiEndpoints {
    pub usage_batch: String,
    #[serde(default = "default_provider_account_update_endpoint")]
    pub provider_account_update: String,
}

pub(super) fn load_connection(app_data_dir: &Path) -> Option<TeamConnectionSettings> {
    let settings = read_settings_value(app_data_dir)?;
    let connection = settings.get(TEAM_CONNECTION_KEY)?.clone();
    serde_json::from_value::<TeamConnectionSettings>(connection).ok()
}

pub(super) fn valid_connection(connection: &TeamConnectionSettings) -> bool {
    !connection.team_url.trim().is_empty()
        && !connection.team_name.trim().is_empty()
        && !connection.team_fingerprint.trim().is_empty()
        && !connection.token_fingerprint.trim().is_empty()
        && !connection.device_id.trim().is_empty()
        && connection.endpoints.usage_batch.starts_with('/')
        && connection
            .endpoints
            .provider_account_update
            .starts_with('/')
}

pub(super) fn connection_key(connection: &TeamConnectionSettings) -> String {
    format!(
        "{}|{}|{}",
        connection.team_url, connection.device_id, connection.token_fingerprint
    )
}

pub(super) fn usage_batch_endpoint(connection: &TeamConnectionSettings) -> String {
    format!(
        "{}/{}",
        connection.team_url.trim_end_matches('/'),
        connection.endpoints.usage_batch.trim_start_matches('/')
    )
}

pub(super) fn provider_account_update_endpoint(connection: &TeamConnectionSettings) -> String {
    format!(
        "{}/{}",
        connection.team_url.trim_end_matches('/'),
        connection
            .endpoints
            .provider_account_update
            .trim_start_matches('/')
    )
}

fn default_provider_account_update_endpoint() -> String {
    "/api/v1/provider-account/update".to_string()
}

pub(super) fn mark_connection_success(app_data_dir: &Path, server_time: &str) {
    if let Err(error) = update_team_connection(app_data_dir, |connection| {
        connection.insert(
            "syncStatus".to_string(),
            Value::String("connected".to_string()),
        );
        connection.insert(
            "lastContactAt".to_string(),
            Value::String(server_time.to_string()),
        );
        connection.insert("lastError".to_string(), Value::Null);
    }) {
        log::warn!("team sync status update failed: {}", error);
    }
}

pub(super) fn mark_connection_error(app_data_dir: &Path, message: &str) {
    if let Err(error) = update_team_connection(app_data_dir, |connection| {
        connection.insert("syncStatus".to_string(), Value::String("error".to_string()));
        connection.insert("lastError".to_string(), Value::String(message.to_string()));
    }) {
        log::warn!("team sync status update failed: {}", error);
    }
}

pub(super) fn clear_team_connection(app_data_dir: &Path) {
    let path = app_data_dir.join(SETTINGS_FILE_NAME);
    let Some(mut settings) = read_settings_value(app_data_dir) else {
        return;
    };
    let Some(object) = settings.as_object_mut() else {
        return;
    };
    object.remove(TEAM_CONNECTION_KEY);
    if let Err(error) = write_settings_value(&path, &settings) {
        log::warn!("team sync settings cleanup failed: {}", error);
    }
}

fn update_team_connection<F>(app_data_dir: &Path, update: F) -> Result<(), String>
where
    F: FnOnce(&mut Map<String, Value>),
{
    let path = app_data_dir.join(SETTINGS_FILE_NAME);
    let mut settings = read_settings_value(app_data_dir)
        .ok_or_else(|| "settings.json is missing or invalid".to_string())?;
    let connection = settings
        .as_object_mut()
        .and_then(|object| object.get_mut(TEAM_CONNECTION_KEY))
        .and_then(Value::as_object_mut)
        .ok_or_else(|| "team connection settings are missing".to_string())?;
    update(connection);
    write_settings_value(&path, &settings)
}

fn read_settings_value(app_data_dir: &Path) -> Option<Value> {
    let path = app_data_dir.join(SETTINGS_FILE_NAME);
    let data = std::fs::read_to_string(path).ok()?;
    serde_json::from_str::<Value>(&data).ok()
}

fn write_settings_value(path: &Path, value: &Value) -> Result<(), String> {
    let tmp_path = path.with_file_name(".settings.json.tmp");
    let json = serde_json::to_string_pretty(value)
        .map_err(|error| format!("failed to serialize settings: {}", error))?;
    std::fs::write(&tmp_path, json)
        .map_err(|error| format!("failed to write settings: {}", error))?;
    std::fs::rename(&tmp_path, path)
        .map_err(|error| format!("failed to replace settings: {}", error))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn usage_batch_endpoint_joins_current_endpoint_path() {
        let connection = TeamConnectionSettings {
            team_url: "https://team.example.com/".to_string(),
            team_name: "Acme Team".to_string(),
            team_fingerprint: "team-fingerprint".to_string(),
            token_fingerprint: "hash".to_string(),
            device_id: "device-1".to_string(),
            endpoints: TeamApiEndpoints {
                usage_batch: "/api/v1/usage/batch".to_string(),
                provider_account_update: "/api/v1/provider-account/update".to_string(),
            },
        };

        assert_eq!(
            usage_batch_endpoint(&connection),
            "https://team.example.com/api/v1/usage/batch"
        );
        assert_eq!(
            provider_account_update_endpoint(&connection),
            "https://team.example.com/api/v1/provider-account/update"
        );
    }
}
