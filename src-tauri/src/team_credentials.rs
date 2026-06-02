#[cfg(target_os = "macos")]
use std::ffi::OsString;

const TEAM_TOKEN_SERVICE: &str = "eUsage Developer Token";
const TEAM_TOKEN_ACCOUNT: &str = "team-sync";

pub fn save_team_token(token: &str) -> Result<(), String> {
    let token = normalize_token(token)?;
    save_os_token(&token)
}

pub fn read_team_token() -> Result<Option<String>, String> {
    read_os_token()
}

pub fn delete_team_token() -> Result<(), String> {
    delete_os_token()
}

fn normalize_token(token: &str) -> Result<String, String> {
    let token = token.trim();
    if token.is_empty() {
        return Err("Developer token is required.".to_string());
    }
    Ok(token.to_string())
}

#[cfg(target_os = "macos")]
fn save_os_token(token: &str) -> Result<(), String> {
    run_security_command(&keychain_add_generic_password_args(token)).map(|_| ())
}

#[cfg(target_os = "macos")]
fn read_os_token() -> Result<Option<String>, String> {
    match run_security_command(&keychain_find_generic_password_args()) {
        Ok(value) => Ok(Some(value.trim_end_matches(['\r', '\n']).to_string())),
        Err(error) if is_macos_keychain_not_found(&error) => Ok(None),
        Err(error) => Err(error),
    }
}

#[cfg(target_os = "macos")]
fn delete_os_token() -> Result<(), String> {
    match run_security_command(&keychain_delete_generic_password_args()) {
        Ok(_) => Ok(()),
        Err(error) if is_macos_keychain_not_found(&error) => Ok(()),
        Err(error) => Err(error),
    }
}

#[cfg(target_os = "macos")]
fn run_security_command(args: &[OsString]) -> Result<String, String> {
    let output = std::process::Command::new("security")
        .args(args)
        .output()
        .map_err(|error| format!("Failed to run macOS Keychain command: {}", error))?;

    if output.status.success() {
        return Ok(String::from_utf8_lossy(&output.stdout).into_owned());
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    Err(format!(
        "macOS Keychain command failed: {}",
        stderr.trim()
    ))
}

#[cfg(target_os = "macos")]
fn keychain_find_generic_password_args() -> Vec<OsString> {
    vec![
        OsString::from("find-generic-password"),
        OsString::from("-a"),
        OsString::from(TEAM_TOKEN_ACCOUNT),
        OsString::from("-s"),
        OsString::from(TEAM_TOKEN_SERVICE),
        OsString::from("-w"),
    ]
}

#[cfg(target_os = "macos")]
fn keychain_add_generic_password_args(token: &str) -> Vec<OsString> {
    vec![
        OsString::from("add-generic-password"),
        OsString::from("-U"),
        OsString::from("-a"),
        OsString::from(TEAM_TOKEN_ACCOUNT),
        OsString::from("-s"),
        OsString::from(TEAM_TOKEN_SERVICE),
        OsString::from("-w"),
        OsString::from(token),
    ]
}

#[cfg(target_os = "macos")]
fn keychain_delete_generic_password_args() -> Vec<OsString> {
    vec![
        OsString::from("delete-generic-password"),
        OsString::from("-a"),
        OsString::from(TEAM_TOKEN_ACCOUNT),
        OsString::from("-s"),
        OsString::from(TEAM_TOKEN_SERVICE),
    ]
}

#[cfg(target_os = "macos")]
fn is_macos_keychain_not_found(error: &str) -> bool {
    error.contains("could not be found")
        || error.contains("The specified item could not be found")
        || error.contains("-25300")
}

#[cfg(target_os = "windows")]
#[allow(non_snake_case)]
mod windows_credentials {
    use std::ffi::{OsStr, c_void};
    use std::os::windows::ffi::OsStrExt;
    use std::ptr;

    use super::{TEAM_TOKEN_ACCOUNT, TEAM_TOKEN_SERVICE};

    const CRED_TYPE_GENERIC: u32 = 1;
    const CRED_PERSIST_LOCAL_MACHINE: u32 = 2;
    const ERROR_NOT_FOUND: u32 = 1168;

    #[repr(C)]
    struct FILETIME {
        dwLowDateTime: u32,
        dwHighDateTime: u32,
    }

    #[repr(C)]
    struct CREDENTIALW {
        Flags: u32,
        Type: u32,
        TargetName: *mut u16,
        Comment: *mut u16,
        LastWritten: FILETIME,
        CredentialBlobSize: u32,
        CredentialBlob: *mut u8,
        Persist: u32,
        AttributeCount: u32,
        Attributes: *mut c_void,
        TargetAlias: *mut u16,
        UserName: *mut u16,
    }

    #[link(name = "Advapi32")]
    unsafe extern "system" {
        fn CredWriteW(credential: *const CREDENTIALW, flags: u32) -> i32;
        fn CredReadW(
            target_name: *const u16,
            credential_type: u32,
            flags: u32,
            credential: *mut *mut CREDENTIALW,
        ) -> i32;
        fn CredDeleteW(target_name: *const u16, credential_type: u32, flags: u32) -> i32;
        fn CredFree(buffer: *const c_void);
    }

    #[link(name = "Kernel32")]
    unsafe extern "system" {
        fn GetLastError() -> u32;
    }

    pub fn save(token: &str) -> Result<(), String> {
        let mut target = wide_null(TEAM_TOKEN_SERVICE);
        let mut username = wide_null(TEAM_TOKEN_ACCOUNT);
        let token_bytes = token.as_bytes();
        if token_bytes.len() > u32::MAX as usize {
            return Err("Developer token is too large for Windows Credential Manager.".to_string());
        }

        let credential = CREDENTIALW {
            Flags: 0,
            Type: CRED_TYPE_GENERIC,
            TargetName: target.as_mut_ptr(),
            Comment: ptr::null_mut(),
            LastWritten: FILETIME {
                dwLowDateTime: 0,
                dwHighDateTime: 0,
            },
            CredentialBlobSize: token_bytes.len() as u32,
            CredentialBlob: token_bytes.as_ptr() as *mut u8,
            Persist: CRED_PERSIST_LOCAL_MACHINE,
            AttributeCount: 0,
            Attributes: ptr::null_mut(),
            TargetAlias: ptr::null_mut(),
            UserName: username.as_mut_ptr(),
        };

        let ok = unsafe { CredWriteW(&credential, 0) };
        if ok == 0 {
            return Err(format!(
                "Windows Credential Manager write failed: {}",
                last_windows_error()
            ));
        }
        Ok(())
    }

    pub fn read() -> Result<Option<String>, String> {
        let target = wide_null(TEAM_TOKEN_SERVICE);
        let mut credential: *mut CREDENTIALW = ptr::null_mut();
        let ok = unsafe {
            CredReadW(
                target.as_ptr(),
                CRED_TYPE_GENERIC,
                0,
                &mut credential as *mut *mut CREDENTIALW,
            )
        };

        if ok == 0 {
            let error = unsafe { GetLastError() };
            if error == ERROR_NOT_FOUND {
                return Ok(None);
            }
            return Err(format!(
                "Windows Credential Manager read failed: {}",
                windows_error(error)
            ));
        }

        if credential.is_null() {
            return Ok(None);
        }

        let result = unsafe {
            let blob = (*credential).CredentialBlob;
            let size = (*credential).CredentialBlobSize as usize;
            let value = if blob.is_null() || size == 0 {
                Ok(None)
            } else {
                let bytes = std::slice::from_raw_parts(blob, size);
                String::from_utf8(bytes.to_vec())
                    .map(Some)
                    .map_err(|error| format!("Stored developer token is not UTF-8: {}", error))
            };
            CredFree(credential.cast());
            value
        }?;

        Ok(result)
    }

    pub fn delete() -> Result<(), String> {
        let target = wide_null(TEAM_TOKEN_SERVICE);
        let ok = unsafe { CredDeleteW(target.as_ptr(), CRED_TYPE_GENERIC, 0) };
        if ok == 0 {
            let error = unsafe { GetLastError() };
            if error == ERROR_NOT_FOUND {
                return Ok(());
            }
            return Err(format!(
                "Windows Credential Manager delete failed: {}",
                windows_error(error)
            ));
        }
        Ok(())
    }

    fn wide_null(value: &str) -> Vec<u16> {
        OsStr::new(value).encode_wide().chain(Some(0)).collect()
    }

    fn last_windows_error() -> String {
        let error = unsafe { GetLastError() };
        windows_error(error)
    }

    fn windows_error(error: u32) -> String {
        std::io::Error::from_raw_os_error(error as i32).to_string()
    }
}

#[cfg(target_os = "windows")]
fn save_os_token(token: &str) -> Result<(), String> {
    windows_credentials::save(token)
}

#[cfg(target_os = "windows")]
fn read_os_token() -> Result<Option<String>, String> {
    windows_credentials::read()
}

#[cfg(target_os = "windows")]
fn delete_os_token() -> Result<(), String> {
    windows_credentials::delete()
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn save_os_token(_token: &str) -> Result<(), String> {
    Err("Team token credentials are supported on macOS and Windows only.".to_string())
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn read_os_token() -> Result<Option<String>, String> {
    Err("Team token credentials are supported on macOS and Windows only.".to_string())
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn delete_os_token() -> Result<(), String> {
    Err("Team token credentials are supported on macOS and Windows only.".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_token_rejects_blank_values() {
        assert_eq!(normalize_token(" eusage_dev_token ").unwrap(), "eusage_dev_token");
        assert!(normalize_token(" ").is_err());
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn macos_keychain_args_target_team_token() {
        let args = keychain_add_generic_password_args("secret");
        assert!(args.contains(&OsString::from(TEAM_TOKEN_ACCOUNT)));
        assert!(args.contains(&OsString::from(TEAM_TOKEN_SERVICE)));
        assert!(args.contains(&OsString::from("secret")));

        let delete_args = keychain_delete_generic_password_args();
        assert!(delete_args.contains(&OsString::from(TEAM_TOKEN_ACCOUNT)));
        assert!(delete_args.contains(&OsString::from(TEAM_TOKEN_SERVICE)));
    }
}
