use base64::{Engine, engine::general_purpose::STANDARD};
use minisign_verify::{PublicKey, Signature};
use std::{error::Error, fs, io::Read, path::Path};

type Result<T> = std::result::Result<T, Box<dyn Error>>;

fn decode(value: &str) -> Result<String> {
    Ok(String::from_utf8(STANDARD.decode(value.trim())?)?)
}

fn verify(mut artifact: impl Read, public_key: &str, signature: &str) -> Result<()> {
    let key = PublicKey::decode(&decode(public_key)?)?;
    let signature = Signature::decode(&decode(signature)?)?;
    // Current Tauri artifacts use prehashed Minisign signatures. Stream large
    // AppImages through the same verification library used by the updater.
    let mut verifier = key.verify_stream(&signature)?;
    let mut buffer = [0; 8192];
    loop {
        let read = artifact.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        verifier.update(&buffer[..read]);
    }
    verifier.finalize()?;
    Ok(())
}

fn verify_directory(directory: &Path, public_key: &str) -> Result<usize> {
    let mut count = 0;
    for entry in fs::read_dir(directory)? {
        let entry = entry?;
        let path = entry.path();
        let kind = entry.file_type()?;
        if kind.is_dir() {
            count += verify_directory(&path, public_key)?;
        } else if kind.is_file() && path.extension().is_some_and(|ext| ext == "sig") {
            let artifact = path.with_extension("");
            verify(
                fs::File::open(&artifact)?,
                public_key,
                &fs::read_to_string(&path)?,
            )
            .map_err(|error| format!("{}: {error}", artifact.display()))?;
            println!("Verified {}", artifact.display());
            count += 1;
        }
    }
    Ok(count)
}

fn main() -> Result<()> {
    let args: Vec<_> = std::env::args_os().skip(1).collect();
    if args.len() != 2 {
        return Err("Usage: verify-updater-artifacts <tauri.conf.json> <bundle-directory>".into());
    }
    let config: serde_json::Value = serde_json::from_slice(&fs::read(&args[0])?)?;
    let public_key = config["plugins"]["updater"]["pubkey"]
        .as_str()
        .ok_or("Missing updater public key")?;
    let count = verify_directory(Path::new(&args[1]), public_key)?;
    if count == 0 {
        return Err("No updater signatures found".into());
    }
    println!("Verified {count} updater artifacts against the app's public key");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // Published dummy fixture from minisign-verify 0.2.5's MIT-licensed docs.
    // No private key or application signing credential is needed.
    const PUBLIC_KEY: &str =
        "untrusted comment: fixture\nRWQf6LRCGA9i53mlYecO4IzT51TGPpvWucNSCh1CBM0QTaLn73Y7GFO3";
    const SIGNATURE: &str = "untrusted comment: signature from minisign secret key\nRUQf6LRCGA9i559r3g7V1qNyJDApGip8MfqcadIgT9CuhV3EMhHoN1mGTkUidF/z7SrlQgXdy8ofjb7bNJJylDOocrCo8KLzZwo=\ntrusted comment: timestamp:1633700835\tfile:test\tprehashed\nwLMDjy9FLAuxZ3q4NlEvkgtyhrr0gtTu6KC4KBJdITbbOeAi1zBIYo0v4iTgt8jJpIidRJnp94ABQkJAgAooBQ==";

    #[test]
    fn accepts_valid_artifact_and_rejects_tampering_or_wrong_key() {
        let key = STANDARD.encode(PUBLIC_KEY);
        let signature = STANDARD.encode(SIGNATURE);
        assert!(verify(&b"test"[..], &key, &signature).is_ok());
        assert!(verify(&b"changed"[..], &key, &signature).is_err());
        let wrong_key = STANDARD.encode(PUBLIC_KEY.replace("RWQf", "RWQg"));
        assert!(verify(&b"test"[..], &wrong_key, &signature).is_err());
        let changed_comment = STANDARD.encode(SIGNATURE.replace("file:test", "file:changed"));
        assert!(verify(&b"test"[..], &key, &changed_comment).is_err());
        assert!(verify(&b"test"[..], &key, "malformed").is_err());
    }
}
