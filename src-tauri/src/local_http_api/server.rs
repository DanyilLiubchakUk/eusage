use super::cache::{cache_state, enabled_snapshots_ordered};
use super::request_policy::parse_local_request;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

const BIND_ADDR: &str = "127.0.0.1:6736";
const MAX_CONCURRENT_CONNECTIONS: usize = 16;
const CONNECTION_TIMEOUT: Duration = Duration::from_secs(5);

struct ConnectionLimiter {
    active: Arc<AtomicUsize>,
    max: usize,
}

struct ConnectionPermit {
    active: Arc<AtomicUsize>,
}

impl ConnectionLimiter {
    fn new(max: usize) -> Self {
        Self {
            active: Arc::new(AtomicUsize::new(0)),
            max,
        }
    }

    fn acquire(&self) -> Option<ConnectionPermit> {
        loop {
            let active = self.active.load(Ordering::Acquire);
            if active >= self.max {
                return None;
            }
            if self
                .active
                .compare_exchange(active, active + 1, Ordering::AcqRel, Ordering::Acquire)
                .is_ok()
            {
                return Some(ConnectionPermit {
                    active: Arc::clone(&self.active),
                });
            }
        }
    }

    #[cfg(test)]
    fn active_count(&self) -> usize {
        self.active.load(Ordering::Acquire)
    }
}

impl Drop for ConnectionPermit {
    fn drop(&mut self) {
        self.active.fetch_sub(1, Ordering::AcqRel);
    }
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

pub fn start_server() {
    std::thread::spawn(|| {
        let listener = match TcpListener::bind(BIND_ADDR) {
            Ok(l) => {
                log::info!("local HTTP API listening on {}", BIND_ADDR);
                l
            }
            Err(e) => {
                log::warn!(
                    "failed to bind local HTTP API on {}: {} — feature disabled for this session",
                    BIND_ADDR,
                    e
                );
                return;
            }
        };

        let limiter = ConnectionLimiter::new(MAX_CONCURRENT_CONNECTIONS);
        for stream in listener.incoming() {
            match stream {
                Ok(mut stream) => {
                    let Some(permit) = limiter.acquire() else {
                        log::warn!(
                            "local HTTP API connection limit reached (max={})",
                            MAX_CONCURRENT_CONNECTIONS
                        );
                        let _ = stream.set_write_timeout(Some(CONNECTION_TIMEOUT));
                        let _ = stream.write_all(response_service_unavailable().as_bytes());
                        let _ = stream.flush();
                        continue;
                    };
                    std::thread::spawn(move || handle_connection(stream, permit));
                }
                Err(e) => log::debug!("local HTTP API accept error: {}", e),
            }
        }
    });
}

fn handle_connection(mut stream: TcpStream, _permit: ConnectionPermit) {
    let _ = stream.set_write_timeout(Some(CONNECTION_TIMEOUT));
    let mut buf = [0u8; 4096];
    let mut used = 0;
    let deadline = Instant::now() + CONNECTION_TIMEOUT;
    // Validate complete headers, including headers received in later TCP packets.
    let response = loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() || used == buf.len() {
            break response_json(400, "Bad Request", r#"{"error":"invalid_request"}"#);
        }
        let _ = stream.set_read_timeout(Some(remaining));
        match stream.read(&mut buf[used..]) {
            Ok(0) | Err(_) => return,
            Ok(n) => used += n,
        }
        if buf[..used].windows(4).any(|part| part == b"\r\n\r\n") {
            break match std::str::from_utf8(&buf[..used]) {
                Ok(request) => respond_to_request(request),
                Err(_) => response_json(400, "Bad Request", r#"{"error":"invalid_request"}"#),
            };
        }
    };
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}

fn respond_to_request(request: &str) -> String {
    let request = match parse_local_request(request) {
        Ok(request) => request,
        Err(403) => return response_json(403, "Forbidden", r#"{"error":"forbidden_origin"}"#),
        Err(_) => return response_json(400, "Bad Request", r#"{"error":"invalid_request"}"#),
    };
    // Strip query string and trailing slash (but keep root "/v1/usage" intact)
    let path = request.path.split('?').next().unwrap_or(request.path);
    let path = if path.len() > 1 {
        path.trim_end_matches('/')
    } else {
        path
    };

    let response = route(request.method, path);
    match request.origin {
        Some(origin) => response.replacen(
            "\r\n",
            &format!("\r\nAccess-Control-Allow-Origin: {origin}\r\n"),
            1,
        ),
        None => response,
    }
}

fn route(method: &str, path: &str) -> String {
    // Match routes
    if path == "/v1/usage" {
        return match method {
            "GET" => handle_get_usage_collection(),
            "OPTIONS" => response_no_content(),
            _ => response_method_not_allowed(),
        };
    }

    if let Some(provider_id) = path.strip_prefix("/v1/usage/") {
        if !provider_id.is_empty() && !provider_id.contains('/') {
            return match method {
                "GET" => handle_get_usage_single(provider_id),
                "OPTIONS" => response_no_content(),
                _ => response_method_not_allowed(),
            };
        }
    }

    response_not_found("not_found")
}

fn handle_get_usage_collection() -> String {
    let snapshots = {
        let state = cache_state().lock().expect("cache state poisoned");
        enabled_snapshots_ordered(&state)
    };
    let body = serde_json::to_string(&snapshots).unwrap_or_else(|_| "[]".to_string());
    response_json(200, "OK", &body)
}

fn handle_get_usage_single(provider_id: &str) -> String {
    let state = cache_state().lock().expect("cache state poisoned");

    // Check if provider is known at all
    let is_known = state.known_plugin_ids.iter().any(|id| id == provider_id);
    if !is_known {
        return response_not_found("provider_not_found");
    }

    match state.snapshots.get(provider_id) {
        Some(snapshot) => {
            let body = serde_json::to_string(snapshot).unwrap_or_else(|_| "{}".to_string());
            response_json(200, "OK", &body)
        }
        None => response_no_content(),
    }
}

// ---------------------------------------------------------------------------
// HTTP response builders
// ---------------------------------------------------------------------------

const CORS_HEADERS: &str = "\
Vary: Origin\r\n\
Access-Control-Allow-Methods: GET, OPTIONS\r\n\
Access-Control-Allow-Headers: Content-Type";

fn response_json(status: u16, reason: &str, body: &str) -> String {
    format!(
        "HTTP/1.1 {} {}\r\nConnection: close\r\nContent-Type: application/json; charset=utf-8\r\n{}\r\nContent-Length: {}\r\n\r\n{}",
        status,
        reason,
        CORS_HEADERS,
        body.len(),
        body,
    )
}

fn response_no_content() -> String {
    format!(
        "HTTP/1.1 204 No Content\r\nConnection: close\r\n{}\r\n\r\n",
        CORS_HEADERS,
    )
}

fn response_not_found(error_code: &str) -> String {
    let body = format!(r#"{{"error":"{}"}}"#, error_code);
    response_json(404, "Not Found", &body)
}

fn response_method_not_allowed() -> String {
    let body = r#"{"error":"method_not_allowed"}"#;
    response_json(405, "Method Not Allowed", body)
}

fn response_service_unavailable() -> String {
    let body = r#"{"error":"server_busy"}"#;
    response_json(503, "Service Unavailable", body)
}

#[cfg(test)]
mod tests {
    use super::super::cache::{cache_state, CachedPluginSnapshot};
    use super::*;
    use serial_test::serial;

    fn make_snapshot(id: &str, name: &str) -> CachedPluginSnapshot {
        CachedPluginSnapshot {
            provider_id: id.to_string(),
            display_name: name.to_string(),
            plan: Some("Pro".to_string()),
            lines: vec![],
            provider_account_detections: Vec::new(),
            source_facts: None,
            raw_payload: None,
            fetched_at: "2026-03-26T08:15:30Z".to_string(),
        }
    }

    #[test]
    fn route_get_usage_returns_200() {
        let resp = route("GET", "/v1/usage");
        assert!(resp.starts_with("HTTP/1.1 200"));
    }

    #[test]
    fn route_unknown_path_returns_404() {
        let resp = route("GET", "/v2/something");
        assert!(resp.starts_with("HTTP/1.1 404"));
    }

    #[test]
    fn route_post_returns_405() {
        let resp = route("POST", "/v1/usage");
        assert!(resp.starts_with("HTTP/1.1 405"));
    }

    #[test]
    fn route_options_returns_204_without_wildcard_cors() {
        let resp = route("OPTIONS", "/v1/usage");
        assert!(resp.starts_with("HTTP/1.1 204"));
        assert!(!resp.contains("Access-Control-Allow-Origin:"));
    }

    #[test]
    #[serial]
    fn route_unknown_provider_returns_404() {
        {
            let mut state = cache_state().lock().unwrap();
            state.known_plugin_ids = vec!["claude".to_string()];
            state.snapshots.clear();
        }

        let resp = route("GET", "/v1/usage/nonexistent");
        assert!(resp.starts_with("HTTP/1.1 404"));
        assert!(resp.contains("provider_not_found"));
    }

    #[test]
    #[serial]
    fn route_known_uncached_provider_returns_204() {
        {
            let mut state = cache_state().lock().unwrap();
            state.known_plugin_ids = vec!["claude".to_string()];
            state.snapshots.clear();
        }

        let resp = route("GET", "/v1/usage/claude");
        assert!(resp.starts_with("HTTP/1.1 204"));
    }

    #[test]
    #[serial]
    fn route_known_cached_provider_returns_200() {
        {
            let mut state = cache_state().lock().unwrap();
            state.known_plugin_ids = vec!["claude".to_string()];
            state
                .snapshots
                .insert("claude".to_string(), make_snapshot("claude", "Claude"));
        }

        let resp = route("GET", "/v1/usage/claude");
        assert!(resp.starts_with("HTTP/1.1 200"));
        assert!(resp.contains("fetchedAt"));
    }

    #[test]
    fn route_options_on_provider_returns_204() {
        let resp = route("OPTIONS", "/v1/usage/claude");
        assert!(resp.starts_with("HTTP/1.1 204"));
        assert!(resp.contains("Access-Control-Allow-Methods: GET, OPTIONS"));
    }

    #[test]
    fn response_json_includes_cors_headers() {
        let resp = response_json(200, "OK", "[]");
        assert!(resp.contains("Vary: Origin"));
        assert!(!resp.contains("Access-Control-Allow-Origin:"));
        assert!(resp.contains("Content-Type: application/json; charset=utf-8"));
    }

    #[test]
    fn connection_limiter_rejects_above_capacity_and_releases_on_drop() {
        let limiter = ConnectionLimiter::new(2);
        let first = limiter.acquire().expect("first permit");
        let second = limiter.acquire().expect("second permit");

        assert!(limiter.acquire().is_none());
        assert_eq!(limiter.active_count(), 2);

        drop(first);

        let third = limiter.acquire().expect("permit after release");
        assert_eq!(limiter.active_count(), 2);

        drop(second);
        drop(third);
        assert_eq!(limiter.active_count(), 0);
    }

    #[test]
    fn response_service_unavailable_returns_503_json() {
        let resp = response_service_unavailable();

        assert!(resp.starts_with("HTTP/1.1 503"));
        assert!(resp.contains(r#""error":"server_busy""#));
        assert!(!resp.contains("Access-Control-Allow-Origin:"));
    }

    #[test]
    fn loopback_browser_preflight_echoes_only_its_origin() {
        let response = respond_to_request(
            "OPTIONS /v1/usage HTTP/1.1\r\nHost: 127.0.0.1:6736\r\nOrigin: http://localhost:3000\r\n\r\n",
        );
        assert!(response.starts_with("HTTP/1.1 204"));
        assert!(response.contains("Access-Control-Allow-Origin: http://localhost:3000\r\n"));
    }

    #[test]
    fn remote_browser_cannot_read_usage() {
        let response = respond_to_request(
            "GET /v1/usage HTTP/1.1\r\nHost: 127.0.0.1:6736\r\nOrigin: https://attacker.example\r\n\r\n",
        );
        assert!(response.starts_with("HTTP/1.1 403"));
        assert!(!response.contains("Access-Control-Allow-Origin:"));
        assert!(!response.contains("fetchedAt"));
    }

    #[test]
    fn waits_for_origin_in_a_later_packet_before_responding() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let mut client = TcpStream::connect(listener.local_addr().unwrap()).unwrap();
        let (server, _) = listener.accept().unwrap();
        let permit = ConnectionLimiter::new(1).acquire().unwrap();
        let worker = std::thread::spawn(move || handle_connection(server, permit));
        client.write_all(b"OPTIONS /v1/usage HTTP/1.1\r\nHost: localhost:6736\r\n").unwrap();
        client.set_read_timeout(Some(Duration::from_millis(50))).unwrap();
        let error = client.read(&mut [0u8; 1]).unwrap_err();
        assert!(matches!(error.kind(), std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut));

        client.write_all(b"Origin: https://attacker.example\r\n\r\n").unwrap();
        client.set_read_timeout(Some(Duration::from_secs(2))).unwrap();
        let mut response = String::new();
        client.read_to_string(&mut response).unwrap();
        worker.join().unwrap();
        assert!(response.starts_with("HTTP/1.1 403"));
        assert!(!response.contains("Access-Control-Allow-Origin:"));
    }
}
