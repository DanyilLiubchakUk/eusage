# Local HTTP API

eUsage exposes a read-only HTTP API on the loopback interface so other local apps can consume the same usage data shown in the menu bar.

**Base URL:** `http://127.0.0.1:6736`

The server starts automatically with the app. If the port is already in use, the feature is silently disabled for that session.

## Routes

### `GET /v1/usage`

Returns an array of cached usage snapshots for all **enabled** providers, ordered by your plugin settings.

- **200 OK** — JSON array (may be empty `[]` if no cached data exists yet).

### `GET /v1/usage/:providerId`

Returns a single cached usage snapshot for the given provider.

- **200 OK** — JSON object with cached snapshot.
- **204 No Content** — Provider is known but has no cached snapshot yet.
- **404 Not Found** — Provider ID is unknown.

### Unsupported methods

Any method other than `GET` or `OPTIONS` on the above routes returns **405 Method Not Allowed**.

Unknown routes return **404 Not Found**.

## Response Shape

```json
{
  "providerId": "claude",
  "displayName": "Claude",
  "plan": "Team 5x",
  "lines": [
    {
      "type": "progress",
      "label": "Session",
      "used": 42.0,
      "limit": 100.0,
      "format": { "kind": "percent" },
      "resetsAt": "2026-03-26T13:00:00.161Z",
      "periodDurationMs": 18000000,
      "color": null
    },
    {
      "type": "text",
      "label": "Today",
      "value": "$5.17 \u00b7 9.2M tokens",
      "color": null,
      "subtitle": null
    },
    {
      "type": "barChart",
      "label": "Usage Trend",
      "points": [
        { "label": "3/25", "value": 1200000.0, "valueLabel": "1.2M tokens" },
        { "label": "3/26", "value": 2400000.0, "valueLabel": "2.4M tokens" }
      ],
      "note": "Estimated from local logs",
      "color": null
    }
  ],
  "fetchedAt": "2026-03-26T11:16:29Z"
}
```

The `lines` array uses the same metric line types as the internal plugin output: `progress`, `text`, `badge`, and `barChart`.

`fetchedAt` is an ISO 8601 timestamp indicating when the snapshot was last successfully fetched.

`iconUrl` is intentionally omitted from the API response to keep payloads small.

## Filtering and Caching Behavior

- The collection endpoint (`/v1/usage`) returns **enabled providers only**, in the order defined by your plugin settings.
- Only **successful** probe results are cached. A failed probe never overwrites a previous successful snapshot.
- The single-provider endpoint (`/v1/usage/:providerId`) works for any known provider, including disabled ones.

## Browser access

The API accepts native local clients without an `Origin` header. Requests must use `Host: 127.0.0.1:6736` or `Host: localhost:6736`. Other hosts are rejected to prevent DNS rebinding.

Browser clients must run on an HTTP or HTTPS loopback origin: `localhost`, `127.0.0.1`, or `[::1]`, with an optional port. The response echoes that origin:

```
Access-Control-Allow-Origin: http://localhost:3000
Vary: Origin
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

`OPTIONS` requests from allowed origins return **204 No Content** for preflight support. Remote websites and opaque origins, including `file:` pages, receive **403 Forbidden**. This replaces the previous wildcard CORS policy. Remote browser dashboards need a local integration instead of direct access to this API.

## Error Responses

Error responses use this shape:

```json
{
  "error": "provider_not_found"
}
```

Possible error codes: `provider_not_found`, `not_found`, `method_not_allowed`, `server_busy`, `forbidden_origin`, `invalid_request`.

`forbidden_origin` returns **403 Forbidden** for an unsupported host or origin. `invalid_request` returns **400 Bad Request** for malformed, duplicate, or oversized request headers.

`server_busy` returns **503 Service Unavailable** when the local API is already handling the maximum number of concurrent connections. Clients should back off and retry later.
