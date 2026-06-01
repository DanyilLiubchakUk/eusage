use std::time::{Duration, Instant};

const TRAY_CLICK_FOCUS_LOSS_GRACE: Duration = Duration::from_millis(300);

// Windows can emit focus loss before the tray click release.
#[derive(Debug, Default)]
pub struct OutsideClickCloseGuard {
    explicit_hide_at: Option<Instant>,
    last_focus_loss_hide_at: Option<Instant>,
    tray_left_mouse_down_at: Option<Instant>,
}

impl OutsideClickCloseGuard {
    pub fn note_explicit_hide(&mut self, now: Instant) {
        self.explicit_hide_at = Some(now);
        self.last_focus_loss_hide_at = None;
    }

    pub fn note_tray_left_mouse_down(&mut self, now: Instant) {
        self.tray_left_mouse_down_at = Some(now);
    }

    pub fn should_hide_on_focus_loss(&mut self, now: Instant) -> bool {
        if is_recent(self.explicit_hide_at, now) {
            self.explicit_hide_at = None;
            return false;
        }
        self.explicit_hide_at = None;

        if is_recent(self.tray_left_mouse_down_at, now) {
            return false;
        }

        self.last_focus_loss_hide_at = Some(now);
        true
    }

    pub fn should_consume_tray_left_mouse_up(&mut self, now: Instant) -> bool {
        self.tray_left_mouse_down_at = None;

        if is_recent(self.last_focus_loss_hide_at, now) {
            self.last_focus_loss_hide_at = None;
            return true;
        }

        self.last_focus_loss_hide_at = None;
        false
    }
}

fn is_recent(timestamp: Option<Instant>, now: Instant) -> bool {
    timestamp.is_some_and(|timestamp| {
        now.saturating_duration_since(timestamp) <= TRAY_CLICK_FOCUS_LOSS_GRACE
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hides_on_normal_focus_loss() {
        let mut guard = OutsideClickCloseGuard::default();
        let now = Instant::now();

        assert!(guard.should_hide_on_focus_loss(now));
    }

    #[test]
    fn ignores_focus_loss_after_explicit_hide() {
        let mut guard = OutsideClickCloseGuard::default();
        let now = Instant::now();

        guard.note_explicit_hide(now);

        assert!(!guard.should_hide_on_focus_loss(now));
        assert!(guard.should_hide_on_focus_loss(now + Duration::from_millis(1)));
    }

    #[test]
    fn tray_mouse_down_prevents_focus_loss_hide_then_mouse_up_toggles() {
        let mut guard = OutsideClickCloseGuard::default();
        let now = Instant::now();

        guard.note_tray_left_mouse_down(now);

        assert!(!guard.should_hide_on_focus_loss(now + Duration::from_millis(1)));
        assert!(!guard.should_consume_tray_left_mouse_up(now + Duration::from_millis(2)));
    }

    #[test]
    fn tray_mouse_up_is_consumed_after_recent_focus_loss_hide() {
        let mut guard = OutsideClickCloseGuard::default();
        let now = Instant::now();

        assert!(guard.should_hide_on_focus_loss(now));

        assert!(guard.should_consume_tray_left_mouse_up(now + Duration::from_millis(100)));
    }

    #[test]
    fn stale_focus_loss_hide_does_not_consume_later_tray_click() {
        let mut guard = OutsideClickCloseGuard::default();
        let now = Instant::now();

        assert!(guard.should_hide_on_focus_loss(now));

        assert!(!guard.should_consume_tray_left_mouse_up(
            now + TRAY_CLICK_FOCUS_LOSS_GRACE + Duration::from_millis(1)
        ));
    }

    #[test]
    fn stale_explicit_hide_does_not_skip_later_focus_loss() {
        let mut guard = OutsideClickCloseGuard::default();
        let now = Instant::now();

        guard.note_explicit_hide(now);

        assert!(guard.should_hide_on_focus_loss(
            now + TRAY_CLICK_FOCUS_LOSS_GRACE + Duration::from_millis(1)
        ));
    }
}
