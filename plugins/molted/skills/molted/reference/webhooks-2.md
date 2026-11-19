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
- Mailbox scope: a webhook created by an all-mailbox key receives every mailbox's events (`mailboxIds: null`). One created by a mailbox-scoped key is limited to the mailboxes that key can both `read` and `send` on (none: `403 mailbox_scope_denied`) and only receives their events, never events without a mailbox. The filter is fixed at creation, but it follows the creating key afterwards (#1973): if the key is narrowed, the webhook only receives events for the mailboxes the key can still `read` and `send` on; if the key is revoked or rotated, its person is removed or dropped below `admin`, or its workspace is inactive, the webhook is switched off (`disabledReason`, e.g. `creator_key_revoked`) and an agent can't re-enable it (`403 webhook_disabled_by_scope`): a person must, and then owns it. A `mailboxIds` in the create body is ignored. A scoped key lists and reads only webhooks limited to its own `read` mailboxes, and updates, deletes or tests only those limited to its `send` mailboxes; any other webhook, including an unlimited one, is `404`.

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

In `enforce` mode an agent key can only change `description`, or set `enabled: true` on an endpoint that is already on or that the same key turned off, on a webhook its own key did not create. Turning on an endpoint a person or another key disabled is a person's call too (`loosens: ["enabled"]`). Disabling the endpoint, or changing its `url`, `events`, `authType` or `bearerToken`, is a person's call: the answer is `403 human_decision_required` with `kind: "webhook"` and `loosens` naming the fields, and nothing changes. Ask a person on your team to make that change. A webhook your own key created is yours to change and delete. (`warn` goes through with the deprecation header, `off` works.)

### Delete a Webhook Endpoint

```
DELETE /v1/agent/webhooks/:id
```

In `enforce` mode an agent key gets `403 human_decision_required` with `kind: "webhook"` and the endpoint stays, unless your own key created it.

### List Recent Deliveries

```
GET /v1/agent/webhooks/:id/deliveries
```

Returns the 50 most recent delivery attempts, each with `id`, `eventType`, `status` (`pending`, `delivered`, `failed`), HTTP status, `attempts`/`maxAttempts`, `deliveredAt` and `createdAt`.

### Send a Test Event

```
POST /v1/agent/webhooks/:id/test
```

Sends a test event (`"event": "test"`) to verify the endpoint is reachable, once, without retries; it is recorded in the delivery history like any other delivery. Response: `{ "success": true, "httpStatus": 200, "deliveryId": "..." }`. A test send is limited to one per endpoint every 30 seconds and 10 a minute across all your webhook endpoints and alert destinations together; over either limit you get a `429` (`rate_limited`) and nothing is sent. At most 20 webhook endpoints per workspace; the 21st gets a `409` (`webhook_limit_reached`). A failed send's `error` is a fixed code (`connection_refused`, `timeout`, `tls_error`, `blocked_destination`, `connection_failed`), never an address.

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
- Delivery is at least once per endpoint: build the receiver to handle the same event twice.
- `X-Molted-Delivery` is fixed by the event and the endpoint. It stays the same on every attempt and on any later attempt to send the same event to the same endpoint, so receivers dedupe on it. Different endpoints get different IDs for one event.
- An event the live send missed (for example while Molted's workers restart) is sent within a few minutes by a sweep, up to 24 hours after it happened, with its original `timestamp`. Older than that it is not delivered late; read it from the event stream with `since`.
- Order is not guaranteed: a late event can arrive after a newer one, so order by `timestamp`.
- An endpoint created after an event never receives that event.
- The URL is re-validated against the SSRF rules above on every attempt.
- Use the deliveries endpoint to debug failed webhooks.
