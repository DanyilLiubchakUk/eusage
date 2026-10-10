use std::ffi::OsStr;
use std::io::{self, Read};
use std::process::{Child, Command, Output, Stdio};
use std::sync::mpsc::{self, Receiver, TryRecvError};
use std::time::{Duration, Instant};

const OUTPUT_LIMIT: u64 = 16 * 1024 * 1024;
const POLL_INTERVAL: Duration = Duration::from_millis(10);

pub(crate) trait CommandOutputExt {
    fn output_with_timeout(&mut self, timeout: Duration) -> io::Result<Output>;
}

impl CommandOutputExt for Command {
    fn output_with_timeout(&mut self, timeout: Duration) -> io::Result<Output> {
        output(self, timeout)
    }
}

pub(crate) fn background_command(program: impl AsRef<OsStr>) -> Command {
    let mut command = Command::new(program);
    command.stdin(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW: background helpers must not open a console in a GUI app.
        command.creation_flags(0x0800_0000);
    }
    command
}

fn capture(pipe: impl Read + Send + 'static) -> Receiver<io::Result<Vec<u8>>> {
    let (sender, receiver) = mpsc::channel();
    std::thread::spawn(move || {
        let mut bytes = Vec::new();
        let result = pipe
            .take(OUTPUT_LIMIT + 1)
            .read_to_end(&mut bytes)
            .and_then(|_| {
                if bytes.len() as u64 > OUTPUT_LIMIT {
                    Err(io::Error::other("subprocess output exceeded 16 MiB"))
                } else {
                    Ok(bytes)
                }
            });
        let _ = sender.send(result);
    });
    receiver
}

fn receive(receiver: &Receiver<io::Result<Vec<u8>>>) -> io::Result<Option<Vec<u8>>> {
    match receiver.try_recv() {
        Ok(result) => result.map(Some),
        Err(TryRecvError::Empty) => Ok(None),
        Err(TryRecvError::Disconnected) => Err(io::Error::other("subprocess reader stopped")),
    }
}

fn terminate(child: &mut Child) {
    #[cfg(unix)]
    if let Ok(pgid) = i32::try_from(child.id()) {
        // Every bounded command starts in its own group, including descendants.
        unsafe { libc::kill(-pgid, libc::SIGKILL) };
    }
    // Windows currently terminates the direct child. Do not join readers here: a
    // descendant can retain an inherited pipe after the direct child exits.
    let _ = child.kill();
    let _ = child.wait();
}

/// Drain both streams while polling the child; the deadline includes inherited pipes.
pub(crate) fn output(command: &mut Command, timeout: Duration) -> io::Result<Output> {
    if timeout.is_zero() {
        return Err(io::Error::new(
            io::ErrorKind::TimedOut,
            "subprocess timed out",
        ));
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        command.process_group(0);
    }
    command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let started = Instant::now();
    let mut child = command.spawn()?;
    let stdout_receiver = capture(child.stdout.take().expect("stdout is piped"));
    let stderr_receiver = capture(child.stderr.take().expect("stderr is piped"));
    let mut stdout = None;
    let mut stderr = None;
    let mut status = None;

    let result = (|| loop {
        if stdout.is_none() {
            stdout = receive(&stdout_receiver)?;
        }
        if stderr.is_none() {
            stderr = receive(&stderr_receiver)?;
        }
        if status.is_none() {
            status = child.try_wait()?;
        }
        if let Some(status) = status {
            if stdout.is_some() && stderr.is_some() {
                return Ok(Output {
                    status,
                    stdout: stdout.take().unwrap(),
                    stderr: stderr.take().unwrap(),
                });
            }
        }
        if started.elapsed() >= timeout {
            return Err(io::Error::new(
                io::ErrorKind::TimedOut,
                "subprocess timed out",
            ));
        }
        std::thread::sleep(POLL_INTERVAL.min(timeout.saturating_sub(started.elapsed())));
    })();
    if result.is_err() {
        terminate(&mut child);
    }
    result
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;

    #[test]
    fn captures_both_streams_without_pipe_deadlock() {
        let mut command = background_command("/bin/sh");
        command.args(["-c", "i=0; while [ $i -lt 2000 ]; do printf 'stdout line\n'; printf 'stderr line\n' >&2; i=$((i + 1)); done"]);
        let result = output(&mut command, Duration::from_secs(5)).unwrap();
        assert!(result.status.success());
        assert_eq!(result.stdout.len(), 24_000);
        assert_eq!(result.stderr.len(), 24_000);
    }

    #[test]
    fn times_out_when_parent_exits_but_descendant_holds_pipes() {
        let started = Instant::now();
        let mut command = background_command("/bin/sh");
        command.args(["-c", "sleep 5 & exit 0"]);
        let error = output(&mut command, Duration::from_millis(100)).unwrap_err();
        assert_eq!(error.kind(), io::ErrorKind::TimedOut);
        assert!(started.elapsed() < Duration::from_secs(2));
    }

    #[test]
    fn rejects_unbounded_output() {
        let mut command = background_command("/usr/bin/yes");
        let error = output(&mut command, Duration::from_secs(5)).unwrap_err();
        assert!(error.to_string().contains("output exceeded"));
    }

    #[test]
    fn expired_budget_does_not_spawn() {
        let mut command = background_command("/missing/synthetic-command");
        let error = output(&mut command, Duration::ZERO).unwrap_err();
        assert_eq!(error.kind(), io::ErrorKind::TimedOut);
    }
}
