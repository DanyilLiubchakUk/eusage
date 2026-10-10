use super::client::{
    ProviderAccountUpdateRequest, ProviderAccountUpdateResult, send_provider_account_update_http,
};
use super::provider_accounts::shared_provider_account_for_label_update;
use super::settings::{
    TeamConnectionSettings, clear_connection_with, connection_key, load_connection,
    mark_connection_error, mark_connection_success, read_connection_with_token, valid_connection,
};
use std::path::Path;
use std::time::Duration;

const REQUEST_TIMEOUT: Duration = Duration::from_secs(5);

pub(crate) fn update_shared_provider_account_label(
    app_data_dir: &Path,
    provider_id: &str,
    local_account_fingerprint: &str,
    label: &str,
) -> Result<(), String> {
    update_shared_provider_account_label_with(
        app_data_dir,
        provider_id,
        local_account_fingerprint,
        label,
        REQUEST_TIMEOUT,
        || crate::team_credentials::read_team_token(),
        send_provider_account_update_http,
        || crate::team_credentials::delete_team_token(),
    )
}

fn update_shared_provider_account_label_with<R, F, D>(
    app_data_dir: &Path,
    provider_id: &str,
    local_account_fingerprint: &str,
    label: &str,
    timeout: Duration,
    read_team_token: R,
    send_update: F,
    delete_team_token: D,
) -> Result<(), String>
where
    R: Fn() -> Result<Option<String>, String>,
    F: Fn(
        &TeamConnectionSettings,
        &str,
        &ProviderAccountUpdateRequest,
        Duration,
    ) -> ProviderAccountUpdateResult,
    D: Fn() -> Result<(), String>,
{
    let connection =
        load_connection(app_data_dir).ok_or_else(|| "No Team connection is saved.".to_string())?;
    if !valid_connection(&connection) {
        return Err("Saved Team connection is incomplete.".to_string());
    }

    let snapshot = crate::local_http_api::cached_snapshot(provider_id).ok_or_else(|| {
        "Shared Provider Account needs a fresh provider scan before updating Team metadata."
            .to_string()
    })?;
    let shared_account = shared_provider_account_for_label_update(
        app_data_dir,
        &connection.team_fingerprint,
        &snapshot,
        local_account_fingerprint,
        label,
    )?;
    let (connection, token) =
        match read_connection_with_token(app_data_dir, Some(&connection_key(&connection)), || {
            shared_provider_account_for_label_update(
                app_data_dir,
                &connection.team_fingerprint,
                &snapshot,
                local_account_fingerprint,
                label,
            )?;
            read_team_token()
        }) {
            Ok(Some(snapshot)) => snapshot,
            Ok(None) => return Err("Team connection changed before updating metadata.".to_string()),
            Err(error) => {
                mark_connection_error(app_data_dir, &connection, &error);
                return Err(error);
            }
        };

    let request = ProviderAccountUpdateRequest {
        provider_id: snapshot.provider_id,
        provider_account_fingerprint: shared_account.team_account_fingerprint,
        provider_account_label: shared_account.label,
        status: "shared",
    };

    match send_update(&connection, &token, &request, timeout) {
        ProviderAccountUpdateResult::Success { server_time } => {
            mark_connection_success(app_data_dir, &connection, &server_time);
            Ok(())
        }
        ProviderAccountUpdateResult::Retryable { message } => {
            mark_connection_error(app_data_dir, &connection, &message);
            log::warn!("provider account metadata update failed: {}", message);
            Err(message)
        }
        ProviderAccountUpdateResult::InvalidToken { message } => {
            if let Err(error) =
                clear_connection_with(app_data_dir, &connection, &token, delete_team_token)
            {
                log::error!(
                    "provider account metadata invalid-token cleanup failed: {}",
                    error
                );
            }
            super::drop_pending_if_connection_matches(Some(&connection_key(&connection)));
            log::warn!("provider account metadata update stopped: {}", message);
            Err(message)
        }
    }
}
