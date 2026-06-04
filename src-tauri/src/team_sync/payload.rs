use crate::local_http_api::cache::CachedPluginSnapshot;
use crate::plugin_engine::runtime::{MetricLine, ProgressFormat, ProviderMetricSample};
use serde::Serialize;
use serde_json::{Map, Value, json};
use std::collections::BTreeMap;

const GENERIC_PAYLOAD_VERSION: &str = "1.0.0";
const GENERIC_REDACTION_VERSION: &str = "1.0.0";
const GENERIC_EXTRACTOR_VERSION: &str = "1.0.0";
const REDACTED_VALUE: &str = "[REDACTED]";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct TeamUsageProvider {
    pub provider_id: String,
    payload: Value,
    payload_version: &'static str,
    redaction_version: &'static str,
    captured_at: i64,
    period_start: i64,
    period_end: i64,
    period_key: String,
    data_identity: String,
    summary: Value,
    summary_version: String,
    extractor_version: BTreeMap<String, String>,
    metric_families: Vec<String>,
    metric_samples: Vec<TeamUsageMetricSample>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TeamUsageMetricSample {
    metric_key: String,
    value: f64,
    unit: String,
    sample_day: String,
    source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    period_start: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    period_end: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    bucket: Option<TeamUsageMetricBucket>,
    #[serde(skip_serializing_if = "Option::is_none")]
    coverage: Option<Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TeamUsageMetricBucket {
    kind: String,
    day: String,
    reporting_time_zone: String,
    start_ms: i64,
    end_ms: i64,
}

pub(super) fn build_provider_upload(snapshot: &CachedPluginSnapshot) -> TeamUsageProvider {
    let captured_at = timestamp_millis(&snapshot.fetched_at);
    let sample_day = sample_day(captured_at);
    let source_facts = snapshot.source_facts.as_ref();
    let metric_samples = source_facts
        .map(|facts| {
            facts
                .metric_samples
                .iter()
                .cloned()
                .map(TeamUsageMetricSample::from)
                .collect()
        })
        .unwrap_or_else(|| metric_samples_for_snapshot(snapshot, &sample_day));
    let summary = source_facts
        .map(|facts| facts.summary.clone())
        .unwrap_or_else(|| summary_for_snapshot(snapshot));
    let payload = snapshot
        .raw_payload
        .clone()
        .unwrap_or_else(|| serde_json::to_value(snapshot).unwrap_or_else(|_| json!({})));
    let payload = redact_json_value(payload);
    let extractor_version = source_facts
        .map(|facts| facts.extractor_version.clone())
        .unwrap_or_else(|| generic_extractor_version(&snapshot.provider_id));
    let period_start = source_facts
        .and_then(|facts| facts.period_start)
        .unwrap_or(captured_at);
    let period_end = source_facts
        .and_then(|facts| facts.period_end)
        .unwrap_or(period_start);
    let period_key = source_facts
        .and_then(|facts| facts.period_key.clone())
        .unwrap_or_else(|| sample_day.clone());
    let data_identity = source_facts
        .and_then(|facts| facts.data_identity.clone())
        .unwrap_or_else(|| format!("{}:{}", snapshot.provider_id, sample_day));
    let summary_version = source_facts
        .map(|facts| facts.summary_version.clone())
        .unwrap_or_else(|| GENERIC_EXTRACTOR_VERSION.to_string());
    let metric_families = source_facts
        .map(|facts| facts.metric_families.clone())
        .unwrap_or_else(|| vec!["pluginOutput".to_string()]);

    TeamUsageProvider {
        provider_id: snapshot.provider_id.clone(),
        payload,
        payload_version: GENERIC_PAYLOAD_VERSION,
        redaction_version: GENERIC_REDACTION_VERSION,
        captured_at,
        period_start,
        period_end,
        period_key,
        data_identity,
        summary,
        summary_version,
        extractor_version,
        metric_families,
        metric_samples,
    }
}

fn generic_extractor_version(provider_id: &str) -> BTreeMap<String, String> {
    let mut extractor_version = BTreeMap::new();
    extractor_version.insert(
        provider_id.to_string(),
        GENERIC_EXTRACTOR_VERSION.to_string(),
    );
    extractor_version
}

fn summary_for_snapshot(snapshot: &CachedPluginSnapshot) -> Value {
    let mut summary = Map::new();
    summary.insert(
        "provider".to_string(),
        json!({
            "displayName": snapshot.display_name,
            "plan": snapshot.plan,
            "lineCount": snapshot.lines.len(),
        }),
    );

    for line in &snapshot.lines {
        if let MetricLine::Progress {
            used,
            limit,
            format,
            ..
        } = line
        {
            match format {
                ProgressFormat::Percent if *limit > 0.0 => {
                    summary.insert("quotaPercent".to_string(), json!((used / limit) * 100.0));
                }
                ProgressFormat::Dollars => {
                    summary.insert("budgetUsedUsd".to_string(), json!(used));
                    summary.insert("budgetLimitUsd".to_string(), json!(limit));
                }
                ProgressFormat::Count { suffix } if suffix.to_lowercase().contains("token") => {
                    summary.insert("tokensTotal".to_string(), json!(used));
                }
                _ => {}
            }
        }
    }

    Value::Object(summary)
}

fn metric_samples_for_snapshot(
    snapshot: &CachedPluginSnapshot,
    sample_day: &str,
) -> Vec<TeamUsageMetricSample> {
    let mut samples = vec![TeamUsageMetricSample {
        metric_key: format!("{}.probe.success", snapshot.provider_id),
        value: 1.0,
        unit: "count".to_string(),
        sample_day: sample_day.to_string(),
        source: "normalized".to_string(),
        period_start: None,
        period_end: None,
        bucket: None,
        coverage: None,
    }];

    for line in &snapshot.lines {
        if let MetricLine::Progress {
            label,
            used,
            limit,
            format,
            ..
        } = line
        {
            let label = metric_label(label);
            let unit = progress_unit(format);
            samples.push(TeamUsageMetricSample {
                metric_key: format!("{}.{}.used", snapshot.provider_id, label),
                value: *used,
                unit: unit.clone(),
                sample_day: sample_day.to_string(),
                source: "providerReported".to_string(),
                period_start: None,
                period_end: None,
                bucket: None,
                coverage: None,
            });
            samples.push(TeamUsageMetricSample {
                metric_key: format!("{}.{}.limit", snapshot.provider_id, label),
                value: *limit,
                unit,
                sample_day: sample_day.to_string(),
                source: "providerReported".to_string(),
                period_start: None,
                period_end: None,
                bucket: None,
                coverage: None,
            });
        }
    }

    samples
}

impl From<ProviderMetricSample> for TeamUsageMetricSample {
    fn from(sample: ProviderMetricSample) -> Self {
        Self {
            metric_key: sample.metric_key,
            value: sample.value,
            unit: sample.unit,
            sample_day: sample.sample_day,
            source: sample.source,
            period_start: sample.period_start,
            period_end: sample.period_end,
            bucket: sample.bucket.map(|bucket| TeamUsageMetricBucket {
                kind: bucket.kind,
                day: bucket.day,
                reporting_time_zone: bucket.reporting_time_zone,
                start_ms: bucket.start_ms,
                end_ms: bucket.end_ms,
            }),
            coverage: sample.coverage,
        }
    }
}

fn progress_unit(format: &ProgressFormat) -> String {
    match format {
        ProgressFormat::Percent => "percent".to_string(),
        ProgressFormat::Dollars => "usd".to_string(),
        ProgressFormat::Count { suffix } => {
            let suffix = suffix.trim();
            if suffix.is_empty() {
                "count".to_string()
            } else {
                suffix.to_string()
            }
        }
    }
}

fn metric_label(label: &str) -> String {
    let mut out = String::new();
    for c in label.chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c.to_ascii_lowercase());
        } else if !out.ends_with('_') {
            out.push('_');
        }
    }
    let trimmed = out.trim_matches('_').to_string();
    if trimmed.is_empty() {
        "metric".to_string()
    } else {
        trimmed
    }
}

fn timestamp_millis(value: &str) -> i64 {
    time::OffsetDateTime::parse(value, &time::format_description::well_known::Rfc3339)
        .map(|date| date.unix_timestamp_nanos() / 1_000_000)
        .unwrap_or_else(|_| time::OffsetDateTime::now_utc().unix_timestamp_nanos() / 1_000_000)
        as i64
}

fn sample_day(timestamp_millis: i64) -> String {
    let seconds = timestamp_millis.div_euclid(1000);
    let date = time::OffsetDateTime::from_unix_timestamp(seconds)
        .unwrap_or_else(|_| time::OffsetDateTime::now_utc())
        .date();
    format!(
        "{:04}-{:02}-{:02}",
        date.year(),
        u8::from(date.month()),
        date.day()
    )
}

fn redact_json_value(value: Value) -> Value {
    match value {
        Value::Object(object) => {
            let mut redacted = Map::new();
            for (key, child) in object {
                if is_sensitive_key(&key) {
                    redacted.insert(key, Value::String(REDACTED_VALUE.to_string()));
                } else {
                    redacted.insert(key, redact_json_value(child));
                }
            }
            Value::Object(redacted)
        }
        Value::Array(items) => Value::Array(items.into_iter().map(redact_json_value).collect()),
        other => other,
    }
}

fn is_sensitive_key(key: &str) -> bool {
    let normalized = key
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .flat_map(|c| c.to_lowercase())
        .collect::<String>();

    matches!(
        normalized.as_str(),
        "token"
            | "accesstoken"
            | "refreshtoken"
            | "secret"
            | "apikey"
            | "secretkey"
            | "accesskey"
            | "key"
            | "cookie"
            | "authorization"
            | "password"
            | "credential"
    ) || normalized.ends_with("token")
        || normalized.ends_with("password")
        || normalized.ends_with("secret")
        || normalized.ends_with("credential")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::plugin_engine::runtime::{
        ProgressFormat, ProviderMetricBucket, ProviderMetricSample, ProviderSourceFacts,
    };

    fn make_snapshot(provider_id: &str, used: f64) -> CachedPluginSnapshot {
        CachedPluginSnapshot {
            provider_id: provider_id.to_string(),
            display_name: provider_id.to_string(),
            plan: Some("Pro".to_string()),
            lines: vec![MetricLine::Progress {
                label: "Session".to_string(),
                used,
                limit: 100.0,
                format: ProgressFormat::Percent,
                resets_at: None,
                period_duration_ms: None,
                color: None,
            }],
            source_facts: None,
            raw_payload: None,
            fetched_at: "2026-06-01T12:00:00Z".to_string(),
        }
    }

    #[test]
    fn provider_upload_contains_redacted_payload_and_source_facts() {
        let snapshot = make_snapshot("cursor", 42.0);
        let provider = build_provider_upload(&snapshot);
        let payload = provider.payload.as_object().unwrap();

        assert_eq!(provider.provider_id, "cursor");
        assert_eq!(provider.period_key, "2026-06-01");
        assert_eq!(provider.summary["quotaPercent"], 42.0);
        assert!(payload.get("providerId").is_some());
        assert!(
            provider
                .metric_samples
                .iter()
                .any(|sample| sample.metric_key == "cursor.session.used")
        );
    }

    #[test]
    fn provider_upload_prefers_plugin_source_facts_and_redacts_raw_payload() {
        let mut extractor_version = BTreeMap::new();
        extractor_version.insert("cursor".to_string(), "1.0.0".to_string());
        let mut snapshot = make_snapshot("cursor", 42.0);
        snapshot.raw_payload = Some(json!({
            "usage": {
                "planUsage": { "apiPercentUsed": 17.0 },
                "accessToken": "secret-token"
            }
        }));
        snapshot.source_facts = Some(ProviderSourceFacts {
            period_start: Some(1_770_000_000_000),
            period_end: Some(1_772_592_000_000),
            period_key: Some("cursor:2026-02-02:2026-03-04".to_string()),
            data_identity: Some("cursor:billing-cycle".to_string()),
            summary: json!({
                "provider": {
                    "cursor": {
                        "apiPercentUsed": 17.0,
                        "individualLimitUsd": 100.0,
                        "individualUsedUsd": 40.0,
                        "pooledLimitUsd": 500.0,
                        "pooledUsedUsd": 120.0
                    }
                }
            }),
            summary_version: "1.0.0".to_string(),
            extractor_version,
            metric_families: vec!["cursorPool".to_string()],
            metric_samples: vec![ProviderMetricSample {
                metric_key: "cursor.api.percentUsed".to_string(),
                value: 17.0,
                unit: "percent".to_string(),
                sample_day: "2026-06-01".to_string(),
                source: "providerReported".to_string(),
                period_start: Some(1_770_000_000_000),
                period_end: Some(1_772_592_000_000),
                bucket: Some(ProviderMetricBucket {
                    kind: "reportingDay".to_string(),
                    day: "2026-06-01".to_string(),
                    reporting_time_zone: "UTC".to_string(),
                    start_ms: 1_770_000_000_000,
                    end_ms: 1_770_086_400_000,
                }),
                coverage: None,
            }],
        });

        let provider = build_provider_upload(&snapshot);

        assert_eq!(provider.period_key, "cursor:2026-02-02:2026-03-04");
        assert_eq!(provider.summary_version, "1.0.0");
        assert_eq!(provider.metric_families, vec!["cursorPool"]);
        assert_eq!(
            provider.summary["provider"]["cursor"]["pooledLimitUsd"],
            500.0
        );
        assert_eq!(
            provider.metric_samples[0].metric_key,
            "cursor.api.percentUsed"
        );
        assert_eq!(
            provider.metric_samples[0].bucket.as_ref().unwrap().day,
            "2026-06-01"
        );
        assert_eq!(provider.payload["usage"]["accessToken"], REDACTED_VALUE);
        assert!(
            !serde_json::to_string(&provider.payload)
                .unwrap()
                .contains("secret-token")
        );
    }

    #[test]
    fn redaction_scrubs_secret_shaped_fields() {
        let redacted = redact_json_value(json!({
            "accessToken": "secret",
            "nested": {
                "api_key": "also-secret",
                "ordinary": "keep"
            },
            "items": [{ "refreshToken": "refresh" }]
        }));

        assert_eq!(redacted["accessToken"], REDACTED_VALUE);
        assert_eq!(redacted["nested"]["api_key"], REDACTED_VALUE);
        assert_eq!(redacted["nested"]["ordinary"], "keep");
        assert_eq!(redacted["items"][0]["refreshToken"], REDACTED_VALUE);
        assert!(!serde_json::to_string(&redacted).unwrap().contains("secret"));
    }
}
