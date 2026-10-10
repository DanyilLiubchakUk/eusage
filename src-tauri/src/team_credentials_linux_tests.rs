use super::*;
use std::sync::{
    Arc,
    atomic::{AtomicBool, Ordering},
};

#[path = "team_credentials_linux_tests/fixture.rs"]
mod fixture;
use fixture::*;

#[tokio::test]
async fn missing_read_save_replacement_delete_and_foreign_attributes() {
    let mut foreign = HashMap::new();
    for (id, key) in [(1, "application"), (2, "service"), (3, "account")] {
        let mut value = entry(b"foreign-dummy-token");
        value
            .attributes
            .insert(key.to_string(), "other-application".to_string());
        foreign.insert(id, value);
    }
    let fixture = Fixture::new(foreign.clone(), true).await;
    assert_eq!(fixture.perform(Operation::Read).await.unwrap(), None);
    fixture.perform(Operation::Delete).await.unwrap();
    fixture
        .perform(Operation::Save("dummy-first"))
        .await
        .unwrap();
    assert_eq!(
        fixture.perform(Operation::Read).await.unwrap().as_deref(),
        Some("dummy-first")
    );
    fixture
        .perform(Operation::Save("dummy-replacement"))
        .await
        .unwrap();
    assert_eq!(
        fixture.perform(Operation::Read).await.unwrap().as_deref(),
        Some("dummy-replacement")
    );
    assert_eq!(fixture.state.lock().unwrap().entries.len(), 4);
    fixture.perform(Operation::Delete).await.unwrap();
    fixture.perform(Operation::Delete).await.unwrap();
    let state = fixture.state.lock().unwrap();
    assert_eq!(state.entries, foreign);
    assert!(
        state
            .queries
            .iter()
            .all(|query| query == &owned_attributes())
    );
    assert!(state.aliases.iter().all(|alias| alias == "default"));
    assert_eq!(state.creates, [true]);
}

#[tokio::test]
async fn locked_collection_or_item_preserves_tokens_for_every_operation() {
    for lock_collection in [true, false] {
        let mut value = entry(b"dummy-kept");
        value.locked = !lock_collection;
        let original = HashMap::from([(1, value)]);
        let fixture = Fixture::new(original.clone(), true).await;
        fixture.state.lock().unwrap().collection_locked = lock_collection;
        for operation in [
            Operation::Read,
            Operation::Save("dummy-new"),
            Operation::Delete,
        ] {
            assert!(
                fixture
                    .perform(operation)
                    .await
                    .unwrap_err()
                    .contains("locked")
            );
            assert_eq!(fixture.state.lock().unwrap().entries, original);
        }
    }
}

#[tokio::test]
async fn missing_default_or_service_is_an_error_without_fallback_or_mutation() {
    let original = HashMap::from([(1, entry(b"dummy-kept"))]);
    let fixture = Fixture::new(original.clone(), true).await;
    fixture.state.lock().unwrap().missing_collection = true;
    for operation in [
        Operation::Read,
        Operation::Save("dummy-new"),
        Operation::Delete,
    ] {
        assert!(
            fixture
                .perform(operation)
                .await
                .unwrap_err()
                .contains("default")
        );
    }
    assert_eq!(fixture.state.lock().unwrap().entries, original);
    assert_eq!(
        fixture.state.lock().unwrap().aliases,
        ["default", "default", "default"]
    );
    let missing = Fixture::new(original.clone(), false).await;
    let result = bounded(Duration::from_secs(2), async {
        SecretService::connect_with_existing(EncryptionType::Plain, missing.client.clone())
            .await
            .map(|_| ())
            .map_err(keyring_error)
    })
    .await;
    let error = result.unwrap_err();
    assert!(!error.contains("timed out"));
    assert!(!error.contains(LEAK));
    assert_eq!(missing.state.lock().unwrap().entries, original);
}

#[tokio::test]
async fn duplicates_malformed_tokens_and_provider_errors_never_mutate_or_leak() {
    let duplicate = Fixture::new(
        HashMap::from([(1, entry(b"dummy-one")), (2, entry(b"dummy-two"))]),
        true,
    )
    .await;
    for operation in [
        Operation::Read,
        Operation::Save("dummy-new"),
        Operation::Delete,
    ] {
        assert!(
            duplicate
                .perform(operation)
                .await
                .unwrap_err()
                .contains("Multiple")
        );
    }
    assert_eq!(duplicate.state.lock().unwrap().entries.len(), 2);
    for bytes in [vec![0xff], b" \n".to_vec()] {
        let fixture = Fixture::new(HashMap::from([(1, entry(&bytes))]), true).await;
        let error = fixture.perform(Operation::Read).await.unwrap_err();
        assert!(error.contains("UTF-8") || error.contains("empty"));
        assert_eq!(fixture.state.lock().unwrap().entries[&1].bytes, bytes);
    }
    for (failure, operation) in [
        ("alias", Operation::Read),
        ("search", Operation::Read),
        ("read", Operation::Read),
        ("write", Operation::Save("dummy-new")),
        ("delete", Operation::Delete),
    ] {
        let original = HashMap::from([(1, entry(b"dummy-kept"))]);
        let fixture = Fixture::new(original.clone(), true).await;
        fixture.state.lock().unwrap().fail = Some(failure);
        let error = fixture.perform(operation).await.unwrap_err();
        assert!(!error.contains(LEAK));
        assert!(!error.contains("dummy-kept"));
        assert_eq!(fixture.state.lock().unwrap().entries, original);
    }
    let create = Fixture::new(HashMap::new(), true).await;
    create.state.lock().unwrap().fail = Some("create");
    let error = create
        .perform(Operation::Save("dummy-new"))
        .await
        .unwrap_err();
    assert!(!error.contains(LEAK));
    assert!(!error.contains("dummy-new"));
    assert!(create.state.lock().unwrap().entries.is_empty());
    let session = Fixture::new(HashMap::from([(1, entry(b"dummy-kept"))]), true).await;
    session.state.lock().unwrap().fail = Some("session");
    let error = bounded(Duration::from_secs(2), async {
        SecretService::connect_with_existing(EncryptionType::Plain, session.client.clone())
            .await
            .map(|_| ())
            .map_err(keyring_error)
    })
    .await
    .unwrap_err();
    assert!(!error.contains(LEAK));
    assert!(!error.contains("dummy-kept"));
    assert_eq!(
        session.state.lock().unwrap().entries,
        HashMap::from([(1, entry(b"dummy-kept"))])
    );
}

#[tokio::test]
async fn bounded_deadline_drops_pending_work_and_preserves_safe_errors() {
    struct Dropped(Arc<AtomicBool>);
    impl Drop for Dropped {
        fn drop(&mut self) {
            self.0.store(true, Ordering::SeqCst);
        }
    }
    let dropped = Arc::new(AtomicBool::new(false));
    let guard = Dropped(dropped.clone());
    let result: Result<(), String> = bounded(Duration::from_millis(5), async move {
        let _guard = guard;
        std::future::pending().await
    })
    .await;
    assert!(result.unwrap_err().contains("timed out"));
    assert!(dropped.load(Ordering::SeqCst));
    assert_eq!(
        bounded(Duration::from_secs(1), async {
            Err::<(), _>("safe error".to_string())
        })
        .await
        .unwrap_err(),
        "safe error"
    );
    for error in [
        Error::Locked,
        Error::NoResult,
        Error::Unavailable,
        Error::Prompt,
        Error::PromptDisconnected,
        Error::Crypto(LEAK),
        Error::ZbusFdo(failed()),
        Error::Zbus(zbus::Error::Failure(LEAK.to_string())),
    ] {
        assert!(!keyring_error(error).contains(LEAK));
    }
}
