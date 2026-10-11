use super::super::{
    Duration, EncryptionType, Operation, SecretService, TEAM_TOKEN_ACCOUNT, TEAM_TOKEN_SERVICE,
    bounded, keyring_error,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use zbus::{
    Connection,
    connection::Builder,
    zvariant::{OwnedObjectPath, OwnedValue, Type, Value},
};

const ROOT: &str = "/org/freedesktop/secrets";
const COLLECTION: &str = "/org/freedesktop/secrets/collection/test";
const SESSION: &str = "/org/freedesktop/secrets/session/test";
pub(super) const LEAK: &str = "dummy-sensitive-provider-detail";
pub(super) type Shared = Arc<Mutex<State>>;

#[derive(Clone, Debug, PartialEq)]
pub(super) struct Entry {
    pub(super) attributes: HashMap<String, String>,
    pub(super) bytes: Vec<u8>,
    pub(super) locked: bool,
}
#[derive(Default)]
pub(super) struct State {
    pub(super) entries: HashMap<u32, Entry>,
    pub(super) collection_locked: bool,
    pub(super) missing_collection: bool,
    pub(super) fail: Option<&'static str>,
    pub(super) queries: Vec<HashMap<String, String>>,
    pub(super) aliases: Vec<String>,
    pub(super) creates: Vec<bool>,
}
fn path(value: &str) -> OwnedObjectPath {
    value.try_into().unwrap()
}
fn item_path(id: u32) -> OwnedObjectPath {
    path(&format!("{COLLECTION}/item{id}"))
}
pub(super) fn owned_attributes() -> HashMap<String, String> {
    HashMap::from([
        ("application", "app.eusage.desktop"),
        ("service", TEAM_TOKEN_SERVICE),
        ("account", TEAM_TOKEN_ACCOUNT),
    ])
    .into_iter()
    .map(|(key, value)| (key.to_string(), value.to_string()))
    .collect()
}
pub(super) fn entry(bytes: &[u8]) -> Entry {
    Entry {
        attributes: owned_attributes(),
        bytes: bytes.to_vec(),
        locked: false,
    }
}
pub(super) fn failed() -> zbus::fdo::Error {
    zbus::fdo::Error::Failed(LEAK.to_string())
}

#[derive(Debug, Serialize, Deserialize, Type)]
struct Secret {
    session: OwnedObjectPath,
    parameters: Vec<u8>,
    value: Vec<u8>,
    content_type: String,
}

struct Service(Shared);
#[zbus::interface(name = "org.freedesktop.Secret.Service")]
impl Service {
    fn open_session(
        &self,
        algorithm: &str,
        _input: OwnedValue,
    ) -> zbus::fdo::Result<(OwnedValue, OwnedObjectPath)> {
        assert_eq!(algorithm, "plain"); // Dummy fixture only; production negotiates DH.
        if self.0.lock().unwrap().fail == Some("session") {
            return Err(failed());
        }
        Ok((Value::from("").try_into().unwrap(), path(SESSION)))
    }
    fn read_alias(&self, name: &str) -> zbus::fdo::Result<OwnedObjectPath> {
        let mut state = self.0.lock().unwrap();
        state.aliases.push(name.to_string());
        if state.fail == Some("alias") {
            return Err(failed());
        }
        Ok(path(if state.missing_collection {
            "/"
        } else {
            COLLECTION
        }))
    }
    #[zbus(property)]
    fn collections(&self) -> Vec<OwnedObjectPath> {
        vec![path(COLLECTION)]
    }
}

struct Collection(Shared);
#[zbus::interface(name = "org.freedesktop.Secret.Collection")]
impl Collection {
    #[zbus(property)]
    fn locked(&self) -> bool {
        self.0.lock().unwrap().collection_locked
    }
    fn search_items(
        &self,
        attributes: HashMap<String, String>,
    ) -> zbus::fdo::Result<Vec<OwnedObjectPath>> {
        let mut state = self.0.lock().unwrap();
        state.queries.push(attributes.clone());
        if state.fail == Some("search") {
            return Err(failed());
        }
        Ok(state
            .entries
            .iter()
            .filter(|(_, entry)| {
                attributes
                    .iter()
                    .all(|(key, value)| entry.attributes.get(key) == Some(value))
            })
            .map(|(id, _)| item_path(*id))
            .collect())
    }
    async fn create_item(
        &self,
        mut properties: HashMap<String, OwnedValue>,
        secret: Secret,
        replace: bool,
        #[zbus(object_server)] server: &zbus::ObjectServer,
    ) -> zbus::fdo::Result<(OwnedObjectPath, OwnedObjectPath)> {
        assert_eq!(
            String::try_from(
                properties
                    .remove("org.freedesktop.Secret.Item.Label")
                    .unwrap()
            )
            .unwrap(),
            TEAM_TOKEN_SERVICE
        );
        let attributes = HashMap::<String, String>::try_from(
            properties
                .remove("org.freedesktop.Secret.Item.Attributes")
                .unwrap(),
        )
        .unwrap();
        assert!(properties.is_empty());
        assert_eq!(attributes, owned_attributes());
        assert_eq!(secret.session.as_str(), SESSION);
        assert!(secret.parameters.is_empty());
        assert_eq!(secret.content_type, "text/plain");
        let id = {
            let mut state = self.0.lock().unwrap();
            if state.fail == Some("create") {
                return Err(failed());
            }
            state.creates.push(replace);
            let id = if replace {
                state
                    .entries
                    .iter()
                    .find(|(_, entry)| entry.attributes == attributes)
                    .map(|(id, _)| *id)
            } else {
                None
            }
            .unwrap_or_else(|| state.entries.keys().copied().max().unwrap_or(0) + 1);
            state.entries.insert(
                id,
                Entry {
                    attributes,
                    bytes: secret.value,
                    locked: false,
                },
            );
            id
        };
        server
            .at(item_path(id), Item(self.0.clone(), id))
            .await
            .map_err(|_| failed())?;
        Ok((item_path(id), path("/")))
    }
}

struct Item(Shared, u32);
#[zbus::interface(name = "org.freedesktop.Secret.Item")]
impl Item {
    #[zbus(property)]
    fn locked(&self) -> bool {
        self.0.lock().unwrap().entries[&self.1].locked
    }
    fn get_secret(&self, session: OwnedObjectPath) -> zbus::fdo::Result<Secret> {
        let state = self.0.lock().unwrap();
        if state.fail == Some("read") {
            return Err(failed());
        }
        assert_eq!(session.as_str(), SESSION);
        Ok(Secret {
            session,
            parameters: vec![],
            value: state.entries[&self.1].bytes.clone(),
            content_type: "text/plain".to_string(),
        })
    }
    fn set_secret(&self, secret: Secret) -> zbus::fdo::Result<()> {
        let mut state = self.0.lock().unwrap();
        if state.fail == Some("write") {
            return Err(failed());
        }
        assert_eq!(secret.session.as_str(), SESSION);
        assert!(secret.parameters.is_empty());
        assert_eq!(secret.content_type, "text/plain");
        state.entries.get_mut(&self.1).unwrap().bytes = secret.value;
        Ok(())
    }
    fn delete(&self) -> zbus::fdo::Result<OwnedObjectPath> {
        let mut state = self.0.lock().unwrap();
        if state.fail == Some("delete") {
            return Err(failed());
        }
        state.entries.remove(&self.1);
        Ok(path("/"))
    }
}

pub(super) struct Fixture {
    pub(super) state: Shared,
    _server: Connection,
    pub(super) client: Connection,
}
impl Fixture {
    pub(super) async fn new(entries: HashMap<u32, Entry>, service: bool) -> Self {
        let state = Arc::new(Mutex::new(State {
            entries,
            ..State::default()
        }));
        let (server, client) = tokio::net::UnixStream::pair().unwrap();
        let mut server = Builder::unix_stream(server)
            .server(zbus::Guid::generate())
            .unwrap()
            .p2p()
            .serve_at(COLLECTION, Collection(state.clone()))
            .unwrap();
        if service {
            server = server.serve_at(ROOT, Service(state.clone())).unwrap();
        }
        for id in state.lock().unwrap().entries.keys() {
            server = server
                .serve_at(item_path(*id), Item(state.clone(), *id))
                .unwrap();
        }
        let (server, client) =
            tokio::join!(server.build(), Builder::unix_stream(client).p2p().build());
        Self {
            state,
            _server: server.unwrap(),
            client: client.unwrap(),
        }
    }
    async fn service(&self) -> SecretService<'static> {
        bounded(Duration::from_secs(2), async {
            SecretService::connect_with_existing(EncryptionType::Plain, self.client.clone())
                .await
                .map_err(keyring_error)
        })
        .await
        .unwrap()
    }
    pub(super) async fn perform(&self, operation: Operation<'_>) -> Result<Option<String>, String> {
        let service = self.service().await;
        bounded(
            Duration::from_secs(2),
            super::super::perform(&service, operation),
        )
        .await
    }
}
