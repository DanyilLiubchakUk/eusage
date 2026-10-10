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

fn nearest_monitor_edge(
    monitor: PhysicalRect,
    work_area: PhysicalRect,
    point: PhysicalPoint,
) -> NearestEdge {
    let distances = [
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
    // The reserved taskbar edge wins over a nearby corner or overflow icon.
    let has_reserved_edge = distances.iter().any(|(_, _, reserved)| *reserved);

    distances
        .into_iter()
        .filter(|(_, _, reserved)| !has_reserved_edge || *reserved)
        .min_by(|(_, a, _), (_, b, _)| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(edge, _, _)| edge)
        .unwrap_or(NearestEdge::Bottom)
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

    let (x, y) = match nearest_monitor_edge(monitor, work_area, center) {
        NearestEdge::Top => (center.x - popup.width / 2.0, icon.y + icon.height + gap),
        NearestEdge::Right => (icon.x - popup.width - gap, center.y - popup.height / 2.0),
        NearestEdge::Bottom => (center.x - popup.width / 2.0, icon.y - popup.height - gap),
        NearestEdge::Left => (icon.x + icon.width + gap, center.y - popup.height / 2.0),
    };

    PhysicalPopupPosition {
        x: clamp(x, work_area.x, max_x).round() as i32,
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

        let position = position_popup_near_tray(MONITOR, MONITOR, icon, POPUP, 8.0);

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

        let position = position_popup_near_tray(MONITOR, MONITOR, icon, POPUP, 8.0);

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

        let position = position_popup_near_tray(MONITOR, MONITOR, icon, POPUP, 8.0);

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

        let position = position_popup_near_tray(MONITOR, MONITOR, icon, POPUP, 8.0);

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

        let position = position_popup_near_tray(MONITOR, MONITOR, icon, tall_popup, 8.0);

        assert_eq!(position.y, 12);
    }

    #[test]
    fn respects_taskbar_work_areas_at_all_four_corners() {
        let cases = [
            (
                PhysicalRect {
                    y: 48.0,
                    height: 1032.0,
                    ..MONITOR
                },
                PhysicalRect {
                    x: 1888.0,
                    y: 8.0,
                    width: 32.0,
                    height: 32.0,
                },
                PhysicalPopupPosition { x: 1520, y: 60 },
            ),
            (
                PhysicalRect {
                    width: 1872.0,
                    ..MONITOR
                },
                PhysicalRect {
                    x: 1880.0,
                    y: 1048.0,
                    width: 32.0,
                    height: 32.0,
                },
                PhysicalPopupPosition { x: 1472, y: 568 },
            ),
            (
                PhysicalRect {
                    height: 1032.0,
                    ..MONITOR
                },
                PhysicalRect {
                    x: 1888.0,
                    y: 1040.0,
                    width: 32.0,
                    height: 32.0,
                },
                PhysicalPopupPosition { x: 1520, y: 520 },
            ),
            (
                PhysicalRect {
                    x: 48.0,
                    width: 1872.0,
                    ..MONITOR
                },
                PhysicalRect {
                    x: 8.0,
                    y: 1048.0,
                    width: 32.0,
                    height: 32.0,
                },
                PhysicalPopupPosition { x: 48, y: 568 },
            ),
        ];

        for (work_area, icon, expected) in cases {
            let position = position_popup_near_tray(MONITOR, work_area, icon, POPUP, 8.0);
            assert_eq!(position, expected);
            assert!(position.x as f64 >= work_area.x);
            assert!(position.y as f64 >= work_area.y);
            assert!(position.x as f64 + POPUP.width <= work_area.x + work_area.width);
            assert!(position.y as f64 + POPUP.height <= work_area.y + work_area.height);
        }
    }

    #[test]
    fn positions_above_bottom_taskbar_overflow_icon_inside_work_area() {
        let work_area = PhysicalRect {
            height: 1032.0,
            ..MONITOR
        };
        let icon = PhysicalRect {
            x: 1800.0,
            y: 900.0,
            width: 32.0,
            height: 32.0,
        };

        let position = position_popup_near_tray(MONITOR, work_area, icon, POPUP, 8.0);

        assert_eq!(position, PhysicalPopupPosition { x: 1520, y: 392 });
    }

    #[test]
    fn clamps_to_work_area_on_monitor_left_and_above_primary() {
        let monitor = PhysicalRect {
            x: -1920.0,
            y: -1080.0,
            ..MONITOR
        };
        let work_area = PhysicalRect {
            height: 1032.0,
            ..monitor
        };
        let icon = PhysicalRect {
            x: -32.0,
            y: -40.0,
            width: 32.0,
            height: 32.0,
        };

        let position = position_popup_near_tray(monitor, work_area, icon, POPUP, 8.0);

        assert_eq!(position, PhysicalPopupPosition { x: -400, y: -560 });
        assert!(rect_contains_point(monitor, tray_icon_center(icon)));
        assert!(!rect_contains_point(MONITOR, tray_icon_center(icon)));
    }

    #[test]
    fn recomputing_after_resize_keeps_popup_above_taskbar() {
        let work_area = PhysicalRect {
            height: 1032.0,
            ..MONITOR
        };
        let icon = PhysicalRect {
            x: 1888.0,
            y: 1040.0,
            width: 32.0,
            height: 32.0,
        };
        let resized = PhysicalPopupSize {
            width: 600.0,
            height: 700.0,
        };

        let position = position_popup_near_tray(MONITOR, work_area, icon, resized, 8.0);

        assert_eq!(position, PhysicalPopupPosition { x: 1320, y: 320 });
    }

    #[test]
    fn caps_an_oversized_popup_before_moving_to_a_smaller_monitor() {
        let work_area = PhysicalRect {
            width: 300.0,
            height: 680.0,
            ..MONITOR
        };
        let popup = PhysicalPopupSize {
            width: 800.0,
            height: 1696.0,
        };
        let fitted = fit_popup_to_work_area(work_area, popup);
        assert_eq!(fitted.width, 300.0);
        assert_eq!(fitted.height, 656.0);
        assert_eq!(fit_popup_to_work_area(work_area, fitted), fitted);
        let icon = PhysicalRect {
            x: 268.0,
            y: 680.0,
            width: 32.0,
            height: 32.0,
        };
        let position = position_popup_near_tray(MONITOR, work_area, icon, fitted, 8.0);
        assert!(position.x as f64 + fitted.width <= work_area.x + work_area.width);
        assert!(position.y as f64 + fitted.height <= work_area.y + work_area.height);
    }

    #[test]
    fn detects_point_inside_monitor_rect() {
        assert!(rect_contains_point(
            MONITOR,
            PhysicalPoint { x: 10.0, y: 10.0 }
        ));
        assert!(!rect_contains_point(
            MONITOR,
            PhysicalPoint { x: 1920.0, y: 10.0 }
        ));
    }
}
