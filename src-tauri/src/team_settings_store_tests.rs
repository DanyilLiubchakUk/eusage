use super::*;
use serde_json::json;
use std::sync::Mutex;

fn fixture(label: &str) -> std::path::PathBuf {
    let path =
        std::env::temp_dir().join(format!("eusage-settings-{label}-{}", uuid::Uuid::new_v4()));
    app_settings::set_test_settings(
        &path,
        json!({
            "themeMode": "dark",
            "teamConnection": connection("old"),
            "providerAccountSharing": {"teamFingerprint": "team", "sharedLocalAccountFingerprints": ["account"]}
        }),
    );
    path
}

fn connection(id: &str) -> Value {
    json!({
        "connectionId": id, "teamUrl": "https://team.example", "teamName": "Team",
        "teamFingerprint": "team", "tokenFingerprint": token_fingerprint(if id == "new" { "new-token" } else { "old-token" }), "deviceId": "device",
        "endpoints": {"usageBatch": "/usage", "providerAccountUpdate": "/account"},
        "syncStatus": "never"
    })
}

#[test]
fn stale_mutations_do_not_touch_new_connection_or_credentials() {
    let path = fixture("stale");
    let token = Mutex::new(Some("old-token".to_string()));
    replace_connection_with(
        &path,
        connection("new"),
        "new-token",
        || Ok(token.lock().unwrap().clone()),
        |value| {
            *token.lock().unwrap() = Some(value.to_string());
            Ok(())
        },
        || {
            *token.lock().unwrap() = None;
            Ok(())
        },
    )
    .unwrap();
    assert!(!update_connection(&path, connection("old"), Some("old")).unwrap());
    assert!(!save_sharing(&path, json!({"teamFingerprint":"team"}), Some("old")).unwrap());
    assert!(
        !clear_connection_if_with(
            &path,
            |current| matches_id(current, Some("old")),
            || panic!("stale cleanup must not read credentials"),
            |_| panic!("stale cleanup must not save credentials"),
            || panic!("stale cleanup must not delete credentials")
        )
        .unwrap()
    );
    let saved = app_settings::snapshot(&path).unwrap();
    assert_eq!(saved[CONNECTION]["connectionId"], "new");
    assert_eq!(saved["themeMode"], "dark");
    assert!(saved.get(SHARING).is_none());
    assert_eq!(token.lock().unwrap().as_deref(), Some("new-token"));
    let view = read_team_settings(&path).unwrap();
    assert_eq!(view.as_object().unwrap().len(), 3);
    assert!(view.get("themeMode").is_none());
}

#[test]
fn missing_legacy_connection_cannot_be_recreated_by_late_update() {
    let path = fixture("missing");
    app_settings::set_test_settings(&path, json!({"themeMode":"dark"}));
    let mut legacy = connection("old");
    legacy.as_object_mut().unwrap().remove("connectionId");
    assert!(!update_connection(&path, legacy, None).unwrap());
    assert!(!save_sharing(&path, Value::Null, None).unwrap());
}

#[test]
fn legacy_connection_can_record_offline_status_before_fingerprint_migration() {
    let path = fixture("legacy-update");
    let mut legacy = connection("old");
    legacy.as_object_mut().unwrap().remove("connectionId");
    legacy["teamFingerprint"] = json!("");
    app_settings::set_test_value(&path, CONNECTION, legacy.clone());
    legacy["syncStatus"] = json!("error");
    legacy["lastError"] = json!("Team is offline");
    legacy["deviceId"] = json!("replacement-device");
    assert!(update_connection(&path, legacy, None).unwrap());
    let saved = read_team_settings(&path).unwrap();
    assert_eq!(saved[CONNECTION]["lastError"], "Team is offline");
    assert_eq!(saved[DEVICE_ID], "replacement-device");
    assert_eq!(saved[CONNECTION]["teamFingerprint"], "");
}

#[test]
fn failed_replacement_restores_connection_sharing_and_token() {
    let path = fixture("rollback");
    let previous = app_settings::snapshot(&path).unwrap();
    let token = Mutex::new(Some("old-token".to_string()));
    app_settings::fail_next_save(&path);
    let result = replace_connection_with(
        &path,
        connection("new"),
        "new-token",
        || Ok(token.lock().unwrap().clone()),
        |value| {
            *token.lock().unwrap() = Some(value.to_string());
            Ok(())
        },
        || {
            *token.lock().unwrap() = None;
            Ok(())
        },
    );
    assert!(result.unwrap_err().contains("Failed to save Team settings"));
    assert_eq!(app_settings::snapshot(&path).unwrap(), previous);
    assert_eq!(token.lock().unwrap().as_deref(), Some("old-token"));
}

#[test]
fn credential_failure_preserves_settings() {
    let path = fixture("vault-failure");
    let previous = app_settings::snapshot(&path).unwrap();
    let result = replace_connection_with(
        &path,
        connection("new"),
        "new-token",
        || Ok(Some("old-token".to_string())),
        |_| Err("Synthetic vault failure".to_string()),
        || panic!("failed save must not delete credentials"),
    );
    assert_eq!(result, Err("Synthetic vault failure".to_string()));
    assert_eq!(app_settings::snapshot(&path).unwrap(), previous);
}

#[test]
fn inaccessible_keyring_preserves_connection_and_sharing() {
    let path = fixture("locked-keyring");
    let previous = app_settings::snapshot(&path).unwrap();
    let read = || Err("Linux keyring is locked.".to_string());
    let save = |_: &str| panic!("must not replace an inaccessible token");
    let delete = || panic!("must not remove an inaccessible token");

    assert_eq!(
        replace_connection_with(&path, connection("new"), "new-token", read, save, delete),
        Err("Linux keyring is locked.".to_string())
    );
    assert_eq!(
        clear_connection_if_with(&path, |_| true, read, save, delete),
        Err("Linux keyring is locked.".to_string())
    );
    assert_eq!(app_settings::snapshot(&path).unwrap(), previous);
}

#[test]
fn replacement_rejects_mismatched_token_before_touching_vault() {
    let path = fixture("token-validation");
    let previous = app_settings::snapshot(&path).unwrap();
    assert!(
        replace_connection_with(
            &path,
            connection("new"),
            "wrong-token",
            || panic!("mismatch must not read the vault"),
            |_| panic!("mismatch must not write the vault"),
            || panic!("mismatch must not delete the vault")
        )
        .is_err()
    );
    assert_eq!(app_settings::snapshot(&path).unwrap(), previous);
    assert_eq!(token_fingerprint("test"), "9f86d081...b0f00a08");
}

#[test]
fn sharing_rejects_wrong_team_and_clears_in_order() {
    let path = fixture("sharing");
    assert!(save_sharing(&path, json!({"teamFingerprint":"other"}), Some("old")).is_err());
    assert!(
        save_sharing(
            &path,
            json!({"sharedLocalAccountFingerprints":["second"]}),
            Some("old")
        )
        .unwrap()
    );
    assert_eq!(
        read_team_settings(&path).unwrap()[SHARING]["teamFingerprint"],
        "team"
    );
    assert!(save_sharing(&path, Value::Null, Some("old")).unwrap());
    assert!(
        app_settings::snapshot(&path)
            .unwrap()
            .get(SHARING)
            .is_none()
    );
}

#[test]
fn clear_preserves_device_identity_and_rolls_back_failed_save() {
    let path = fixture("clear-rollback");
    let token = Mutex::new(Some("old-token".to_string()));
    let previous = app_settings::snapshot(&path).unwrap();
    app_settings::fail_next_save(&path);
    assert!(
        clear_connection_if_with(
            &path,
            |current| matches_id(current, Some("old")),
            || Ok(token.lock().unwrap().clone()),
            |value| {
                *token.lock().unwrap() = Some(value.to_string());
                Ok(())
            },
            || {
                *token.lock().unwrap() = None;
                Ok(())
            }
        )
        .is_err()
    );
    assert_eq!(app_settings::snapshot(&path).unwrap(), previous);
    assert_eq!(token.lock().unwrap().as_deref(), Some("old-token"));
    assert!(
        clear_connection_if_with(
            &path,
            |current| matches_id(current, Some("old")),
            || Ok(token.lock().unwrap().clone()),
            |value| {
                *token.lock().unwrap() = Some(value.to_string());
                Ok(())
            },
            || {
                *token.lock().unwrap() = None;
                Ok(())
            }
        )
        .unwrap()
    );
    assert_eq!(read_team_settings(&path).unwrap()[DEVICE_ID], "device");
    assert!(token.lock().unwrap().is_none());
}

#[test]
fn rollback_keeps_preference_changed_during_credential_prompt() {
    let path = fixture("preference");
    app_settings::fail_next_save(&path);
    let result = replace_connection_with(
        &path,
        connection("new"),
        "new-token",
        || Ok(Some("old-token".to_string())),
        |_| {
            app_settings::set_test_value(&path, "themeMode", json!("light"));
            Ok(())
        },
        || Ok(()),
    );
    assert!(result.is_err());
    assert_eq!(app_settings::snapshot(&path).unwrap()["themeMode"], "light");
}
