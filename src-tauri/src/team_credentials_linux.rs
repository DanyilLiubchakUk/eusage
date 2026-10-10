use super::{TEAM_TOKEN_ACCOUNT, TEAM_TOKEN_SERVICE};
use secret_service::{EncryptionType, Error, SecretService};
use std::{collections::HashMap, future::Future, time::Duration};

const OPERATION_TIMEOUT: Duration = Duration::from_secs(15);

enum Operation<'a> {
    Read,
    Save(&'a str),
    Delete,
}

pub(super) fn read() -> Result<Option<String>, String> {
    run(Operation::Read)
}

pub(super) fn save(token: &str) -> Result<(), String> {
    run(Operation::Save(token)).map(|_| ())
}

pub(super) fn delete() -> Result<(), String> {
    run(Operation::Delete).map(|_| ())
}

fn run(operation: Operation<'_>) -> Result<Option<String>, String> {
    // Callers already use blocking workers. Dropping this per-call runtime also
    // stops local D-Bus tasks; a request already sent to the keyring can finish.
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|_| {
            "Could not start Linux keyring access. Retry the Team operation.".to_string()
        })?;
    runtime.block_on(bounded(OPERATION_TIMEOUT, async {
        let service = SecretService::connect(EncryptionType::Dh)
            .await
            .map_err(keyring_error)?;
        perform(&service, operation).await
    }))
}

async fn bounded<T>(
    timeout: Duration,
    operation: impl Future<Output = Result<T, String>>,
) -> Result<T, String> {
    tokio::time::timeout(timeout, operation)
        .await
        .map_err(|_| "Linux keyring timed out. Check your desktop keyring and retry.".to_string())?
}

fn attributes() -> HashMap<&'static str, &'static str> {
    HashMap::from([
        ("application", "app.eusage.desktop"),
        ("service", TEAM_TOKEN_SERVICE),
        ("account", TEAM_TOKEN_ACCOUNT),
    ])
}

async fn perform(
    service: &SecretService<'_>,
    operation: Operation<'_>,
) -> Result<Option<String>, String> {
    // Never create/unlock a collection or fall back to the transient session
    // collection. A locked/missing keyring must not look like a missing token.
    let collection = service
        .get_default_collection()
        .await
        .map_err(keyring_error)?;
    collection.ensure_unlocked().await.map_err(keyring_error)?;
    let items = collection
        .search_items(attributes())
        .await
        .map_err(keyring_error)?;
    if items.len() > 1 {
        return Err("Multiple eUsage Team tokens exist in the Linux keyring. Resolve the duplicate entries in your keyring manager and retry.".to_string());
    }
    let item = items.first();
    if let Some(item) = item {
        item.ensure_unlocked().await.map_err(keyring_error)?;
    }
    match operation {
        Operation::Read => match item {
            Some(item) => {
                let bytes = item.get_secret().await.map_err(keyring_error)?;
                let token = String::from_utf8(bytes)
                    .map_err(|_| "Stored Linux Team token is not valid UTF-8. Remove the invalid eUsage entry in your keyring manager, then reconnect.".to_string())?;
                if token.trim().is_empty() {
                    return Err("Stored Linux Team token is empty. Remove the invalid eUsage entry in your keyring manager, then reconnect.".to_string());
                }
                Ok(Some(token))
            }
            None => Ok(None),
        },
        Operation::Save(token) => {
            if let Some(item) = item {
                item.set_secret(token.as_bytes(), "text/plain")
                    .await
                    .map_err(keyring_error)?;
            } else {
                collection
                    .create_item(
                        TEAM_TOKEN_SERVICE,
                        attributes(),
                        token.as_bytes(),
                        true,
                        "text/plain",
                    )
                    .await
                    .map_err(keyring_error)?;
            }
            Ok(None)
        }
        Operation::Delete => {
            if let Some(item) = item {
                item.delete().await.map_err(keyring_error)?;
            }
            Ok(None)
        }
    }
}

fn keyring_error(error: Error) -> String {
    // Provider error text can contain secret payloads. Return fixed, actionable
    // messages instead of logging or forwarding D-Bus details.
    match error {
        Error::Locked => "Linux keyring is locked. Unlock it in your desktop keyring manager and retry.",
        Error::NoResult => "No default Linux keyring is available. Set up a persistent default keyring in your desktop keyring manager, then retry.",
        Error::Unavailable => "Linux Secret Service is unavailable. Start a desktop session with a Secret Service keyring, then retry.",
        Error::Prompt | Error::PromptDisconnected => "Linux keyring access was not approved. Retry and approve access in your desktop keyring.",
        _ => "Linux keyring access failed. Check that your desktop Secret Service keyring is available and unlocked, then retry.",
    }.to_string()
}

#[cfg(test)]
#[path = "team_credentials_linux_tests.rs"]
mod tests;
