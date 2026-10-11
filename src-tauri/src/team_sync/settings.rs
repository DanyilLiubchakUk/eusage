use serde::Deserialize;
use serde_json::Value;
use std::path::Path;

const TEAM_CONNECTION_KEY: &str = "teamConnection";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TeamConnectionSettings {
    #[serde(default)]
    pub connection_id: Option<String>,
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

pub(crate) fn valid_connection(connection: &TeamConnectionSettings) -> bool {
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
        "{}|{}|{}|{}|{}",
        connection.connection_id.as_deref().unwrap_or("legacy"),
        connection.team_url,
        connection.team_fingerprint,
        connection.device_id,
        connection.token_fingerprint
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

pub(super) fn read_connection_with_token<R>(
    app_data_dir: &Path,
    expected_key: Option<&str>,
    read_token: R,
) -> Result<Option<(TeamConnectionSettings, String)>, String>
where
    R: FnOnce() -> Result<Option<String>, String>,
{
    crate::app_settings::with_team_settings(app_data_dir, |store| {
        let Some(connection) = store
            .get(TEAM_CONNECTION_KEY)
            .and_then(|value| serde_json::from_value::<TeamConnectionSettings>(value).ok())
        else {
            return Ok(None);
        };
        if expected_key.is_some_and(|key| key != connection_key(&connection)) {
            return Ok(None);
        }
        let token = read_token()?
            .filter(|token| !token.trim().is_empty())
            .ok_or_else(|| "Team token is missing. Paste a connection string again.".to_string())?;
        if connection.token_fingerprint != crate::team_settings_store::token_fingerprint(&token) {
            return Err(
                "Saved Team token does not match this connection. Paste a connection string again."
                    .to_string(),
            );
        }
        Ok(Some((connection, token)))
    })
}

pub(super) fn mark_connection_success(
    app_data_dir: &Path,
    expected: &TeamConnectionSettings,
    server_time: &str,
) {
    update_connection_status(app_data_dir, expected, |connection| {
        connection.insert(
            "syncStatus".to_string(),
            Value::String("connected".to_string()),
        );
        connection.insert(
            "lastContactAt".to_string(),
            Value::String(server_time.to_string()),
        );
        connection.insert("lastError".to_string(), Value::Null);
    });
}

pub(super) fn mark_connection_error(
    app_data_dir: &Path,
    expected: &TeamConnectionSettings,
    message: &str,
) {
    update_connection_status(app_data_dir, expected, |connection| {
        connection.insert("syncStatus".to_string(), Value::String("error".to_string()));
        connection.insert("lastError".to_string(), Value::String(message.to_string()));
    });
}

fn update_connection_status(
    app_data_dir: &Path,
    expected: &TeamConnectionSettings,
    update: impl FnOnce(&mut serde_json::Map<String, Value>),
) {
    let result = crate::app_settings::with_team_settings(app_data_dir, |store| {
        let Some(mut current) = store.get(TEAM_CONNECTION_KEY) else {
            return Ok(());
        };
        let Ok(connection) = serde_json::from_value::<TeamConnectionSettings>(current.clone())
        else {
            return Ok(());
        };
        if connection_key(&connection) != connection_key(expected) {
            return Ok(());
        }
        update(
            current
                .as_object_mut()
                .expect("deserialized connection object"),
        );
        crate::team_settings_store::save_changes(store, &[(TEAM_CONNECTION_KEY, Some(current))])
    });
    if let Err(error) = result {
        log::error!("Team sync status update failed: {}", error);
    }
}

pub(super) fn clear_connection_with<D>(
    app_data_dir: &Path,
    expected: &TeamConnectionSettings,
    token: &str,
    delete_token: D,
) -> Result<bool, String>
where
    D: Fn() -> Result<(), String>,
{
    crate::team_settings_store::clear_connection_if_with(
        app_data_dir,
        |current| {
            serde_json::from_value::<TeamConnectionSettings>(current.clone())
                .is_ok_and(|connection| connection_key(&connection) == connection_key(expected))
        },
        || Ok(Some(token.to_string())),
        restore_token_after_cleanup_failure,
        delete_token,
    )
}

#[cfg(not(test))]
fn restore_token_after_cleanup_failure(token: &str) -> Result<(), String> {
    crate::team_credentials::save_team_token(token)
}

#[cfg(test)]
fn restore_token_after_cleanup_failure(_token: &str) -> Result<(), String> {
    Err("Synthetic cleanup cannot access the credential vault.".to_string())
}

fn read_settings_value(app_data_dir: &Path) -> Option<Value> {
    crate::app_settings::snapshot(app_data_dir)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn connection_and_token_snapshot_blocks_replacement_until_both_are_read() {
        use serde_json::json;
        use std::sync::{Arc, Mutex, mpsc};
        use std::time::Duration;
        let path =
            std::env::temp_dir().join(format!("eusage-paired-settings-{}", uuid::Uuid::new_v4()));
        crate::app_settings::set_test_settings(
            &path,
            json!({"teamConnection": {
                "connectionId": "old", "teamUrl": "https://team.example", "teamName": "Team",
                "teamFingerprint": "team", "tokenFingerprint": crate::team_settings_store::token_fingerprint("old-token"), "deviceId": "device",
                "endpoints": {"usageBatch": "/usage"}
            }}),
        );
        let token = Arc::new(Mutex::new("old-token".to_string()));
        let (reading, started) = mpsc::channel();
        let (release, released) = mpsc::channel();
        let read_path = path.clone();
        let read_token = token.clone();
        let reader = std::thread::spawn(move || {
            read_connection_with_token(&read_path, None, || {
                reading.send(()).unwrap();
                released.recv().unwrap();
                Ok(Some(read_token.lock().unwrap().clone()))
            })
            .unwrap()
            .unwrap()
        });
        started.recv().unwrap();
        let write_path = path.clone();
        let write_token = token.clone();
        let (attempting, attempted) = mpsc::channel();
        let (finished, complete) = mpsc::channel();
        let writer = std::thread::spawn(move || {
            attempting.send(()).unwrap();
            crate::app_settings::with_team_settings(&write_path, |store| {
                let mut connection = store.get("teamConnection").unwrap();
                connection["connectionId"] = json!("new");
                connection["tokenFingerprint"] =
                    json!(crate::team_settings_store::token_fingerprint("new-token"));
                store.set("teamConnection", connection);
                *write_token.lock().unwrap() = "new-token".to_string();
                Ok(())
            })
            .unwrap();
            finished.send(()).unwrap();
        });
        attempted.recv().unwrap();
        assert!(complete.recv_timeout(Duration::from_millis(20)).is_err());
        release.send(()).unwrap();
        let (connection, snapshot_token) = reader.join().unwrap();
        writer.join().unwrap();
        assert_eq!(connection.connection_id.as_deref(), Some("old"));
        assert_eq!(snapshot_token, "old-token");
        let (connection, snapshot_token) =
            read_connection_with_token(&path, None, || Ok(Some(token.lock().unwrap().clone())))
                .unwrap()
                .unwrap();
        assert_eq!(connection.connection_id.as_deref(), Some("new"));
        assert_eq!(snapshot_token, "new-token");
    }

    #[test]
    fn usage_batch_endpoint_joins_current_endpoint_path() {
        let connection = TeamConnectionSettings {
            connection_id: None,
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
