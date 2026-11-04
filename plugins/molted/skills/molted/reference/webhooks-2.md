<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Webhooks

Webhooks deliver real-time event notifications to your URL via HTTP POST. This is the canonical webhook reference. As an agent, use the Bearer routes under `/v1/agent/webhooks` (below). `/v1/me/webhooks` (same paths and bodies after the prefix) is the cookie-session equivalent for a signed-in human in the portal -- it is human-only (#2247): an agent-held cookie session gets `403 human_required` there, never a substitute for the Bearer routes. An app connected through OAuth (the hosted MCP) cannot create or change webhooks (`403 oauth_forbidden`). For local development, where Molted can't reach your machine, stream events with `molted listen` instead (see [Real-Time Events (SSE)](#real-time-events-sse)).

The cookie-session routes, for a signed-in person only:

```
POST   /v1/me/webhooks
GET    /v1/me/webhooks
GET    /v1/me/webhooks/:id
PATCH  /v1/me/webhooks/:id
DELETE /v1/me/webhooks/:id
GET    /v1/me/webhooks/:id/deliveries
POST   /v1/me/webhooks/:id/test
```

**CLI:** `molted webhooks create --url <url> [--events a,b] [--description] [--auth-type hmac|bearer|both] [--bearer-token <t>]`, `molted webhooks list`, `molted webhooks get|delete|deliveries|test --id <id>`, `molted webhooks update --id <id> [--url] [--events] [--enabled true|false] [--description] [--auth-type] [--bearer-token <t>|null]`. No MCP tool.

### Subscribable Event Types

- `inbound.received` - new inbound email stored (payload below; no subject or body)
- `inbound.classified` - inbound email classified (payload: `{ classificationId, platformLabel, autoReplyKind, intent, confidence }`, see [Platform Labels](#platform-labels))
- `inbound.routed` - inbound email routed to thread
- `inbound.released` - a message held for the used-up inbound allowance reached your agents (next month, or a paid plan); payload: `{ messageId, threadId, threadMessageId, mailboxId, reason: "inbound_quota" }`
- `delivery.sent` - email sent
- `delivery.delivered` - email delivered
- `delivery.bounced` - email bounced
- `delivery.complained` - spam complaint received
- `suppression.created` - recipient auto-suppressed (hard bounce / complaint / 3+ soft bounces); payload: `{ recipientEmail, reasonCode, requestId, source: "webhook", triggerEventType, sourceEventId, softBounceCount?, expiresAt? }`. Subscribe to react to addresses going un-sendable without polling `suppressions list`
- `thread.labeled` / `thread.unlabeled` - a [label](#labels) was applied to or removed from a thread (payload: `threadId`, `labelId`, `labelName`, `mailboxId`, `actor`)
- `label.deleted` - a label was deleted, which took it off every thread (payload: `labelId`, `labelName`, `mailboxId`, `actor`, `affectedThreads`)

An empty `events` array (the default) subscribes to every event above. Other stream events (`send.queued`, `coordination.*`, `thread.sla_breached`, ...) are SSE-only and never reach webhooks.

### URL Requirements (SSRF Protection)

Webhook and alert destination URLs are validated when you register or update them, and re-validated on every delivery attempt (registration alone isn't enough, since DNS can change afterward). A URL is rejected if it:

- embeds credentials (`https://user:pass@host/...`)
- resolves (directly as a literal IP, or via DNS) to a private, loopback, link-local, carrier-grade NAT, multicast, or other reserved address -- this includes cloud metadata endpoints like `169.254.169.254`, and covers decimal/octal/hex IP notations (e.g. `http://2130706433/`)

Redirects are never followed blindly: each hop (up to 3) is re-validated against the same rules, so a URL can't pass the check and then redirect somewhere internal. Registration returns a `400` with a clear message when a URL is rejected; a delivery whose URL fails re-validation (e.g. DNS changed since registration) is recorded as a failed delivery.

### Register a Webhook Endpoint

```
POST /v1/agent/webhooks
```

Body:
```json
{
  "url": "https://example.com/hooks/molted",
  "description": "Production webhook",
  "events": ["inbound.received", "delivery.bounced"],
  "authType": "hmac"
}
```

- `authType`: `hmac` (default; the receiver verifies `X-Molted-Signature` with the endpoint `secret`), `bearer` (Molted sends `Authorization: Bearer <bearerToken>`), or `both`. `bearer` and `both` need a non-empty `bearerToken` and an `https://` URL (`400` otherwise).
- Mailbox scope: a webhook created by an all-mailbox key receives every mailbox's events (`mailboxIds: null`). One created by a mailbox-scoped key is limited to the mailboxes that key can both `read` and `send` on (none: `403 mailbox_scope_denied`) and only receives their events, never events without a mailbox. The filter is fixed at creation: narrowing or revoking the creating key doesn't change or remove the webhook (manage it with an all-mailbox key or in the portal). A scoped key lists and reads only webhooks limited to its own `read` mailboxes, and updates, deletes or tests only those limited to its `send` mailboxes; any other webhook, including an unlimited one, is `404`.

Response (create only -- `secret` is shown once):
```json
{
  "id": "webhook-uuid",
  "url": "https://example.com/hooks/molted",
  "description": "Production webhook",
  "secretPrefix": "whsec_EXAMPLE_no...",
  "events": ["inbound.received", "delivery.bounced"],
  "enabled": true,
  "authType": "hmac",
  "bearerTokenSet": false,
  "mailboxIds": null,
  "createdAt": "2026-10-21T10:00:00.000Z",
  "updatedAt": "2026-10-21T10:00:00.000Z",
  "secret": "whsec_EXAMPLE_not_a_real_secret_token"
}
```

**Save the `secret` immediately** -- it is only returned in the create response. Get and update return only `secretPrefix` (the first 16 characters plus `...`); list returns neither. The secret is used to verify webhook signatures. The `bearerToken` is write-only too: reads return `bearerTokenSet: true`, never the token.

### List Webhook Endpoints

```
GET /v1/agent/webhooks
```

### Get Webhook Details

```
GET /v1/agent/webhooks/:id
```

### Update a Webhook Endpoint

```
PATCH /v1/agent/webhooks/:id
```

Body (all fields optional):
```json
{
  "url": "https://new-url.com/hook",
  "events": ["delivery.bounced"],
  "enabled": false,
  "description": "Updated description",
  "authType": "both",
  "bearerToken": "<new-token>"
}
```

Send a new `bearerToken` to rotate it, or `"bearerToken": null` with `"authType": "hmac"` to clear it.

### Delete a Webhook Endpoint

```
DELETE /v1/agent/webhooks/:id
```

### List Recent Deliveries

```
GET /v1/agent/webhooks/:id/deliveries
```

Returns the 50 most recent delivery attempts, each with `id`, `eventType`, `status` (`pending`, `delivered`, `failed`), HTTP status, `attempts`/`maxAttempts`, `deliveredAt` and `createdAt`.

### Send a Test Event

```
POST /v1/agent/webhooks/:id/test
```

Sends a test event (`"event": "test"`) to verify the endpoint is reachable, once, without retries; it is recorded in the delivery history like any other delivery. Response: `{ "success": true, "httpStatus": 200, "deliveryId": "..." }`.

### Webhook Payload Format

Events are delivered as HTTP POST requests:

```
POST https://your-url.com/hook
Headers:
  X-Molted-Signature: sha256=<HMAC-SHA256 of body using endpoint secret>   (authType hmac or both)
  Authorization: Bearer <bearerToken>   (authType bearer or both)
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

- Each attempt times out after 5 seconds; any non-2xx response, timeout or network error counts as a failure.
- A failed delivery is retried on a fixed schedule: 10s, 1m, 5m, 30m, 2h, then every 6h, for 10 attempts in total (the first try plus 9 retries). That is about 26.6 hours from the first failure until the delivery is marked `failed`; nothing redelivers it after that.
- Retries stop early, with the delivery marked `failed`, if the endpoint is deleted or disabled in the meantime.
- `X-Molted-Delivery` is generated once per delivery and stays the same on every attempt, so receivers can dedupe on it.
- The URL is re-validated against the SSRF rules above on every attempt.
- Use the deliveries endpoint to debug failed webhooks.
