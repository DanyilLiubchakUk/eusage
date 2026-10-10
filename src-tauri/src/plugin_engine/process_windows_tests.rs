use super::*;
use std::ffi::c_void;

#[link(name = "Kernel32")]
unsafe extern "system" {
    fn GetConsoleWindow() -> *mut c_void;
    fn OpenProcess(access: u32, inherit: i32, id: u32) -> *mut c_void;
    fn WaitForSingleObject(handle: *mut c_void, milliseconds: u32) -> u32;
    fn CloseHandle(handle: *mut c_void) -> i32;
}

fn fixture_command() -> Command {
    let mut command = background_command(std::env::current_exe().unwrap());
    let fixture = concat!(module_path!(), "::console_fixture")
        .split_once("::")
        .unwrap()
        .1;
    command
        .env_clear()
        .args(["--ignored", "--exact", fixture, "--nocapture"]);
    // System directory only; no provider environment or user profile is inherited.
    if let Some(system_root) = std::env::var_os("SystemRoot") {
        command.env("SystemRoot", system_root);
    }
    command
}

#[test]
fn windows_helper_has_no_console_and_captures_output() {
    let result = fixture_command()
        .output_with_timeout(Duration::from_secs(10))
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    assert!(String::from_utf8_lossy(&result.stdout).contains("dummy stdout without a console"));
    assert!(String::from_utf8_lossy(&result.stderr).contains("dummy stderr without a console"));
}

#[test]
fn windows_helper_timeout_returns_within_a_bounded_interval() {
    for _ in 0..3 {
        let started = Instant::now();
        let error = fixture_command()
            .env("EUSAGE_TEST_SLEEP", "1")
            .output_with_timeout(Duration::from_millis(250))
            .unwrap_err();
        assert_eq!(error.kind(), io::ErrorKind::TimedOut);
        assert!(started.elapsed() < Duration::from_secs(5));
    }
}

#[test]
fn windows_helper_output_limit_is_enforced() {
    let error = fixture_command()
        .env("EUSAGE_TEST_FLOOD", "1")
        .output_with_timeout(Duration::from_secs(10))
        .unwrap_err();
    assert!(error.to_string().contains("output exceeded"));
}

#[test]
fn windows_job_stops_descendants_on_timeout_and_success_without_harming_other_helpers() {
    struct Helper(Child);
    impl Drop for Helper {
        fn drop(&mut self) {
            let _ = self.0.kill();
            let _ = self.0.wait();
        }
    }
    struct FixtureDir(std::path::PathBuf);
    impl Drop for FixtureDir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }
    let suffix = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let dir = FixtureDir(
        std::env::temp_dir().join(format!("eusage-job-{}-{suffix}", std::process::id())),
    );
    std::fs::create_dir(&dir.0).unwrap();
    let mut unrelated = Helper(
        fixture_command()
            .env("EUSAGE_TEST_SLEEP", "1")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .unwrap(),
    );

    for detached in [false, true] {
        let pid_file = dir.0.join(if detached {
            "detached.pid"
        } else {
            "inherited.pid"
        });
        let mut command = fixture_command();
        command.env("EUSAGE_TEST_DESCENDANT", &pid_file);
        if detached {
            command.env("EUSAGE_TEST_DETACH_PIPES", "1");
        }
        let result = command.output_with_timeout(Duration::from_secs(2));
        if detached {
            assert!(result.unwrap().status.success());
        } else {
            assert_eq!(result.unwrap_err().kind(), io::ErrorKind::TimedOut);
        }
        let pid: u32 = std::fs::read_to_string(&pid_file).unwrap().parse().unwrap();
        let handle = unsafe { OpenProcess(0x0010_0000, 0, pid) }; // SYNCHRONIZE only
        if handle.is_null() {
            assert_eq!(io::Error::last_os_error().raw_os_error(), Some(87)); // already gone
        } else {
            let wait = unsafe { WaitForSingleObject(handle, 5000) };
            unsafe { CloseHandle(handle) };
            assert_eq!(wait, 0, "invocation left its descendant alive");
        }
        assert!(
            unrelated.0.try_wait().unwrap().is_none(),
            "unrelated helper was terminated"
        );
    }
}

#[test]
fn windows_helper_can_run_inside_an_existing_job() {
    let result = fixture_command()
        .env("EUSAGE_TEST_NESTED", "1")
        .output_with_timeout(Duration::from_secs(10))
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
}

#[test]
#[ignore = "dummy child fixture, started only by the Windows process tests"]
fn console_fixture() {
    // Check the actual OS console allocation, not the configured flag value.
    assert!(
        unsafe { GetConsoleWindow() }.is_null(),
        "helper received a console"
    );
    println!("dummy stdout without a console");
    eprintln!("dummy stderr without a console");
    if std::env::var_os("EUSAGE_TEST_FLOOD").is_some() {
        use std::io::Write;
        let bytes = vec![b'x'; 1024 * 1024];
        for _ in 0..18 {
            std::io::stdout().write_all(&bytes).unwrap();
        }
    }
    if std::env::var_os("EUSAGE_TEST_NESTED").is_some() {
        assert!(
            fixture_command()
                .output_with_timeout(Duration::from_secs(5))
                .unwrap()
                .status
                .success()
        );
    }
    if let Some(pid_file) = std::env::var_os("EUSAGE_TEST_DESCENDANT") {
        let mut leaf = fixture_command();
        leaf.env("EUSAGE_TEST_SLEEP", "1");
        if std::env::var_os("EUSAGE_TEST_DETACH_PIPES").is_some() {
            leaf.stdout(Stdio::null()).stderr(Stdio::null());
        }
        let child = leaf.spawn().unwrap();
        std::fs::write(pid_file, child.id().to_string()).unwrap();
        // Exit while the grandchild is still alive; the parent's job must own it.
        return;
    }
    if std::env::var_os("EUSAGE_TEST_SLEEP").is_some() {
        std::thread::sleep(Duration::from_secs(30));
    }
}
