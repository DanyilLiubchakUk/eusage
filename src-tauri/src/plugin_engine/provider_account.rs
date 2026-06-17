use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ProviderAccountIdentityKind {
    ProviderAccountId,
    ProviderEmail,
    ProviderUserId,
    LocalProfilePath,
    CredentialSource,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ProviderAccountIdentityConfidence {
    High,
    Medium,
    Low,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderAccountDetection {
    pub provider_id: String,
    pub provider_name: String,
    pub identity_kind: ProviderAccountIdentityKind,
    pub identity_value: String,
    pub identity_confidence: ProviderAccountIdentityConfidence,
    pub label: Option<String>,
}

pub fn parse_provider_account_detections(
    value: Option<JsonValue>,
) -> Vec<ProviderAccountDetection> {
    let value = match value {
        Some(value) => value,
        None => return Vec::new(),
    };
    let detections = match serde_json::from_value::<Vec<ProviderAccountDetection>>(value) {
        Ok(detections) => detections,
        Err(error) => {
            log::warn!("plugin providerAccountDetections ignored: {}", error);
            return Vec::new();
        }
    };

    normalize_provider_account_detections(detections)
}

pub(super) fn normalize_provider_account_detections(
    detections: Vec<ProviderAccountDetection>,
) -> Vec<ProviderAccountDetection> {
    detections
        .into_iter()
        .filter_map(normalize_provider_account_detection)
        .collect()
}

fn normalize_provider_account_detection(
    mut detection: ProviderAccountDetection,
) -> Option<ProviderAccountDetection> {
    detection.provider_id = detection.provider_id.trim().to_string();
    detection.provider_name = detection.provider_name.trim().to_string();
    detection.identity_value = detection.identity_value.trim().to_string();
    detection.label = detection
        .label
        .map(|label| label.trim().to_string())
        .filter(|label| !label.is_empty());

    if detection.provider_id.is_empty()
        || detection.provider_name.is_empty()
        || detection.identity_value.is_empty()
    {
        return None;
    }

    Some(detection)
}
