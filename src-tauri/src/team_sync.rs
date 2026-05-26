use crate::local_http_api::cache::CachedPluginSnapshot;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::Duration;

const SETTINGS_FILE_NAME: &str = "settings.json";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsFile {
    team_sync: Option<TeamSyncSettings>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TeamSyncSettings {
    enabled: bool,
    collector_url: String,
    org_id: String,
    write_token: String,
    teammate_id: String,
    teammate_name: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TeamUsageUpload<'a> {
    org_id: &'a str,
    teammate_id: &'a str,
    teammate_name: &'a str,
    snapshot: &'a CachedPluginSnapshot,
}

fn load_settings(app_data_dir: &Path) -> Option<TeamSyncSettings> {
    let path = app_data_dir.join(SETTINGS_FILE_NAME);
    let data = match std::fs::read_to_string(&path) {
        Ok(data) => data,
        Err(_) => return None,
    };

    match serde_json::from_str::<SettingsFile>(&data) {
        Ok(settings) => settings.team_sync.filter(|sync| sync.enabled),
        Err(error) => {
            log::warn!("team sync disabled: failed to parse settings.json: {}", error);
            None
        }
    }
}

fn valid_settings(settings: &TeamSyncSettings) -> bool {
    !settings.collector_url.trim().is_empty()
        && !settings.org_id.trim().is_empty()
        && !settings.write_token.trim().is_empty()
        && !settings.teammate_id.trim().is_empty()
        && !settings.teammate_name.trim().is_empty()
}

fn usage_endpoint(collector_url: &str) -> String {
    format!("{}/v1/usage", collector_url.trim_end_matches('/'))
}

pub fn upload_snapshot(app_data_dir: &Path, snapshot: &CachedPluginSnapshot) {
    let Some(settings) = load_settings(app_data_dir) else {
        return;
    };

    if !valid_settings(&settings) {
        log::warn!("team sync disabled: missing collector URL, org, token, or teammate");
        return;
    }

    let body = TeamUsageUpload {
        org_id: settings.org_id.trim(),
        teammate_id: settings.teammate_id.trim(),
        teammate_name: settings.teammate_name.trim(),
        snapshot,
    };

    let json = match serde_json::to_string(&body) {
        Ok(json) => json,
        Err(error) => {
            log::warn!("team sync skipped: failed to serialize upload: {}", error);
            return;
        }
    };

    let url = usage_endpoint(&settings.collector_url);
    let token = settings.write_token.trim().to_string();
    std::thread::spawn(move || {
        let client = match reqwest::blocking::Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .build()
        {
            Ok(client) => client,
            Err(error) => {
                log::warn!("team sync skipped: failed to build HTTP client: {}", error);
                return;
            }
        };

        match client
            .post(url)
            .header("content-type", "application/json")
            .bearer_auth(token)
            .body(json)
            .send()
        {
            Ok(response) if response.status().is_success() => {}
            Ok(response) => {
                log::warn!("team sync upload failed: HTTP {}", response.status());
            }
            Err(error) => {
                log::warn!("team sync upload failed: {}", error);
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn usage_endpoint_trims_trailing_slash() {
        assert_eq!(
            usage_endpoint("http://127.0.0.1:8787/"),
            "http://127.0.0.1:8787/v1/usage"
        );
    }

    #[test]
    fn valid_settings_requires_identity_and_tokens() {
        let settings = TeamSyncSettings {
            enabled: true,
            collector_url: "http://127.0.0.1:8787".to_string(),
            org_id: "acme".to_string(),
            write_token: "secret".to_string(),
            teammate_id: "danyil".to_string(),
            teammate_name: "Danyil".to_string(),
        };
        assert!(valid_settings(&settings));

        let mut missing = settings.clone();
        missing.write_token = String::new();
        assert!(!valid_settings(&missing));
    }
}
