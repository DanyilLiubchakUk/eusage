#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PhysicalRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PhysicalPoint {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PhysicalPopupSize {
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PhysicalPopupPosition {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum NearestEdge {
    Top,
    Right,
    Bottom,
    Left,
}

const SCREEN_EDGE_MARGIN_PX: f64 = 12.0;

#[cfg(any(target_os = "windows", test))]
pub fn fit_popup_to_work_area(work_area: PhysicalRect, popup: PhysicalPopupSize) -> PhysicalPopupSize {
    PhysicalPopupSize {
        width: popup.width.min(work_area.width.max(1.0)),
        height: popup
            .height
            .min((work_area.height - 2.0 * SCREEN_EDGE_MARGIN_PX).max(1.0)),
    }
}

pub fn rect_contains_point(rect: PhysicalRect, point: PhysicalPoint) -> bool {
    point.x >= rect.x
        && point.x < rect.x + rect.width
        && point.y >= rect.y
        && point.y < rect.y + rect.height
}

pub fn tray_icon_center(icon: PhysicalRect) -> PhysicalPoint {
    PhysicalPoint {
        x: icon.x + icon.width / 2.0,
        y: icon.y + icon.height / 2.0,
    }
}

fn clamp(value: f64, min: f64, max: f64) -> f64 {
    if min > max {
        return min;
    }
    value.max(min).min(max)
}

fn preferred_monitor_edges(
    monitor: PhysicalRect,
    work_area: PhysicalRect,
    point: PhysicalPoint,
) -> [NearestEdge; 4] {
    let mut distances = [
        (
            NearestEdge::Top,
            point.y - monitor.y,
            work_area.y > monitor.y,
        ),
        (
            NearestEdge::Right,
            monitor.x + monitor.width - point.x,
            work_area.x + work_area.width < monitor.x + monitor.width,
        ),
        (
            NearestEdge::Bottom,
            monitor.y + monitor.height - point.y,
            work_area.y + work_area.height < monitor.y + monitor.height,
        ),
        (
            NearestEdge::Left,
            point.x - monitor.x,
            work_area.x > monitor.x,
        ),
    ];
    // Work-area reservations can belong to other appbars. They guide the order;
    // the caller still checks that the resulting position clears the tray icon.
    distances.sort_by(|a, b| b.2.cmp(&a.2).then_with(|| a.1.total_cmp(&b.1)));
    distances.map(|(edge, _, _)| edge)
}

pub fn position_popup_near_tray(
    monitor: PhysicalRect,
    work_area: PhysicalRect,
    icon: PhysicalRect,
    popup: PhysicalPopupSize,
    gap: f64,
) -> PhysicalPopupPosition {
    let center = tray_icon_center(icon);
    let min_y = work_area.y + SCREEN_EDGE_MARGIN_PX;
    let max_x = (work_area.x + work_area.width - popup.width).max(work_area.x);
    let max_y = (work_area.y + work_area.height - popup.height - SCREEN_EDGE_MARGIN_PX).max(min_y);

    let candidates = preferred_monitor_edges(monitor, work_area, center).map(|edge| {
        let (x, y) = match edge {
            NearestEdge::Top => (center.x - popup.width / 2.0, icon.y + icon.height + gap),
            NearestEdge::Right => (icon.x - popup.width - gap, center.y - popup.height / 2.0),
            NearestEdge::Bottom => (center.x - popup.width / 2.0, icon.y - popup.height - gap),
            NearestEdge::Left => (icon.x + icon.width + gap, center.y - popup.height / 2.0),
        };
        PhysicalPopupPosition {
            x: clamp(x, work_area.x, max_x).round() as i32,
            y: clamp(y, min_y, max_y).round() as i32,
        }
    });

    // If no side has enough room, retain the preferred, work-area-clamped position.
    candidates
        .into_iter()
        .find(|position| {
            position.x as f64 + popup.width + gap <= icon.x
                || position.x as f64 >= icon.x + icon.width + gap
                || position.y as f64 + popup.height + gap <= icon.y
                || position.y as f64 >= icon.y + icon.height + gap
        })
        .unwrap_or(candidates[0])
}

#[cfg(test)]
#[path = "position_tests.rs"]
mod tests;
