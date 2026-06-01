use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, Position, Size};
use tauri::window::Monitor;

use super::position::{
    PhysicalPopupSize, PhysicalRect, position_popup_near_tray, rect_contains_point,
    tray_icon_center,
};

const POPUP_GAP_PX: f64 = 8.0;
const FALLBACK_PANEL_WIDTH: f64 = 400.0;
const FALLBACK_PANEL_HEIGHT: f64 = 500.0;

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

    window.set_skip_taskbar(true)?;
    window.set_always_on_top(true)?;
    Ok(())
}

pub fn hide_panel(app_handle: &AppHandle) {
    let Some(window) = app_handle.get_webview_window("main") else {
        return;
    };
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
