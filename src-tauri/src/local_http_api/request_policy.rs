#[derive(Debug)]
pub(super) struct LocalRequest<'a> {
    pub method: &'a str,
    pub path: &'a str,
    pub origin: Option<&'a str>,
}

pub(super) fn parse_local_request(request: &str) -> Result<LocalRequest<'_>, u16> {
    let (headers, _) = request.split_once("\r\n\r\n").ok_or(400_u16)?;
    let mut lines = headers.split("\r\n");
    let mut request_line = lines.next().ok_or(400_u16)?.split_whitespace();
    let method = request_line.next().ok_or(400_u16)?;
    let path = request_line.next().ok_or(400_u16)?;
    if !matches!(request_line.next(), Some("HTTP/1.0" | "HTTP/1.1"))
        || request_line.next().is_some()
    {
        return Err(400);
    }

    let mut host = None;
    let mut origin = None;
    for line in lines {
        let (name, value) = line.split_once(':').ok_or(400_u16)?;
        if name.trim() != name || name.is_empty() {
            return Err(400);
        }
        let value = value.trim();
        if name.eq_ignore_ascii_case("host") {
            if host.replace(value).is_some() {
                return Err(400);
            }
        } else if name.eq_ignore_ascii_case("origin") && origin.replace(value).is_some() {
            return Err(400);
        }
    }

    // Loopback binding alone does not stop a browser using a rebound DNS name.
    if !host.is_some_and(|host| {
        host.eq_ignore_ascii_case("127.0.0.1:6736") || host.eq_ignore_ascii_case("localhost:6736")
    }) || origin.is_some_and(|origin| !is_loopback_origin(origin))
    {
        return Err(403);
    }

    Ok(LocalRequest {
        method,
        path,
        origin,
    })
}

fn is_loopback_origin(origin: &str) -> bool {
    let Some(authority) = origin
        .strip_prefix("http://")
        .or_else(|| origin.strip_prefix("https://"))
    else {
        return false;
    };
    for host in ["127.0.0.1", "localhost", "[::1]"] {
        if authority.eq_ignore_ascii_case(host) {
            return true;
        }
        if authority.len() > host.len()
            && authority
                .get(..host.len())
                .is_some_and(|prefix| prefix.eq_ignore_ascii_case(host))
            && authority.as_bytes()[host.len()] == b':'
        {
            let port = &authority[host.len() + 1..];
            return !port.is_empty()
                && port.bytes().all(|byte| byte.is_ascii_digit())
                && port.parse::<u16>().is_ok_and(|port| port > 0);
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn native_loopback_clients_need_no_origin() {
        let request =
            parse_local_request("GET /v1/usage HTTP/1.1\r\nHost: 127.0.0.1:6736\r\n\r\n").unwrap();
        assert_eq!(request.path, "/v1/usage");
        assert_eq!(request.origin, None);
    }

    #[test]
    fn local_browser_clients_keep_their_origin() {
        let request = parse_local_request("OPTIONS /v1/usage HTTP/1.1\r\nHost: localhost:6736\r\nOrigin: http://localhost:3000\r\n\r\n").unwrap();
        assert_eq!(request.origin, Some("http://localhost:3000"));
    }

    #[test]
    fn remote_origins_and_rebound_hosts_are_rejected() {
        for host in [
            "attacker.example:6736",
            "localhost.attacker.example:6736",
            "127.0.0.1:8000",
        ] {
            assert!(matches!(
                parse_local_request(&format!("GET /v1/usage HTTP/1.1\r\nHost: {host}\r\n\r\n")),
                Err(403)
            ));
        }
        for origin in [
            "https://attacker.example",
            "null",
            "http://localhost.attacker.example",
            "http://localhost:3000@attacker.example",
            "http://127.0.0.1:0",
            "http://localhost:65536",
            "http://localhost/",
            "http://localhost:3000/path",
            "http://locālhost:3000",
        ] {
            assert!(
                matches!(
                    parse_local_request(&format!(
                        "GET /v1/usage HTTP/1.1\r\nHost: localhost:6736\r\nOrigin: {origin}\r\n\r\n"
                    )),
                    Err(403)
                ),
                "{origin}"
            );
        }
    }

    #[test]
    fn incomplete_and_ambiguous_headers_are_rejected() {
        for suffix in [
            "",
            "\r\nHost: localhost:6736\r\n\r\n",
            "\r\nOrigin: http://localhost\r\nOrigin: https://attacker.example\r\n\r\n",
            "\r\n Origin: https://attacker.example\r\n\r\n",
        ] {
            assert!(matches!(
                parse_local_request(&format!(
                    "GET /v1/usage HTTP/1.1\r\nHost: localhost:6736{suffix}"
                )),
                Err(400)
            ));
        }
    }

    #[test]
    fn accepts_only_loopback_http_origins() {
        for origin in [
            "http://localhost",
            "https://localhost:3000",
            "http://127.0.0.1:1420",
            "http://[::1]:3000",
        ] {
            assert!(is_loopback_origin(origin));
        }
        for origin in [
            "file://localhost",
            "http://localhost:",
            "http://localhost:80evil",
            "https://[::1].attacker.example",
        ] {
            assert!(!is_loopback_origin(origin));
        }
    }
}
