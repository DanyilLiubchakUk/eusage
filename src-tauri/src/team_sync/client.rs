use super::TeamUsageBatch;
use super::settings::{
    TeamConnectionSettings, provider_account_update_endpoint, usage_batch_endpoint,
};
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, PartialEq, Eq)]
pub(super) enum TeamUploadResult {
    Success {
        accepted_count: usize,
        rejected_provider_ids: Vec<String>,
        server_time: String,
    },
    Retryable {
        message: String,
    },
    InvalidToken {
        message: String,
    },
}

#[derive(Debug, PartialEq, Eq)]
pub(super) enum ProviderAccountUpdateResult {
    Success { server_time: String },
    Retryable { message: String },
    InvalidToken { message: String },
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ProviderAccountUpdateRequest {
    pub provider_id: String,
    pub provider_account_fingerprint: String,
    pub provider_account_label: String,
    pub status: &'static str,
}

pub(super) fn send_usage_batch_http(
    connection: &TeamConnectionSettings,
    token: &str,
    batch: &TeamUsageBatch,
    timeout: Duration,
) -> TeamUploadResult {
    let json = match serde_json::to_string(batch) {
        Ok(json) => json,
        Err(error) => {
            return TeamUploadResult::Retryable {
                message: format!("failed to serialize usage batch: {}", error),
            };
        }
    };

    let client = match reqwest::blocking::Client::builder()
        .timeout(timeout)
        .build()
    {
        Ok(client) => client,
        Err(error) => {
            return TeamUploadResult::Retryable {
                message: format!("failed to build HTTP client: {}", error),
            };
        }
    };

    let response = match client
        .post(usage_batch_endpoint(connection))
        .header("content-type", "application/json")
        .bearer_auth(token)
        .body(json)
        .send()
    {
        Ok(response) => response,
        Err(error) => {
            return TeamUploadResult::Retryable {
                message: error.to_string(),
            };
        }
    };

    let status = response.status();
    let body = response.text().unwrap_or_default();
    if status.is_success() {
        return parse_success_response(&body)
            .unwrap_or_else(|message| TeamUploadResult::Retryable { message });
    }

    if status.as_u16() == 401 || status.as_u16() == 403 {
        if let Some((code, message)) = parse_error_response(&body) {
            if is_invalid_token_code(&code) {
                return TeamUploadResult::InvalidToken { message };
            }
        }
    }

    TeamUploadResult::Retryable {
        message: format!("HTTP {}", status),
    }
}

pub(super) fn send_provider_account_update_http(
    connection: &TeamConnectionSettings,
    token: &str,
    update: &ProviderAccountUpdateRequest,
    timeout: Duration,
) -> ProviderAccountUpdateResult {
    let json = match serde_json::to_string(update) {
        Ok(json) => json,
        Err(error) => {
            return ProviderAccountUpdateResult::Retryable {
                message: format!("failed to serialize provider account update: {}", error),
            };
        }
    };

    let client = match reqwest::blocking::Client::builder()
        .timeout(timeout)
        .build()
    {
        Ok(client) => client,
        Err(error) => {
            return ProviderAccountUpdateResult::Retryable {
                message: format!("failed to build HTTP client: {}", error),
            };
        }
    };

    let response = match client
        .post(provider_account_update_endpoint(connection))
        .header("content-type", "application/json")
        .bearer_auth(token)
        .body(json)
        .send()
    {
        Ok(response) => response,
        Err(error) => {
            return ProviderAccountUpdateResult::Retryable {
                message: error.to_string(),
            };
        }
    };

    let status = response.status();
    let body = response.text().unwrap_or_default();
    if status.is_success() {
        return parse_provider_account_success_response(&body)
            .unwrap_or_else(|message| ProviderAccountUpdateResult::Retryable { message });
    }

    if status.as_u16() == 401 || status.as_u16() == 403 {
        if let Some((code, message)) = parse_error_response(&body) {
            if is_invalid_token_code(&code) {
                return ProviderAccountUpdateResult::InvalidToken { message };
            }
        }
    }

    ProviderAccountUpdateResult::Retryable {
        message: format!("HTTP {}", status),
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UsageBatchResponse {
    ok: bool,
    accepted_count: usize,
    rejected_provider_ids: Vec<String>,
    server_time: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProviderAccountUpdateResponse {
    ok: bool,
    server_time: String,
}

fn parse_success_response(body: &str) -> Result<TeamUploadResult, String> {
    let parsed: UsageBatchResponse =
        serde_json::from_str(body).map_err(|_| "Team sync response is invalid.".to_string())?;
    if !parsed.ok || parsed.server_time.trim().is_empty() {
        return Err("Team sync response is invalid.".to_string());
    }
    Ok(TeamUploadResult::Success {
        accepted_count: parsed.accepted_count,
        rejected_provider_ids: parsed.rejected_provider_ids,
        server_time: parsed.server_time,
    })
}

fn parse_provider_account_success_response(
    body: &str,
) -> Result<ProviderAccountUpdateResult, String> {
    let parsed: ProviderAccountUpdateResponse = serde_json::from_str(body)
        .map_err(|_| "Provider Account update response is invalid.".to_string())?;
    if !parsed.ok || parsed.server_time.trim().is_empty() {
        return Err("Provider Account update response is invalid.".to_string());
    }
    Ok(ProviderAccountUpdateResult::Success {
        server_time: parsed.server_time,
    })
}

fn parse_error_response(body: &str) -> Option<(String, String)> {
    let value: serde_json::Value = serde_json::from_str(body).ok()?;
    let object = value.as_object()?;
    let code = object.get("code")?.as_str()?.trim().to_string();
    let message = object
        .get("message")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("Team token is invalid.")
        .trim()
        .to_string();
    Some((code, message))
}

fn is_invalid_token_code(code: &str) -> bool {
    matches!(
        code,
        "invalid-token" | "revoked-token" | "inactive-developer"
    )
}
