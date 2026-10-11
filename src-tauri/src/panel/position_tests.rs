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

#[test]
fn unrelated_top_appbar_does_not_place_popup_over_bottom_tray_icon() {
    let work_area = PhysicalRect {
        y: 48.0,
        height: 1032.0,
        ..MONITOR
    };
    let icon = PhysicalRect {
        x: 1840.0,
        y: 1040.0,
        width: 32.0,
        height: 32.0,
    };
    let position = position_popup_near_tray(MONITOR, work_area, icon, POPUP, 8.0);
    assert_eq!(position, PhysicalPopupPosition { x: 1520, y: 532 });
    assert!(position.y as f64 + POPUP.height + 8.0 <= icon.y);
}

#[test]
fn placement_stays_usable_across_edges_overflow_monitors_and_scales() {
    let cases = [
        // Reserved top, right, bottom and left taskbars, including corner icons.
        ((0.0, 48.0, 1920.0, 1032.0), (1888.0, 8.0)),
        ((0.0, 0.0, 1872.0, 1080.0), (1880.0, 1048.0)),
        ((0.0, 0.0, 1920.0, 1032.0), (1888.0, 1040.0)),
        ((48.0, 0.0, 1872.0, 1080.0), (8.0, 1048.0)),
        // Auto-hide/overflow: no reserved edge is available to infer orientation.
        ((0.0, 0.0, 1920.0, 1080.0), (1800.0, 900.0)),
        ((0.0, 0.0, 1920.0, 1080.0), (1800.0, 150.0)),
        ((0.0, 0.0, 1920.0, 1080.0), (100.0, 150.0)),
        ((0.0, 0.0, 1920.0, 1080.0), (100.0, 900.0)),
        // An unrelated appbar must not force the popup over the tray icon.
        ((0.0, 48.0, 1920.0, 1032.0), (1840.0, 1040.0)),
    ];
    for scale in [1.0, 1.25, 1.5, 2.0] {
        for (origin_x, origin_y) in [(0.0, 0.0), (-3840.0, -2160.0), (3840.0, 240.0)] {
            for ((x, y, width, height), (icon_x, icon_y)) in cases {
                let rect = |x, y, width, height| PhysicalRect {
                    x: origin_x + x * scale,
                    y: origin_y + y * scale,
                    width: width * scale,
                    height: height * scale,
                };
                let monitor = rect(0.0, 0.0, 1920.0, 1080.0);
                let work_area = rect(x, y, width, height);
                let icon = rect(icon_x, icon_y, 32.0, 32.0);
                // Resize with the same anchor, as the native resize handler does.
                for (width, height) in [(400.0, 500.0), (600.0, 700.0)] {
                    let popup = fit_popup_to_work_area(
                        work_area,
                        PhysicalPopupSize {
                            width: width * scale,
                            height: height * scale,
                        },
                    );
                    let position = position_popup_near_tray(monitor, work_area, icon, popup, 8.0);
                    let (x, y) = (position.x as f64, position.y as f64);
                    assert!(x >= work_area.x && y >= work_area.y);
                    assert!(x + popup.width <= work_area.x + work_area.width);
                    assert!(y + popup.height <= work_area.y + work_area.height);
                    assert!(
                        x + popup.width <= icon.x
                            || x >= icon.x + icon.width
                            || y + popup.height <= icon.y
                            || y >= icon.y + icon.height,
                        "popup covers tray icon: {position:?}, {icon:?}, scale {scale}"
                    );
                }
            }
        }
    }
}
