use serde_json::{Map, Value};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};

pub(crate) const FILE_NAME: &str = "settings.json";
static SETTINGS_WRITE: Mutex<()> = Mutex::new(());

#[cfg(not(test))]
#[derive(Clone)]
pub(crate) struct Settings(Arc<tauri_plugin_store::Store<tauri::Wry>>);

#[cfg(not(test))]
static STORE: OnceLock<(PathBuf, Settings)> = OnceLock::new();

#[cfg(not(test))]
pub(crate) fn init(app: &tauri::AppHandle, app_data_dir: &Path) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;
    let store = app.store(FILE_NAME).map_err(|error| error.to_string())?;
    STORE
        .set((app_data_dir.to_path_buf(), Settings(store)))
        .map_err(|_| "Settings store is already initialized.".to_string())
}

#[cfg(not(test))]
fn store(app_data_dir: &Path) -> Result<Settings, String> {
    STORE
        .get()
        .filter(|(path, _)| path == app_data_dir)
        .map(|(_, store)| store.clone())
        .ok_or_else(|| "Settings store is not initialized for this app.".to_string())
}

pub(crate) fn with_team_settings<T>(
    app_data_dir: &Path,
    operation: impl FnOnce(&Settings) -> Result<T, String>,
) -> Result<T, String> {
    static TEAM_MUTATION: Mutex<()> = Mutex::new(());
    let _guard = TEAM_MUTATION.lock().map_err(|error| error.to_string())?;
    operation(&store(app_data_dir)?)
}

pub(crate) fn read_snapshot(app_data_dir: &Path) -> Result<Value, String> {
    let _guard = SETTINGS_WRITE.lock().map_err(|error| error.to_string())?;
    Ok(Value::Object(store(app_data_dir)?.entries()))
}

pub(crate) fn snapshot(app_data_dir: &Path) -> Option<Value> {
    match read_snapshot(app_data_dir) {
        Ok(value) => Some(value),
        Err(error) => {
            log::error!("Settings read failed: {}", error);
            None
        }
    }
}

pub(crate) fn with_settings_write<T>(
    operation: impl FnOnce() -> Result<T, String>,
) -> Result<T, String> {
    let _guard = SETTINGS_WRITE.lock().map_err(|error| error.to_string())?;
    operation()
}

#[cfg(not(test))]
impl Settings {
    pub(crate) fn get(&self, key: &str) -> Option<Value> {
        self.0.get(key)
    }
    pub(crate) fn set(&self, key: &str, value: Value) {
        self.0.set(key, value);
    }
    pub(crate) fn delete(&self, key: &str) {
        self.0.delete(key);
    }
    pub(crate) fn entries(&self) -> Map<String, Value> {
        self.0.entries().into_iter().collect()
    }
    pub(crate) fn save(&self) -> Result<(), String> {
        self.0.save().map_err(|error| error.to_string())
    }
}

#[cfg(test)]
#[derive(Default)]
struct TestStore {
    values: Map<String, Value>,
    fail_next_save: bool,
}

#[cfg(test)]
#[derive(Clone)]
pub(crate) struct Settings(Arc<Mutex<TestStore>>);

#[cfg(test)]
fn test_stores() -> &'static Mutex<std::collections::HashMap<PathBuf, Settings>> {
    static STORES: OnceLock<Mutex<std::collections::HashMap<PathBuf, Settings>>> = OnceLock::new();
    STORES.get_or_init(|| Mutex::new(std::collections::HashMap::new()))
}

// Tests register synthetic values explicitly; no test ever falls back to real files.
#[cfg(test)]
pub(crate) fn set_test_settings(app_data_dir: &Path, value: Value) {
    test_stores().lock().unwrap().insert(
        app_data_dir.to_path_buf(),
        Settings(Arc::new(Mutex::new(TestStore {
            values: value
                .as_object()
                .expect("synthetic settings object")
                .clone(),
            fail_next_save: false,
        }))),
    );
}

#[cfg(test)]
fn store(app_data_dir: &Path) -> Result<Settings, String> {
    test_stores()
        .lock()
        .unwrap()
        .get(app_data_dir)
        .cloned()
        .ok_or_else(|| "Synthetic settings store is not registered.".to_string())
}

#[cfg(test)]
pub(crate) fn fail_next_save(app_data_dir: &Path) {
    store(app_data_dir)
        .unwrap()
        .0
        .lock()
        .unwrap()
        .fail_next_save = true;
}

#[cfg(test)]
pub(crate) fn set_test_value(app_data_dir: &Path, key: &str, value: Value) {
    store(app_data_dir).unwrap().set(key, value);
}

#[cfg(test)]
impl Settings {
    pub(crate) fn get(&self, key: &str) -> Option<Value> {
        self.0.lock().unwrap().values.get(key).cloned()
    }
    pub(crate) fn set(&self, key: &str, value: Value) {
        self.0.lock().unwrap().values.insert(key.to_string(), value);
    }
    pub(crate) fn delete(&self, key: &str) {
        self.0.lock().unwrap().values.remove(key);
    }
    pub(crate) fn entries(&self) -> Map<String, Value> {
        self.0.lock().unwrap().values.clone()
    }
    pub(crate) fn save(&self) -> Result<(), String> {
        if std::mem::take(&mut self.0.lock().unwrap().fail_next_save) {
            Err("Synthetic settings save failed.".to_string())
        } else {
            Ok(())
        }
    }
}
