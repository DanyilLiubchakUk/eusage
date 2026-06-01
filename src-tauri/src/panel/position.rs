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

fn nearest_monitor_edge(monitor: PhysicalRect, point: PhysicalPoint) -> NearestEdge {
    let distances = [
        (NearestEdge::Top, point.y - monitor.y),
        (NearestEdge::Right, monitor.x + monitor.width - point.x),
        (NearestEdge::Bottom, monitor.y + monitor.height - point.y),
        (NearestEdge::Left, point.x - monitor.x),
    ];

    distances
        .into_iter()
        .min_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(edge, _)| edge)
        .unwrap_or(NearestEdge::Bottom)
}

pub fn position_popup_near_tray(
    monitor: PhysicalRect,
    icon: PhysicalRect,
    popup: PhysicalPopupSize,
    gap: f64,
) -> PhysicalPopupPosition {
    let center = tray_icon_center(icon);
    let min_y = monitor.y + SCREEN_EDGE_MARGIN_PX;
    let max_x = (monitor.x + monitor.width - popup.width).max(monitor.x);
    let max_y = (monitor.y + monitor.height - popup.height - SCREEN_EDGE_MARGIN_PX).max(min_y);

    let (x, y) = match nearest_monitor_edge(monitor, center) {
        NearestEdge::Top => (
            center.x - popup.width / 2.0,
            icon.y + icon.height + gap,
        ),
        NearestEdge::Right => (
            icon.x - popup.width - gap,
            center.y - popup.height / 2.0,
        ),
        NearestEdge::Bottom => (
            center.x - popup.width / 2.0,
            icon.y - popup.height - gap,
        ),
        NearestEdge::Left => (
            icon.x + icon.width + gap,
            center.y - popup.height / 2.0,
        ),
    };

    PhysicalPopupPosition {
        x: clamp(x, monitor.x, max_x).round() as i32,
        y: clamp(y, min_y, max_y).round() as i32,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MONITOR: PhysicalRect = PhysicalRect {
        x: 0.0,
        y: 0.0,
        width: 1920.0,
        height: 1080.0,
    };

    const POPUP: PhysicalPopupSize = PhysicalPopupSize {
        width: 400.0,
        height: 500.0,
    };

    #[test]
    fn positions_above_bottom_taskbar_icon() {
        let icon = PhysicalRect {
            x: 1840.0,
            y: 1040.0,
            width: 32.0,
            height: 32.0,
        };

        let position = position_popup_near_tray(MONITOR, icon, POPUP, 8.0);

        assert_eq!(position, PhysicalPopupPosition { x: 1520, y: 532 });
    }

    #[test]
    fn positions_below_top_taskbar_icon() {
        let icon = PhysicalRect {
            x: 1840.0,
            y: 8.0,
            width: 32.0,
            height: 32.0,
        };

        let position = position_popup_near_tray(MONITOR, icon, POPUP, 8.0);

        assert_eq!(position, PhysicalPopupPosition { x: 1520, y: 48 });
    }

    #[test]
    fn positions_left_of_right_taskbar_icon() {
        let icon = PhysicalRect {
            x: 1880.0,
            y: 520.0,
            width: 32.0,
            height: 32.0,
        };

        let position = position_popup_near_tray(MONITOR, icon, POPUP, 8.0);

        assert_eq!(position, PhysicalPopupPosition { x: 1472, y: 286 });
    }

    #[test]
    fn positions_right_of_left_taskbar_icon() {
        let icon = PhysicalRect {
            x: 8.0,
            y: 520.0,
            width: 32.0,
            height: 32.0,
        };

        let position = position_popup_near_tray(MONITOR, icon, POPUP, 8.0);

        assert_eq!(position, PhysicalPopupPosition { x: 48, y: 286 });
    }

    #[test]
    fn keeps_popup_off_top_screen_edge_when_clamped() {
        let icon = PhysicalRect {
            x: 1840.0,
            y: 1040.0,
            width: 32.0,
            height: 32.0,
        };
        let tall_popup = PhysicalPopupSize {
            width: 400.0,
            height: 1200.0,
        };

        let position = position_popup_near_tray(MONITOR, icon, tall_popup, 8.0);

        assert_eq!(position.y, 12);
    }

    #[test]
    fn detects_point_inside_monitor_rect() {
        assert!(rect_contains_point(MONITOR, PhysicalPoint { x: 10.0, y: 10.0 }));
        assert!(!rect_contains_point(
            MONITOR,
            PhysicalPoint {
                x: 1920.0,
                y: 10.0
            }
        ));
    }
}
