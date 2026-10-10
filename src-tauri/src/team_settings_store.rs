use crate::app_settings::{self, Settings};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::path::Path;

pub(crate) const CONNECTION: &str = "teamConnection";
const SHARING: &str = "providerAccountSharing";
const DEVICE_ID: &str = "teamDeviceId";

pub(crate) fn token_fingerprint(token: &str) -> String {
    let hash = Sha256::digest(token.as_bytes())
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>();
    format!("{}...{}", &hash[..8], &hash[hash.len() - 8..])
}

pub(crate) fn read_team_settings(app_data_dir: &Path) -> Result<Value, String> {
    let snapshot = app_settings::read_snapshot(app_data_dir)?;
    Ok(serde_json::json!({
        "teamConnection": snapshot.get(CONNECTION),
        "teamDeviceId": snapshot.get(DEVICE_ID),
        "providerAccountSharing": snapshot.get(SHARING)
    }))
}

pub(crate) fn matches_id(connection: &Value, expected_id: Option<&str>) -> bool {
    connection.is_object() && connection.get("connectionId").and_then(Value::as_str) == expected_id
}

fn restore_values(store: &Settings, values: &[(String, Option<Value>)]) {
    for (key, value) in values {
        match value {
            Some(value) => store.set(key, value.clone()),
            None => store.delete(key),
        }
    }
}

pub(crate) fn save_changes(
    store: &Settings,
    changes: &[(&str, Option<Value>)],
) -> Result<(), String> {
    app_settings::with_settings_write(|| {
        let previous = changes
            .iter()
            .map(|(key, _)| (key.to_string(), store.get(key)))
            .collect::<Vec<_>>();
        for (key, value) in changes {
            match value {
                Some(value) => store.set(key, value.clone()),
                None => store.delete(key),
            }
        }
        if let Err(error) = store.save() {
            restore_values(store, &previous);
            return match store.save() {
                Ok(()) => Err(format!("Failed to save Team settings: {error}")),
                Err(rollback) => Err(format!(
                    "Failed to save Team settings: {error}; settings rollback failed: {rollback}"
                )),
            };
        }
        Ok(())
    })
}

fn restore_token(
    previous: Option<&str>,
    save: &impl Fn(&str) -> Result<(), String>,
    delete: &impl Fn() -> Result<(), String>,
) -> Result<(), String> {
    match previous {
        Some(token) => save(token),
        None => delete(),
    }
}

pub(crate) fn replace_connection(
    app_data_dir: &Path,
    settings: Value,
    token: &str,
) -> Result<(), String> {
    replace_connection_with(
        app_data_dir,
        settings,
        token,
        crate::team_credentials::read_team_token,
        crate::team_credentials::save_team_token,
        crate::team_credentials::delete_team_token,
    )
}

fn replace_connection_with(
    app_data_dir: &Path,
    settings: Value,
    token: &str,
    read: impl Fn() -> Result<Option<String>, String>,
    save: impl Fn(&str) -> Result<(), String>,
    delete: impl Fn() -> Result<(), String>,
) -> Result<(), String> {
    let token = token.trim();
    let connection: crate::team_sync::settings::TeamConnectionSettings =
        serde_json::from_value(settings.clone())
            .map_err(|error| format!("Invalid Team connection: {error}"))?;
    if !crate::team_sync::settings::valid_connection(&connection)
        || connection
            .connection_id
            .as_deref()
            .is_none_or(|id| id.trim().is_empty())
    {
        return Err("Saved Team connection is incomplete.".to_string());
    }
    if connection.token_fingerprint != token_fingerprint(token) {
        return Err("Developer token does not match the Team connection.".to_string());
    }
    app_settings::with_team_settings(app_data_dir, |store| {
        let previous_token = read()?;
        save(token)?;
        let changes = [
            (CONNECTION, Some(settings)),
            (DEVICE_ID, Some(Value::String(connection.device_id))),
            (SHARING, None),
        ];
        if let Err(error) = save_changes(store, &changes) {
            return match restore_token(previous_token.as_deref(), &save, &delete) {
                Ok(()) => Err(error),
                Err(rollback) => Err(format!("{error}; credential rollback failed: {rollback}")),
            };
        }
        Ok(())
    })
}

pub(crate) fn update_connection(
    app_data_dir: &Path,
    settings: Value,
    expected_id: Option<&str>,
) -> Result<bool, String> {
    if !matches_id(&settings, expected_id) {
        return Err("Team connection identity cannot change during an update.".to_string());
    }
    app_settings::with_team_settings(app_data_dir, |store| {
        let Some(current) = store
            .get(CONNECTION)
            .filter(|current| matches_id(current, expected_id))
        else {
            return Ok(false);
        };
        let mut connection: crate::team_sync::settings::TeamConnectionSettings =
            serde_json::from_value(settings.clone())
                .map_err(|error| format!("Invalid Team connection: {error}"))?;
        // Existing legacy connections can record a local status before the next check-in fills this field.
        if expected_id.is_none()
            && connection.team_fingerprint.is_empty()
            && current
                .get("teamFingerprint")
                .and_then(Value::as_str)
                .is_none_or(|value| value.is_empty())
        {
            connection.team_fingerprint = "legacy".to_string();
        }
        if !crate::team_sync::settings::valid_connection(&connection) {
            return Err("Saved Team connection is incomplete.".to_string());
        }
        save_changes(
            store,
            &[
                (CONNECTION, Some(settings)),
                (DEVICE_ID, Some(Value::String(connection.device_id))),
            ],
        )?;
        Ok(true)
    })
}

pub(crate) fn clear_connection(
    app_data_dir: &Path,
    expected_id: Option<&str>,
) -> Result<bool, String> {
    clear_connection_if_with(
        app_data_dir,
        |current| matches_id(current, expected_id),
        crate::team_credentials::read_team_token,
        crate::team_credentials::save_team_token,
        crate::team_credentials::delete_team_token,
    )
}

pub(crate) fn clear_connection_if_with(
    app_data_dir: &Path,
    matches: impl FnOnce(&Value) -> bool,
    read: impl Fn() -> Result<Option<String>, String>,
    save: impl Fn(&str) -> Result<(), String>,
    delete: impl Fn() -> Result<(), String>,
) -> Result<bool, String> {
    app_settings::with_team_settings(app_data_dir, |store| {
        let Some(current) = store.get(CONNECTION).filter(|current| matches(current)) else {
            return Ok(false);
        };
        let previous_token = read()?;
        delete()?;
        let mut changes = vec![(CONNECTION, None), (SHARING, None)];
        if let Some(device_id) = current
            .get("deviceId")
            .and_then(Value::as_str)
            .filter(|id| !id.trim().is_empty())
        {
            changes.push((DEVICE_ID, Some(Value::String(device_id.to_string()))));
        }
        if let Err(error) = save_changes(store, &changes) {
            return match restore_token(previous_token.as_deref(), &save, &delete) {
                Ok(()) => Err(error),
                Err(rollback) => Err(format!("{error}; credential rollback failed: {rollback}")),
            };
        }
        Ok(true)
    })
}

pub(crate) fn save_sharing(
    app_data_dir: &Path,
    settings: Value,
    expected_id: Option<&str>,
) -> Result<bool, String> {
    app_settings::with_team_settings(app_data_dir, |store| {
        let Some(connection) = store
            .get(CONNECTION)
            .filter(|current| matches_id(current, expected_id))
        else {
            return Ok(false);
        };
        let settings = if settings.is_null() {
            None
        } else {
            let fingerprint = connection
                .get("teamFingerprint")
                .and_then(Value::as_str)
                .filter(|value| !value.trim().is_empty())
                .ok_or_else(|| "Saved Team fingerprint is missing.".to_string())?;
            let mut sharing = settings
                .as_object()
                .cloned()
                .ok_or_else(|| "Provider Account sharing must be an object.".to_string())?;
            let accounts = sharing
                .get("sharedLocalAccountFingerprints")
                .and_then(Value::as_array)
                .ok_or_else(|| {
                    "Provider Account sharing must list account fingerprints.".to_string()
                })?;
            if accounts
                .iter()
                .any(|value| value.as_str().is_none_or(|value| value.trim().is_empty()))
            {
                return Err("Provider Account fingerprints must be nonempty strings.".to_string());
            }
            if sharing
                .get("teamFingerprint")
                .is_some_and(|value| value.as_str() != Some(fingerprint))
            {
                return Err("Provider Account sharing belongs to a different Team.".to_string());
            }
            sharing.insert(
                "teamFingerprint".to_string(),
                Value::String(fingerprint.to_string()),
            );
            sharing.insert(
                "connectionId".to_string(),
                connection
                    .get("connectionId")
                    .cloned()
                    .unwrap_or(Value::Null),
            );
            Some(Value::Object(sharing))
        };
        save_changes(store, &[(SHARING, settings)])?;
        Ok(true)
    })
}

#[cfg(test)]
#[path = "team_settings_store_tests.rs"]
mod tests;
