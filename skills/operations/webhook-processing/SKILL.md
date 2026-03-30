---
name: webhook-processing
description: Process email delivery webhooks from providers like SendGrid, Postmark, SES, Resend, and Mailgun. Use when building webhook endpoints, handling bounces/complaints/deliveries, debugging missed events, or implementing idempotent event processing.
license: MIT
---

# Webhook Processing

Receive and process delivery event webhooks from email providers reliably.

## When to use this skill

- Building a webhook endpoint to receive delivery, bounce, or complaint events
- Debugging why events are being missed or duplicated
- Implementing idempotent webhook processing
- Verifying webhook signatures from a specific provider
- Designing an async processing pipeline for email events
- Handling provider-specific webhook formats (SendGrid, Postmark, SES, Resend, Mailgun)
- Setting up suppression lists from bounce/complaint webhooks

## Related skills

- `bounce-handling` - what to do after you receive bounce events
- `suppression-lists` - managing the suppression entries that webhook processing creates
- `sender-monitoring` - dashboards and alerts built on webhook event data
- `sender-reputation` - how bounces and complaints from webhooks affect your reputation

---

## How email webhooks work

When you send an email through a provider, the provider tracks what happens to it - delivered, bounced, opened, complained, etc. Webhooks are HTTP POST requests the provider sends to your endpoint whenever one of these events occurs.

The basic flow:

1. You send an email via your provider's API
2. The provider attempts delivery
3. Something happens (delivered, bounced, recipient complained, etc.)
4. The provider POSTs a JSON payload to your configured webhook URL
5. Your endpoint processes the event and returns 2xx

If your endpoint doesn't return 2xx, the provider retries with exponential backoff - usually for 24-72 hours before giving up.

---

## Event types

Every provider uses slightly different names, but the events map to the same concepts:

| Event | What happened | Action to take |
|-------|--------------|----------------|
| **Delivered** | Message accepted by recipient's mail server | Update delivery status. This is your success signal. |
| **Bounced (hard)** | Permanent failure - address doesn't exist, domain invalid | Suppress the recipient immediately. Never send to them again. |
| **Bounced (soft)** | Temporary failure - mailbox full, server down, rate limited | Retry with backoff. Suppress after 3+ failures in 30 days. |
| **Complained** | Recipient clicked "Report Spam" | Suppress immediately. This is the most damaging event for reputation. |
| **Deferred** | Provider is retrying delivery (temporary issue) | Log it. The provider handles retries. Only act if it persists. |
| **Opened** | Recipient opened the email (tracking pixel loaded) | Engagement signal only. Don't change delivery status. |
| **Clicked** | Recipient clicked a tracked link | Engagement signal only. Don't change delivery status. |
| **Unsubscribed** | Recipient used list-unsubscribe or unsubscribe link | Remove from future sends. Required by CAN-SPAM and Google/Yahoo. |

### Engagement events are signals, not status changes

Opens and clicks are engagement events. They tell you someone interacted with the email, but they don't change the delivery status. A message that was "delivered" stays "delivered" even after it's opened. Track engagement events separately from delivery status.

### Delivery status is a state machine

Status should only advance forward. The ordering is: `queued -> sent -> delivered -> bounced/complained/failed`. Never let a "delivered" event overwrite a "bounced" status that arrived later due to event ordering. Implement a status order check:

```typescript
const STATUS_ORDER: Record<string, number> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  deferred: 2,
  bounced: 3,
  complained: 3,
  failed: 3,
};

function shouldUpdateStatus(current: string | null, incoming: string): boolean {
  if (!current) return true;
  return (STATUS_ORDER[incoming] ?? -1) > (STATUS_ORDER[current] ?? -1);
}
```

---

## Architecture: verify, enqueue, ACK

The single most important architectural decision: **never process webhook payloads inline**. Your webhook endpoint should do three things and nothing else:

1. **Verify** the signature
2. **Enqueue** the raw payload to a durable queue (Redis/BullMQ, SQS, RabbitMQ)
3. **Return 200** immediately

```
Provider --> POST /webhooks/resend
               |
               v
         [Verify signature]
               |
               v
         [Enqueue to job queue]
               |
               v
         [Return 200 OK]    <-- must happen in < 5 seconds

               ...later...

         [Worker picks up job]
               |
               v
         [Normalize event]
               |
               v
         [Deduplicate]
               |
               v
         [Update delivery status]
               |
               v
         [Auto-suppress if bounce/complaint]
               |
               v
         [Record audit event]
               |
               v
         [Fan out to downstream webhooks]
```

Why this matters:
- Providers expect fast responses. SendGrid times out after 10 seconds. Postmark after 10 seconds. If your endpoint is slow, they mark it as failing and may disable it.
- Webhook processing often involves database writes, API calls, and business logic. Any of these can be slow or fail.
- If your endpoint crashes mid-processing, the event is lost. With a queue, the worker retries.

### Minimal webhook endpoint example

```typescript
app.post('/webhooks/resend', async (req, res) => {
  // 1. Verify signature (use raw body, not parsed JSON)
  const rawBody = req.rawBody.toString('utf-8');
  if (!verifyResendSignature(rawBody, req.headers)) {
    return res.status(400).json({ error: 'invalid_signature' });
  }

  // 2. Enqueue for async processing
  await queue.add('webhook-event', {
    provider: 'resend',
    payload: req.body,
    receivedAt: new Date().toISOString(),
  });

  // 3. ACK immediately
  return res.status(200).json({ received: true });
});
```

---

## Signature verification

Every provider signs their webhooks differently. Verification is non-negotiable - without it, anyone can POST fake events to your endpoint.

### Critical rule: verify against the raw body

This is the #1 cause of signature verification failures. You must verify the HMAC against the exact bytes the provider signed - the raw HTTP request body. If your framework parses the body as JSON and you re-stringify it, whitespace or key ordering may change, and the signature won't match.

In Express/NestJS, capture the raw body:

```typescript
// Express
app.use(express.json({
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf;
  }
}));

// Then in your handler:
const raw = req.rawBody.toString('utf-8');
```

### Use constant-time comparison

Always use `timingSafeEqual` for signature comparison. Regular string comparison (`===`) leaks timing information that can be used to forge signatures.

```typescript
import { timingSafeEqual } from 'node:crypto';

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
```

---

## Provider-specific formats

### Resend (Svix-based)

Resend uses Svix under the hood. Signature headers: `svix-id`, `svix-timestamp`, `svix-signature`.

**Verification:**

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto';

function verifyResendSignature(
  payload: string,
  headers: Record<string, string>,
  secret: string
): boolean {
  const msgId = headers['svix-id'];
  const timestamp = headers['svix-timestamp'];
  const signature = headers['svix-signature'];

  if (!msgId || !timestamp || !signature) return false;

  const toSign = `${msgId}.${timestamp}.${payload}`;
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', secretBytes)
    .update(toSign)
    .digest('base64');

  // Signature header may contain multiple signatures: "v1,<sig1> v1,<sig2>"
  return signature.split(' ').some((sig) => {
    const sigValue = sig.replace(/^v1,/, '');
    try {
      const sigBuf = Buffer.from(sigValue, 'base64');
      const expectedBuf = Buffer.from(expected, 'base64');
      if (sigBuf.length !== expectedBuf.length) return false;
      return timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  });
}
```

**Event format:** Single JSON object with `type` (e.g., `email.delivered`, `email.bounced`, `email.complained`) and `data` containing the email details. Custom metadata is in `data.tags`.

**Event types:** `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.delivery_delayed`, `email.opened`, `email.clicked`

### Postmark

Signature header: `x-postmark-signature`. HMAC-SHA256 of the raw body using your webhook token.

**Verification:**

```typescript
import { createHmac } from 'node:crypto';

function verifyPostmarkSignature(
  payload: string,
  headers: Record<string, string>,
  token: string
): boolean {
  const signature = headers['x-postmark-signature'];
  if (!signature) return false;
  const expected = createHmac('sha256', token)
    .update(payload)
    .digest('base64');
  return safeCompare(signature, expected);
}
```

**Event format:** Single JSON object with `RecordType` field: `Delivery`, `Bounce`, `SpamComplaint`, `Open`, `Click`, `SubscriptionChange`. Timestamps use ISO 8601. Custom metadata in `Metadata` object. Bounce details include `Type` (`Transient` or `HardBounce`), `TypeCode`, and `Description`.

**Bounce classification:** `TypeCode` 4000-4099 = soft bounce. `Type: "HardBounce"` = hard bounce. `Type: "Transient"` or `Type: "SoftBounce"` = soft bounce.

### AWS SES (via SNS)

SES doesn't send webhooks directly. It publishes to SNS topics, which forward to your HTTP endpoint. This adds a layer of complexity.

**SNS subscription confirmation:** Before you receive any events, SNS sends a `SubscriptionConfirmation` request. You must fetch the `SubscribeURL` to confirm. Validate that the URL actually points to `sns.<region>.amazonaws.com` before fetching - this prevents SSRF attacks.

```typescript
function isValidSnsSubscribeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:'
      && /^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(parsed.hostname);
  } catch {
    return false;
  }
}
```

**Signature verification:** SNS messages are signed with the SNS service's certificate. For production, use the AWS SNS message validator library. For simpler setups, rely on endpoint obscurity + HTTPS as a baseline while you implement full validation.

**Event format:** The SNS message wraps the SES event in a `Message` field (JSON string that must be parsed). The inner SES event has `eventType`: `Delivery`, `Bounce`, `Complaint`, `Send`, `DeliveryDelay`. The `mail` object contains `messageId` and `tags` (key-value pairs where values are arrays).

**Bounce classification:** `bounce.bounceType`: `Permanent` (hard) or `Transient` (soft). The `bounceSubType` provides more detail: `General`, `NoEmail`, `Suppressed`, `MailboxFull`, `ContentRejected`, etc.

**Important SES quirk:** You may receive one notification for multiple recipients, or one per recipient. Your code must handle both cases.

### SendGrid

SendGrid is unique - it batches events. You receive a JSON **array** of events in a single POST, not individual objects. A single request can contain 1,000+ events.

**Signature verification:** SendGrid uses ECDSA (Elliptic Curve), not HMAC. The public key is provided in your SendGrid dashboard. Headers: `X-Twilio-Email-Event-Webhook-Signature` and `X-Twilio-Email-Event-Webhook-Timestamp`.

```typescript
import { createVerify } from 'node:crypto';

function verifySendGridSignature(
  payload: string,
  headers: Record<string, string>,
  publicKey: string
): boolean {
  const signature = headers['x-twilio-email-event-webhook-signature'];
  const timestamp = headers['x-twilio-email-event-webhook-timestamp'];

  if (!signature || !timestamp) return false;

  const timestampPayload = timestamp + payload;
  const verifier = createVerify('sha256');
  verifier.update(timestampPayload);

  return verifier.verify(publicKey, signature, 'base64');
}
```

**Event format:** Array of JSON objects. Each has an `event` field: `processed`, `delivered`, `bounce`, `deferred`, `dropped`, `open`, `click`, `spamreport`, `unsubscribe`, `group_unsubscribe`, `group_resubscribe`. Custom metadata in `unique_args` or `marketing_campaign_id`.

**Important:** Because events are batched, you must iterate the array and process each event individually. Don't assume one event per request.

### Mailgun

Signature header fields are embedded in the JSON payload, not in HTTP headers. The `signature` object contains `timestamp`, `token`, and `signature`.

**Verification:**

```typescript
import { createHmac } from 'node:crypto';

function verifyMailgunSignature(
  payload: { signature: { timestamp: string; token: string; signature: string } },
  apiKey: string
): boolean {
  const { timestamp, token, signature } = payload.signature;
  const encoded = createHmac('sha256', apiKey)
    .update(timestamp + token)
    .digest('hex');
  return safeCompare(encoded, signature);
}
```

**Event format:** JSON with `signature` and `event-data` objects. Event types in `event-data.event`: `delivered`, `failed` (bounces), `opened`, `clicked`, `unsubscribed`, `complained`, `stored`.

---

## Idempotency and deduplication

Providers retry failed webhook deliveries. Your endpoint will receive the same event more than once. If you don't deduplicate, you'll double-count bounces, send duplicate suppression notifications, or corrupt your metrics.

### Deduplication by provider event ID

Every provider includes a unique event identifier. Use it as your deduplication key:

| Provider | Event ID field |
|----------|---------------|
| Resend | Top-level `id` field (Svix message ID) |
| Postmark | `MessageID` (per-message, not per-event - combine with `RecordType`) |
| SES | `mail.messageId` |
| SendGrid | `sg_event_id` in each event object |
| Mailgun | `event-data.id` |

### Implementation

Store processed event IDs in a database table with a unique constraint:

```sql
CREATE TABLE delivery_events (
  id UUID PRIMARY KEY,
  provider_event_id TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  request_id TEXT,
  raw_payload JSONB,
  metadata JSONB,
  occurred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_delivery_events_provider_event_id
  ON delivery_events(provider_event_id);
```

Check before processing:

```typescript
const existing = await db.query(
  'SELECT 1 FROM delivery_events WHERE provider_event_id = $1 LIMIT 1',
  [payload.providerEventId]
);
if (existing.rows.length > 0) {
  return { deduplicated: true };
}
```

For high-throughput systems, use Redis with a TTL as a fast dedup check before hitting the database:

```typescript
const key = `webhook:dedup:${providerEventId}`;
const wasSet = await redis.set(key, '1', 'NX', 'EX', 60 * 60 * 24 * 7); // 7 days
if (!wasSet) {
  return { deduplicated: true };
}
```

---

## Normalizing across providers

If you support multiple email providers (or plan to switch providers later), normalize webhook payloads into a common format immediately. This keeps your business logic provider-agnostic.

### Adapter pattern

Define a common interface and implement it per provider:

```typescript
interface WebhookPayload {
  providerEventId: string;
  eventType: 'sent' | 'delivered' | 'bounced' | 'complained' | 'deferred' | 'opened' | 'clicked';
  requestId: string | null;        // your internal message ID
  providerMessageId: string | null; // provider's message ID
  rawPayload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  occurredAt: string;              // ISO 8601
}

interface WebhookAdapter {
  verifySignature(payload: string, headers: Record<string, string>): boolean;
  normalize(rawPayload: Record<string, unknown>): WebhookPayload | null;
}
```

Each provider gets its own adapter class. The webhook controller routes to the right adapter based on the URL path (`/webhooks/resend`, `/webhooks/postmark`, etc.), verifies the signature, normalizes the payload, and passes the normalized event to a single `processEvent()` function.

This means your delivery status updates, suppression logic, and audit trail code never know which provider sent the event.

---

## Linking events back to your messages

When you send an email, store a mapping between your internal message ID and the provider's message ID. When a webhook arrives, use this mapping to update the right record.

Most providers support custom tags or metadata on the send call that get echoed back in webhooks:

| Provider | How to attach metadata | How it appears in webhook |
|----------|----------------------|--------------------------|
| Resend | `tags` object on send | `data.tags` |
| Postmark | `Metadata` object on send | `Metadata` |
| SES | `Tags` on send (key-value pairs) | `mail.tags` (values are arrays) |
| SendGrid | `custom_args` on send | Top-level fields in event |
| Mailgun | `v:` prefixed variables | `event-data.user-variables` |

Always include your internal request/message ID as a tag. This is more reliable than looking up by provider message ID, because you have it before the send succeeds:

```typescript
await resend.emails.send({
  from: 'hello@example.com',
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<p>Hello</p>',
  tags: [{ name: 'request_id', value: internalRequestId }]
});
```

If the tag is missing from the webhook (some events strip metadata), fall back to looking up by provider message ID in your `send_attempts` table.

---

## Handling bounces and complaints from webhooks

When a bounce or complaint arrives, don't just log it. Take action:

### Hard bounces

Suppress the recipient immediately. Add them to a tenant-scoped suppression list. Never send to them again (until manually removed).

```typescript
if (eventType === 'bounced' && !isSoftBounce(rawPayload)) {
  await suppressionService.add({
    tenantId,
    email: recipientEmail,
    reason: 'hard_bounce',
    source: 'webhook',
    sourceEventId: providerEventId,
  });
}
```

### Soft bounces

Don't suppress on the first soft bounce. Track them and suppress after repeated failures (3+ in 30 days is a common threshold). Between failures, retry with increasing delays: 1 hour, 4 hours, 24 hours.

```typescript
const recentBounces = await countRecentSoftBounces(tenantId, email, 30); // last 30 days

if (recentBounces >= 3) {
  // Suppress with an expiry (e.g., 90 days) so they can be retried later
  await suppressionService.add({
    tenantId,
    email,
    reason: 'soft_bounce',
    expiresAt: addDays(new Date(), 90),
  });
} else {
  // Re-enqueue with delay
  const delays = [1 * 3600_000, 4 * 3600_000, 24 * 3600_000];
  const delay = delays[Math.min(recentBounces, delays.length - 1)];
  await sendQueue.add(retryJob, { delay });
}
```

### Complaints

Suppress immediately, no threshold. A single spam complaint is a strong negative signal. Complaints hurt your sender reputation far more than bounces.

### Classifying bounce types

Providers report soft vs. hard bounces differently:

| Provider | Hard bounce indicator | Soft bounce indicator |
|----------|----------------------|----------------------|
| SES | `bounce.bounceType = "Permanent"` | `bounce.bounceType = "Transient"` |
| Postmark | `Type = "HardBounce"` or `TypeCode` not in 4000-4099 | `Type = "Transient"` or `TypeCode` 4000-4099 |
| SendGrid | `type = "bounce"` | `type = "deferred"` or `type = "blocked"` |
| Mailgun | `severity = "permanent"` | `severity = "temporary"` |
| Resend | No explicit type field | No explicit type field |

When a provider doesn't indicate bounce type, **default to hard bounce**. It's safer for your reputation to over-suppress than to keep sending to invalid addresses.

---

## Webhook security checklist

Signature verification alone isn't enough. Layer these protections:

1. **HTTPS only.** Never expose webhook endpoints over plain HTTP. Payloads contain email addresses and delivery metadata.

2. **Verify signatures.** Every request. No exceptions. No "skip in development" flags that leak to production.

3. **Validate timestamps.** Most signed webhooks include a timestamp. Reject events older than 5-10 minutes to prevent replay attacks.

   ```typescript
   const timestamp = parseInt(headers['svix-timestamp'], 10);
   const now = Math.floor(Date.now() / 1000);
   if (Math.abs(now - timestamp) > 300) { // 5 minutes
     return res.status(400).json({ error: 'timestamp_expired' });
   }
   ```

4. **IP allowlisting (optional but recommended).** Some providers publish their webhook source IP ranges. Add them to your firewall or load balancer rules as a defense-in-depth measure. Don't rely on this alone - IPs change.

5. **Rate limiting.** Even authenticated webhook endpoints should have rate limits to prevent abuse if a secret is compromised.

6. **Don't leak secrets in logs.** Log the event type and provider event ID, not the raw payload (which contains email addresses) or signature headers (which contain secret-derived values).

7. **Rotate secrets periodically.** Most providers support having two active secrets during rotation. Verify against both during the transition window.

---

## Retry policies and failure handling

### What providers do when your endpoint fails

| Provider | Retry duration | Retry strategy | Max attempts |
|----------|---------------|----------------|-------------|
| Resend (Svix) | ~48 hours | Exponential backoff | ~19 attempts |
| Postmark | 72 hours | Exponential backoff | Multiple |
| SES (SNS) | Up to 23 days | Exponential backoff | Provider-managed |
| SendGrid | 72 hours | Exponential backoff | Multiple |
| Mailgun | 24 hours | Exponential backoff | 3 attempts |

### What happens when retries are exhausted

The event is lost. If your endpoint was down for an extended period, you'll have gaps in your delivery data. To handle this:

1. **Monitor webhook endpoint health.** Alert when your endpoint starts returning errors.
2. **Use provider APIs to backfill.** Most providers offer event APIs (e.g., SendGrid's Event API, Postmark's Message Streams API, SES's event publishing to S3) to query historical events. Build a reconciliation job that runs periodically.
3. **Track last-received timestamps per provider.** If the gap is too large, trigger a backfill.

### Your own outbound webhook retries

If you're forwarding events to your customers' webhook endpoints (fan-out), implement your own retry logic:

- 5 attempts with exponential backoff (e.g., 10s, 30s, 90s, 270s, 810s)
- Store each delivery attempt's HTTP status and response body for debugging
- Sign your outbound webhooks with HMAC-SHA256 using a per-endpoint secret
- Include standard headers: event type, delivery ID, signature
- Timeout after 5 seconds per attempt - don't let a slow consumer block your worker
- After all retries fail, mark the delivery as failed and surface it in a dashboard

```typescript
// Outbound webhook delivery headers
{
  'Content-Type': 'application/json',
  'X-Webhook-Signature': `sha256=${hmacHex}`,
  'X-Webhook-Event': eventType,
  'X-Webhook-Delivery': deliveryId,
}
```

---

## Common mistakes

### 1. Processing webhooks synchronously

Doing database writes, API calls, or business logic inside the webhook handler before returning 200. The provider times out, retries, and you process the event multiple times.

**Fix:** Verify signature, enqueue, return 200. Do everything else in a background worker.

### 2. Verifying signature against parsed-then-re-stringified JSON

Parsing the body as JSON, then calling `JSON.stringify(body)` to verify the signature. JSON serialization doesn't preserve key order or whitespace, so the signature never matches.

**Fix:** Capture the raw request body buffer before any parsing. Verify against that.

### 3. No deduplication

Assuming each event arrives exactly once. Providers retry on timeouts, network errors, and sometimes just because. Without deduplication, you double-suppress recipients, double-count metrics, or send duplicate notifications.

**Fix:** Store processed event IDs. Check before processing. Use the provider's event ID, not your own generated ID.

### 4. Treating all bounces the same

Suppressing on the first soft bounce, or (worse) ignoring bounces entirely. Soft bounces are temporary - mailbox full, server temporarily unavailable. Hard bounces are permanent - address doesn't exist.

**Fix:** Classify bounces using provider-specific fields. Suppress hard bounces immediately. Track soft bounces and suppress only after repeated failures.

### 5. Not linking events back to messages

Receiving bounce events but not knowing which of your messages bounced, because you didn't include your internal message ID as metadata on the original send.

**Fix:** Always attach your internal request/message ID as a tag or metadata field when sending. Map it back when the webhook arrives.

### 6. Ignoring event ordering

A "bounced" event arrives, then a "delivered" event arrives (out of order). You update the status to "delivered" and keep sending to a bounced address.

**Fix:** Implement a status order that only advances forward. Terminal states (bounced, complained) should never be overwritten.

### 7. Exposing webhook endpoints without signature verification

"We'll add it later." Someone discovers your endpoint URL and starts POSTing fake bounce events, suppressing legitimate recipients.

**Fix:** Verify signatures from day one. It's a few lines of code per provider. There is no valid reason to skip it.

### 8. Using the same endpoint URL for all providers

When something breaks, you can't tell which provider's events are failing. Monitoring, logging, and error handling all become harder.

**Fix:** Use separate paths per provider: `/webhooks/resend`, `/webhooks/postmark`, `/webhooks/ses`. Route to the correct adapter based on the path.

---

## Monitoring webhook processing

Track these metrics to catch problems early:

- **Events received per provider per minute** - sudden drops mean the provider stopped sending or your endpoint is failing
- **Signature verification failure rate** - spikes indicate misconfigured secrets or attack attempts
- **Deduplication rate** - consistently high dedup rates suggest your endpoint is slow and triggering retries
- **Processing latency** (queue time + worker time) - growing lag means your workers can't keep up
- **Event type distribution** - sudden spike in bounces or complaints needs immediate investigation
- **Unlinked events** - events that arrive but can't be mapped to a known message (missing request ID)

---

## References

- [Svix webhook verification docs](https://docs.svix.com/receiving/verifying-payloads/how-manual) - used by Resend
- [Resend webhook verification](https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests)
- [Postmark webhook overview](https://postmarkapp.com/developer/webhooks/webhooks-overview)
- [Postmark bounce webhook](https://postmarkapp.com/developer/webhooks/bounce-webhook)
- [AWS SES SNS notification contents](https://docs.aws.amazon.com/ses/latest/dg/notification-contents.html)
- [SendGrid Event Webhook reference](https://docs.sendgrid.com/for-developers/tracking-events/event)
- [SendGrid webhook signature verification](https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/getting-started-event-webhook-security-features)
- [Mailgun webhook security](https://documentation.mailgun.com/docs/mailgun/user-manual/webhooks/securing-webhooks)
- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) - requirement level keywords
- [M3AAWG Best Practices for Managing Bounces](https://www.m3aawg.org/sites/default/files/m3aawg_managing-bounces-2020-07.pdf)
