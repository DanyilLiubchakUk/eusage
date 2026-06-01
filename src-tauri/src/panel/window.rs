use tauri::window::Monitor;
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, Position, Size};

#[cfg(target_os = "windows")]
use std::sync::{
    Mutex, OnceLock,
    atomic::{AtomicBool, Ordering},
};
#[cfg(target_os = "windows")]
use std::time::Instant;
#[cfg(target_os = "windows")]
use tauri::WindowEvent;

#[cfg(target_os = "windows")]
use super::focus_guard::OutsideClickCloseGuard;
use super::position::{
    PhysicalPopupSize, PhysicalRect, position_popup_near_tray, rect_contains_point,
    tray_icon_center,
};

const POPUP_GAP_PX: f64 = 8.0;
const FALLBACK_PANEL_WIDTH: f64 = 400.0;
const FALLBACK_PANEL_HEIGHT: f64 = 500.0;

#[cfg(target_os = "windows")]
static WINDOWS_FOCUS_CLOSE_HANDLER_INSTALLED: AtomicBool = AtomicBool::new(false);

#[cfg(target_os = "windows")]
static WINDOWS_FOCUS_CLOSE_GUARD: OnceLock<Mutex<OutsideClickCloseGuard>> = OnceLock::new();

#[cfg(target_os = "windows")]
fn with_windows_focus_close_guard<T>(action: impl FnOnce(&mut OutsideClickCloseGuard) -> T) -> T {
    let guard = WINDOWS_FOCUS_CLOSE_GUARD.get_or_init(Default::default);
    let mut guard = guard
        .lock()
        .expect("windows tray popup focus guard poisoned");
    action(&mut guard)
}

#[cfg(target_os = "windows")]
fn note_windows_explicit_panel_hide() {
    with_windows_focus_close_guard(|guard| guard.note_explicit_hide(Instant::now()));
}

#[cfg(not(target_os = "windows"))]
fn note_windows_explicit_panel_hide() {}

#[cfg(target_os = "windows")]
pub(crate) fn note_tray_left_mouse_down() {
    with_windows_focus_close_guard(|guard| {
        guard.note_tray_left_mouse_down(Instant::now());
    });
}

#[cfg(target_os = "windows")]
pub(crate) fn should_consume_tray_left_mouse_up() -> bool {
    with_windows_focus_close_guard(|guard| guard.should_consume_tray_left_mouse_up(Instant::now()))
}

#[cfg(target_os = "windows")]
fn init_windows_outside_click_close(app_handle: &AppHandle, window: &tauri::WebviewWindow) {
    if WINDOWS_FOCUS_CLOSE_HANDLER_INSTALLED.swap(true, Ordering::AcqRel) {
        return;
    }

    let app_handle = app_handle.clone();
    window.on_window_event(move |event| {
        if !matches!(event, WindowEvent::Focused(false)) {
            return;
        }

        let Some(window) = app_handle.get_webview_window("main") else {
            log::error!("main window missing while handling tray popup focus loss");
            return;
        };

        match window.is_visible() {
            Ok(true) => {}
            Ok(false) => return,
            Err(error) => {
                log::warn!(
                    "failed to read tray popup visibility on focus loss: {}",
                    error
                );
                return;
            }
        }

        let should_hide =
            with_windows_focus_close_guard(|guard| guard.should_hide_on_focus_loss(Instant::now()));

        if !should_hide {
            return;
        }

        if let Err(error) = window.hide() {
            log::warn!("failed to hide tray popup on focus loss: {}", error);
        }
    });
}

#[cfg(not(target_os = "windows"))]
fn init_windows_outside_click_close(_app_handle: &AppHandle, _window: &tauri::WebviewWindow) {}

fn position_to_physical(position: Position) -> (f64, f64) {
    match position {
        Position::Physical(position) => (position.x as f64, position.y as f64),
        Position::Logical(position) => (position.x, position.y),
    }
}

fn size_to_physical(size: Size) -> (f64, f64) {
    match size {
        Size::Physical(size) => (size.width as f64, size.height as f64),
        Size::Logical(size) => (size.width, size.height),
    }
}

fn window_popup_size(window: &tauri::WebviewWindow) -> PhysicalPopupSize {
    match window.outer_size() {
        Ok(PhysicalSize { width, height }) => PhysicalPopupSize {
            width: width as f64,
            height: height as f64,
        },
        Err(error) => {
            log::warn!("window popup size unavailable, using fallback: {}", error);
            PhysicalPopupSize {
                width: FALLBACK_PANEL_WIDTH,
                height: FALLBACK_PANEL_HEIGHT,
            }
        }
    }
}

fn monitor_rect(monitor: &Monitor) -> PhysicalRect {
    PhysicalRect {
        x: monitor.position().x as f64,
        y: monitor.position().y as f64,
        width: monitor.size().width as f64,
        height: monitor.size().height as f64,
    }
}

fn find_monitor_for_icon(
    window: &tauri::WebviewWindow,
    icon: PhysicalRect,
) -> Option<Monitor> {
    let center = tray_icon_center(icon);
    match window.available_monitors() {
        Ok(monitors) => monitors
            .into_iter()
            .find(|monitor| rect_contains_point(monitor_rect(monitor), center)),
        Err(error) => {
            log::warn!("failed to list monitors for tray popup: {}", error);
            None
        }
    }
    .or_else(|| window.primary_monitor().ok().flatten())
}

fn position_window_at_tray_icon(
    app_handle: &AppHandle,
    icon_position: Position,
    icon_size: Size,
) -> tauri::Result<()> {
    let Some(window) = app_handle.get_webview_window("main") else {
        log::error!("main window missing while positioning tray popup");
        return Ok(());
    };

    let (x, y) = position_to_physical(icon_position);
    let (width, height) = size_to_physical(icon_size);
    let icon = PhysicalRect {
        x,
        y,
        width,
        height,
    };

    let Some(monitor) = find_monitor_for_icon(&window, icon) else {
        log::warn!("no monitor found for tray popup");
        return Ok(());
    };

    let position = position_popup_near_tray(
        monitor_rect(&monitor),
        icon,
        window_popup_size(&window),
        POPUP_GAP_PX,
    );

    window.set_position(PhysicalPosition::new(position.x, position.y))?;
    Ok(())
}

fn position_window_from_tray(app_handle: &AppHandle) {
    let Some(tray) = app_handle.tray_by_id("tray") else {
        log::debug!("position_window_from_tray: tray icon not found");
        return;
    };

    match tray.rect() {
        Ok(Some(rect)) => {
            if let Err(error) =
                position_window_at_tray_icon(app_handle, rect.position, rect.size)
            {
                log::warn!("failed to position tray popup: {}", error);
            }
        }
        Ok(None) => {
            log::debug!("position_window_from_tray: tray rect not available yet");
        }
        Err(error) => {
            log::warn!("position_window_from_tray: failed to get tray rect: {}", error);
        }
    }
}

pub fn init(app_handle: &AppHandle) -> tauri::Result<()> {
    let Some(window) = app_handle.get_webview_window("main") else {
        log::error!("main window missing during tray popup init");
        return Ok(());
    };

    init_windows_outside_click_close(app_handle, &window);
    window.set_skip_taskbar(true)?;
    window.set_always_on_top(true)?;
    #[cfg(target_os = "windows")]
    if let Err(error) = window.set_shadow(false) {
        log::warn!("failed to disable tray popup window shadow: {}", error);
    }
    Ok(())
}

pub fn hide_panel(app_handle: &AppHandle) {
    let Some(window) = app_handle.get_webview_window("main") else {
        return;
    };
    match window.is_visible() {
        Ok(true) => note_windows_explicit_panel_hide(),
        Ok(false) => {}
        Err(error) => log::warn!(
            "failed to read tray popup visibility before hide: {}",
            error
        ),
    }
    if let Err(error) = window.hide() {
        log::warn!("failed to hide tray popup: {}", error);
    }
}

pub fn show_panel(app_handle: &AppHandle) {
    if let Err(error) = init(app_handle) {
        log::warn!("failed to initialize tray popup: {}", error);
    }
    position_window_from_tray(app_handle);

    let Some(window) = app_handle.get_webview_window("main") else {
        return;
    };
    if let Err(error) = window.show().and_then(|_| window.set_focus()) {
        log::warn!("failed to show tray popup: {}", error);
    }
}

pub fn toggle_panel(app_handle: &AppHandle) {
    let Some(window) = app_handle.get_webview_window("main") else {
        return;
    };

    match window.is_visible() {
        Ok(true) => hide_panel(app_handle),
        Ok(false) => show_panel(app_handle),
        Err(error) => log::warn!("failed to read tray popup visibility: {}", error),
    }
}

pub fn toggle_panel_at_tray_icon(
    app_handle: &AppHandle,
    icon_position: Position,
    icon_size: Size,
) {
    let Some(window) = app_handle.get_webview_window("main") else {
        return;
    };

    match window.is_visible() {
        Ok(true) => hide_panel(app_handle),
        Ok(false) => {
            if let Err(error) = init(app_handle) {
                log::warn!("failed to initialize tray popup: {}", error);
            }
            if let Err(error) = position_window_at_tray_icon(app_handle, icon_position, icon_size) {
                log::warn!("failed to position tray popup: {}", error);
            }
            if let Err(error) = window.show().and_then(|_| window.set_focus()) {
                log::warn!("failed to show tray popup: {}", error);
            }
        }
        Err(error) => log::warn!("failed to read tray popup visibility: {}", error),
    }
}
