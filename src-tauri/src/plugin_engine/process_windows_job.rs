use std::ffi::c_void;
use std::io;
use std::process::Child;
use std::ptr;

type Handle = *mut c_void;

#[repr(C)]
#[derive(Default)]
struct BasicLimits {
    process_time: i64,
    job_time: i64,
    flags: u32,
    min_working_set: usize,
    max_working_set: usize,
    active_processes: u32,
    affinity: usize,
    priority: u32,
    scheduling: u32,
}

#[repr(C)]
#[derive(Default)]
struct ExtendedLimits {
    basic: BasicLimits,
    io_counters: [u64; 6],
    process_memory: usize,
    job_memory: usize,
    peak_process_memory: usize,
    peak_job_memory: usize,
}

#[repr(C)]
#[derive(Default)]
struct ThreadEntry {
    size: u32,
    usage: u32,
    id: u32,
    process_id: u32,
    base_priority: i32,
    delta_priority: i32,
    flags: u32,
}

#[link(name = "Kernel32")]
unsafe extern "system" {
    fn CreateJobObjectW(attributes: *const c_void, name: *const u16) -> Handle;
    fn SetInformationJobObject(job: Handle, class: i32, info: *const c_void, size: u32) -> i32;
    fn AssignProcessToJobObject(job: Handle, process: Handle) -> i32;
    fn OpenProcess(access: u32, inherit: i32, id: u32) -> Handle;
    fn CreateToolhelp32Snapshot(flags: u32, id: u32) -> Handle;
    fn Thread32First(snapshot: Handle, entry: *mut ThreadEntry) -> i32;
    fn Thread32Next(snapshot: Handle, entry: *mut ThreadEntry) -> i32;
    fn OpenThread(access: u32, inherit: i32, id: u32) -> Handle;
    fn GetProcessIdOfThread(thread: Handle) -> u32;
    fn ResumeThread(thread: Handle) -> u32;
    fn CloseHandle(handle: Handle) -> i32;
}

struct OwnedHandle(Handle);

impl OwnedHandle {
    fn new(handle: Handle) -> io::Result<Self> {
        if handle.is_null() || handle as isize == -1 {
            Err(io::Error::last_os_error())
        } else {
            Ok(Self(handle))
        }
    }
}

impl Drop for OwnedHandle {
    fn drop(&mut self) {
        unsafe { CloseHandle(self.0) };
    }
}

/// One job per bounded invocation. Closing it stops any remaining descendants.
pub(super) struct ProcessJob(OwnedHandle);

impl ProcessJob {
    pub(super) fn new() -> io::Result<Self> {
        // No name or inheritable handle: only this invocation owns the job.
        let handle = OwnedHandle::new(unsafe { CreateJobObjectW(ptr::null(), ptr::null()) })?;
        let limits = ExtendedLimits {
            basic: BasicLimits {
                flags: 0x2000, // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
                ..Default::default()
            },
            ..Default::default()
        };
        let ok = unsafe {
            SetInformationJobObject(
                handle.0,
                9, // JobObjectExtendedLimitInformation
                (&limits as *const ExtendedLimits).cast(),
                size_of::<ExtendedLimits>() as u32,
            )
        };
        if ok == 0 {
            return Err(io::Error::last_os_error());
        }
        Ok(Self(handle))
    }

    pub(super) fn assign_and_resume(&self, child: &Child) -> io::Result<()> {
        // The caller created this child suspended. It cannot spawn descendants
        // before assignment. Its Child handle keeps the process identity alive.
        let process = OwnedHandle::new(unsafe { OpenProcess(0x0101, 0, child.id()) })?; // SET_QUOTA | TERMINATE
        if unsafe { AssignProcessToJobObject(self.0.0, process.0) } == 0 {
            return Err(io::Error::last_os_error());
        }

        // Stable Rust does not expose the initial thread handle. Find the single
        // thread of our suspended child with the documented Tool Help API.
        let snapshot = OwnedHandle::new(unsafe { CreateToolhelp32Snapshot(0x4, 0) })?; // SNAPTHREAD
        let mut entry = ThreadEntry {
            size: size_of::<ThreadEntry>() as u32,
            ..Default::default()
        };
        let mut found = None;
        let mut more = unsafe { Thread32First(snapshot.0, &mut entry) };
        while more != 0 {
            if entry.process_id == child.id() {
                if found.is_some() {
                    return Err(io::Error::other("suspended helper has multiple threads"));
                }
                found = Some(entry.id);
            }
            entry.size = size_of::<ThreadEntry>() as u32;
            more = unsafe { Thread32Next(snapshot.0, &mut entry) };
        }
        let error = io::Error::last_os_error();
        if error.raw_os_error() != Some(18) {
            return Err(error);
        } // NO_MORE_FILES
        let id = found.ok_or_else(|| io::Error::other("suspended helper thread is missing"))?;
        let thread = OwnedHandle::new(unsafe { OpenThread(0x0802, 0, id) })?; // QUERY_LIMITED_INFORMATION | SUSPEND_RESUME
        if unsafe { GetProcessIdOfThread(thread.0) } != child.id() {
            return Err(io::Error::other("helper thread ownership changed"));
        }
        match unsafe { ResumeThread(thread.0) } {
            1 => Ok(()),
            u32::MAX => Err(io::Error::last_os_error()),
            _ => Err(io::Error::other("unexpected helper thread suspend count")),
        }
    }
}
