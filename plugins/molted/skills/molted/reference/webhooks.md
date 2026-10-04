<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Webhooks

Register webhook endpoints to receive push notifications when events occur. Webhooks are available via cookie auth (`/v1/me/webhooks`) for portal access, or via Bearer token auth (`/v1/agent/webhooks?tenantId=T`) for CLI and agent access. `url` must be a public http(s) URL -- private, loopback, link-local and other internal addresses are rejected at registration and re-checked on every delivery; see "URL Requirements (SSRF Protection)" later in this doc.

### Register Webhook

```
POST /v1/me/webhooks
POST /v1/agent/webhooks?tenantId=T
{ "url": "https://example.com/hooks/molted", "events": ["inbound.received", "delivery.bounced"], "description": "Production webhook" }
```

Response includes a `secret` for HMAC signature verification. Store it securely.

### List Webhooks

```
GET /v1/me/webhooks
GET /v1/agent/webhooks?tenantId=T
```

### Get Webhook

```
GET /v1/me/webhooks/:id
GET /v1/agent/webhooks/:id?tenantId=T
```

### Update Webhook

```
PATCH /v1/me/webhooks/:id
PATCH /v1/agent/webhooks/:id?tenantId=T
{ "url": "https://new-url.com/hook", "events": ["inbound.received"], "enabled": false }
```

### Delete Webhook

```
DELETE /v1/me/webhooks/:id
DELETE /v1/agent/webhooks/:id?tenantId=T
```

### List Deliveries

```
GET /v1/me/webhooks/:id/deliveries
GET /v1/agent/webhooks/:id/deliveries?tenantId=T
```

Returns recent delivery attempts with status, HTTP response code, and timestamps.

### Test Webhook

```
POST /v1/me/webhooks/:id/test
POST /v1/agent/webhooks/:id/test?tenantId=T
```

Sends a test event to verify the endpoint is reachable and responding. Test deliveries are recorded in the delivery history.

### Webhook Event Types

| Event | Fired When |
|-------|------------|
| `inbound.received` | New inbound email stored |
| `inbound.classified` | Inbound email classified |
| `inbound.routed` | Inbound email routed to thread |
| `inbound.released` | A message held because the inbound allowance was used up reached your agents (next month, or a paid plan). Payload: `{ messageId, threadId, threadMessageId, mailboxId, reason: "inbound_quota" }` |
| `delivery.sent` | Email sent via provider |
| `delivery.delivered` | Email delivered |
| `delivery.bounced` | Email bounced |
| `delivery.complained` | Spam complaint received |
| `suppression.created` | A hard bounce, complaint, or repeated soft bounce auto-suppressed an address. Payload: `{ recipientEmail, reasonCode, requestId, source: "webhook", triggerEventType, sourceEventId, softBounceCount?, expiresAt? }`. Subscribe to react to addresses going un-sendable without polling `suppressions list`. |

Set `events` to an empty array (or omit) to receive all event types.

### Webhook Payload Format

```json
POST https://your-url.com/hook
Headers:
  X-Molted-Signature: sha256=<HMAC-SHA256 of body using endpoint secret>
  X-Molted-Event: inbound.received
  X-Molted-Delivery: <delivery UUID>
  Content-Type: application/json

{
  "event": "inbound.received",
  "timestamp": "2026-03-22T10:00:00Z",
  "data": { "messageId": "...", "mailboxId": "...", "from": "sender@example.com", "to": "you@yourdomain.com", "receivedAt": "2026-03-22T10:00:00Z" }
}
```

`inbound.received` fires before classification, so `data` deliberately excludes subject and body content (unscanned at this point). Subscribe to `inbound.classified` for the classification result. Until classification has decided whether the message is quarantined or held, every read path returns it as `pending_classification: true` with its content hidden (see "Pending classification" under Get Raw MIME).

### Signature Verification

Verify webhook authenticity by computing HMAC-SHA256:

```javascript
const crypto = require('crypto');
const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
const expected = req.headers['x-molted-signature'].replace('sha256=', '');
if (signature !== expected) throw new Error('Invalid signature');
```

### Delivery & Retries

- Failed deliveries are retried up to 5 times with exponential backoff (10s, 30s, 2m, 10m, 30m).
- A delivery is successful on any 2xx response.
- After max attempts, the delivery is marked as `failed`.

---
