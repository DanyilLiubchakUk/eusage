use super::payload::{build_provider_account_output_upload, build_provider_upload};
use super::provider_accounts::{
    shared_provider_account_for_account_output_label_update,
    shared_provider_account_for_label_update,
};
use super::settings::{connection_key, load_connection, valid_connection};
use crate::local_http_api::cache::CachedPluginSnapshot;
use serde::Serialize;
use std::path::Path;
use std::time::Duration;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CurrentSharedProviderAccountUploadResult {
    pub current_data_queued: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct CurrentSharedProviderAccountEnqueue {
    current_data_queued: bool,
    should_start_worker: bool,
}

pub(crate) fn upload_current_shared_provider_account_data(
    app_data_dir: &Path,
    provider_id: &str,
    local_account_fingerprint: &str,
    label: &str,
) -> Result<CurrentSharedProviderAccountUploadResult, String> {
    let enqueue = enqueue_current_shared_provider_account_data_with(
        app_data_dir,
        provider_id,
        local_account_fingerprint,
        label,
        crate::local_http_api::cached_snapshot,
    )?;

    if enqueue.should_start_worker {
        std::thread::spawn(move || super::debounced_upload_worker(Duration::ZERO));
    }

    Ok(CurrentSharedProviderAccountUploadResult {
        current_data_queued: enqueue.current_data_queued,
    })
}

fn enqueue_current_shared_provider_account_data_with<R>(
    app_data_dir: &Path,
    provider_id: &str,
    local_account_fingerprint: &str,
    label: &str,
    read_cached_snapshot: R,
) -> Result<CurrentSharedProviderAccountEnqueue, String>
where
    R: Fn(&str) -> Option<CachedPluginSnapshot>,
{
    let provider_id = provider_id.trim();
    if provider_id.is_empty() {
        return Err("Provider ID is required.".to_string());
    }

    let local_account_fingerprint = local_account_fingerprint.trim();
    if local_account_fingerprint.is_empty() {
        return Err("Provider Account fingerprint is required.".to_string());
    }

    let label = label.trim();
    if label.is_empty() {
        return Err("Provider Account label is required.".to_string());
    }

    let Some(connection) = load_connection(app_data_dir) else {
        return Ok(CurrentSharedProviderAccountEnqueue {
            current_data_queued: false,
            should_start_worker: false,
        });
    };
    if !valid_connection(&connection) {
        return Err("Saved Team connection is incomplete.".to_string());
    }

    let Some(snapshot) = read_cached_snapshot(provider_id) else {
        return Ok(CurrentSharedProviderAccountEnqueue {
            current_data_queued: false,
            should_start_worker: false,
        });
    };

    let mut account_bound_queued = false;
    let mut should_start_worker = false;
    for account_output in &snapshot.provider_account_outputs {
        let shared_account = match shared_provider_account_for_account_output_label_update(
            app_data_dir,
            &connection.team_fingerprint,
            &snapshot.provider_id,
            account_output,
            local_account_fingerprint,
            label,
        ) {
            Ok(account) => account,
            Err(error) => {
                log::debug!("current Provider Account upload skipped: {}", error);
                continue;
            }
        };
        let provider = build_provider_account_output_upload(&snapshot, account_output)
            .attach_provider_account(
                &shared_account.team_account_fingerprint,
                &shared_account.label,
            );
        should_start_worker |= super::enqueue_provider_upload(
            app_data_dir.to_path_buf(),
            connection_key(&connection),
            shared_account.local_account_fingerprint,
            provider,
        );
        account_bound_queued = true;
    }
    if account_bound_queued {
        return Ok(CurrentSharedProviderAccountEnqueue {
            current_data_queued: true,
            should_start_worker,
        });
    }

    let shared_account = match shared_provider_account_for_label_update(
        app_data_dir,
        &connection.team_fingerprint,
        &snapshot,
        local_account_fingerprint,
        label,
    ) {
        Ok(account) => account,
        Err(error) => {
            log::debug!("current Provider Account upload skipped: {}", error);
            return Ok(CurrentSharedProviderAccountEnqueue {
                current_data_queued: false,
                should_start_worker: false,
            });
        }
    };

    let provider = build_provider_upload(&snapshot).attach_provider_account(
        &shared_account.team_account_fingerprint,
        &shared_account.label,
    );

    let should_start_worker = super::enqueue_provider_upload(
        app_data_dir.to_path_buf(),
        connection_key(&connection),
        shared_account.local_account_fingerprint,
        provider,
    );
    Ok(CurrentSharedProviderAccountEnqueue {
        current_data_queued: true,
        should_start_worker,
    })
}

#[cfg(test)]
#[path = "current_data_upload_tests.rs"]
mod tests;
