<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Webhooks

Webhooks deliver real-time event notifications to your URL via HTTP POST. Webhook management is available via cookie auth (`/v1/me/webhooks`) or Bearer token auth (`/v1/agent/webhooks?tenantId=T`).

### Subscribable Event Types

- `inbound.received` — new inbound email stored
- `inbound.classified` — inbound email classified
- `inbound.routed` — inbound email routed to thread
- `inbound.released` — a message held for the used-up inbound allowance reached your agents
- `delivery.sent` — email sent
- `delivery.delivered` — email delivered
- `delivery.bounced` — email bounced
- `delivery.complained` — spam complaint received
- `suppression.created` — recipient auto-suppressed (hard bounce / complaint / 3+ soft bounces); subscribe to react to addresses going un-sendable without polling `suppressions list`

### URL Requirements (SSRF Protection)

Webhook and alert destination URLs are validated when you register or update them, and re-validated on every delivery attempt (registration alone isn't enough, since DNS can change afterward). A URL is rejected if it:

- embeds credentials (`https://user:pass@host/...`)
- resolves (directly as a literal IP, or via DNS) to a private, loopback, link-local, carrier-grade NAT, multicast, or other reserved address -- this includes cloud metadata endpoints like `169.254.169.254`, and covers decimal/octal/hex IP notations (e.g. `http://2130706433/`)

Redirects are never followed blindly: each hop (up to 3) is re-validated against the same rules, so a URL can't pass the check and then redirect somewhere internal. Registration returns a `400` with a clear message when a URL is rejected; a delivery whose URL fails re-validation (e.g. DNS changed since registration) is recorded as a failed delivery.

### Register a Webhook Endpoint

```
POST /v1/me/webhooks
```

Body:
```json
{
  "url": "https://example.com/hooks/molted",
  "description": "Production webhook",
  "events": ["inbound.received", "delivery.bounced"]
}
```

Response (create only -- `secret` is shown once):
```json
{
  "id": "...",
  "url": "https://example.com/hooks/molted",
  "secret": "whsec_...",
  "secretPrefix": "whsec_......",
  "events": ["inbound.received", "delivery.bounced"],
  "enabled": true
}
```

**Save the `secret` immediately** -- it is only returned in the create response. Subsequent get/list/update calls return only `secretPrefix` (first 16 characters). The secret is used to verify webhook signatures.

### List Webhook Endpoints

```
GET /v1/me/webhooks
```

### Get Webhook Details

```
GET /v1/me/webhooks/:id
```

### Update a Webhook Endpoint

```
PATCH /v1/me/webhooks/:id
```

Body (all fields optional):
```json
{
  "url": "https://new-url.com/hook",
  "events": ["delivery.bounced"],
  "enabled": false,
  "description": "Updated description"
}
```

### Delete a Webhook Endpoint

```
DELETE /v1/me/webhooks/:id
```

### List Recent Deliveries

```
GET /v1/me/webhooks/:id/deliveries?limit=50
```

Returns recent delivery attempts with status (`pending`, `delivered`, `failed`), HTTP status, and attempt count.

### Send a Test Event

```
POST /v1/me/webhooks/:id/test
```

Sends a test event to verify the endpoint is reachable. Returns the delivery status and HTTP response code.

### Webhook Payload Format

Events are delivered as HTTP POST requests:

```
POST https://your-url.com/hook
Headers:
  X-Molted-Signature: sha256=<HMAC-SHA256 of body using endpoint secret>
  X-Molted-Event: inbound.received
  X-Molted-Delivery: <delivery UUID>
  Content-Type: application/json

{
  "event": "inbound.received",
  "timestamp": "2026-03-22T10:00:00Z",
  "data": { ... }
}
```

### Signature Verification

Verify webhook authenticity by computing HMAC-SHA256 of the raw request body:

```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(rawBody)
  .digest('hex');
const expected = req.headers['x-molted-signature'].replace('sha256=', '');
if (signature !== expected) throw new Error('Invalid signature');
```

### Delivery & Retries

- Deliveries timeout after 5 seconds
- Failed deliveries retry up to 5 times with exponential backoff (10s, 30s, 2min, 10min, 30min)
- After all retries are exhausted, the delivery is marked as `failed`
- Use the deliveries endpoint to debug failed webhooks
