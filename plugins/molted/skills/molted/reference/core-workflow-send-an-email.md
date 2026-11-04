<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Core Workflow: Send an Email

### 1. Request Send

```
POST /v1/agent/request-send
```

```json
{
  "recipientEmail": "alice@example.com",
  "templateId": "onboarding-welcome",
  "dedupeKey": "onboarding-alice-step1",
  "payload": { "firstName": "Alice", "trialDays": 14 },
  "sendReason": "onboarding sequence step 1",
  "mailboxId": "mbx_abc123"
}
```

**Success** (200):
```json
{
  "requestId": "req_abc123",
  "status": "queued",
  "policyTrace": {
    "decision": { "allow": true },
    "auditEvents": [...]
  }
}
```

**Blocked** (200 — not a 4xx):
```json
{
  "requestId": "req_abc123",
  "status": "blocked",
  "reason": "cooldown",
  "policyTrace": {
    "decision": { "allow": false, "reason": "cooldown" },
    "auditEvents": [...]
  }
}
```

**Scheduled** (200):
```json
{
  "requestId": "req_abc123",
  "status": "scheduled",
  "scheduledAt": "2026-03-24T09:00:00Z",
  "policyTrace": {
    "decision": { "allow": true },
    "auditEvents": [...]
  }
}
```

**Held for approval** (200): `"status": "pending_approval"`, with `reason` (`autonomy_level`, `thread_risk_flagged` or `content_check`) and a `message` saying why. It goes out when a human approves it.

A `dedupeKey` you already used answers `"status": "blocked"`, `"reason": "duplicate"`, `"duplicate": true` with the original `requestId`. Another agent's lease on the contact answers `"status": "blocked"`, `"reason": "lease_conflict"`, `"requestId": null` and `leaseHolder`. A thread a human has taken over is a `409`.

**Important:** Blocked sends return HTTP 200 with `status: "blocked"`.
Always check `status` in the response body, not just the HTTP code.

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `tenantId` | no | Only on `api.molted.email`, where it is required; the base URL fills it in from your key |
| `recipientEmail` | yes | Recipient email address |
| `templateId` | no (default `_default`) | Template slug (e.g. `welcome`) or template ID. An id starting with `_` (e.g. `_default`, `_followup`) paired with inline `payload.html`/`payload.text` is only the policy bucket (cooldown/dedupe grouping) -- it is never looked up as a stored template, and your inline content is what gets sent. An id without a leading `_` is always resolved as a stored template, even alongside inline `html`/`text`. |
| `dedupeKey` | yes (or `idempotencyKey`) | Idempotency key: same key = same send, never duplicated. Must be a non-empty, non-whitespace string (e.g. `"workflow-contactId-step"`). Missing or empty is rejected with `400 dedupe_key_required`. |
| `payload` | no | Template variables (object). With `_default` or another `_` template id, the inline content: `subject` plus `html` and/or `text` |
| `sendReason` | no | Human-readable context for audit trail |
| `idempotencyKey` | no | Alias for `dedupeKey` |
| `mailboxId` | no | Mailbox to send from. When provided, the send is automatically projected into a thread for that contact — replies from the recipient are linked to the same thread. Use `GET /v1/agent/threads` to track the conversation. Recommended. |
| `threadId` | no | Existing thread to send into: the queued, scheduled or held send shows up in that thread, whichever route you used. The send goes out from the thread's mailbox: leave `mailboxId` out, or pass that same mailbox (another one is `400 thread_mailbox_mismatch`). An unknown thread is `404`; a thread in a mailbox outside your key's scope is `403 mailbox_scope_denied`. Cooldown is skipped only when the recipient is the thread's contact (or the Reply-To its inbound mail resolves to) and they have written since your last message to them in the thread (one reply per message received); another recipient's thread id, or a thread with nothing new from them, doesn't lift it. |
| `attachments` | no | Array of attachment refs: `[{ "id": "uuid", "filename": "report.pdf", "contentType": "application/pdf" }]`. Upload first via `POST /v1/attachments`. |
| `scheduledAt` | no | ISO 8601 timestamp to defer the send to a specific future time (e.g. `"2026-03-24T09:00:00Z"`). Must be at least 60 seconds and at most 1 year ahead, and a string needs an explicit UTC offset or `Z` (`400` otherwise); impossible dates such as `2030-02-30` are refused. The value is stored and echoed as the normalized UTC instant. When set, the send is enqueued with a delay and returns `status: "scheduled"`. |
| `replyTo` | no | Where the recipient's replies go: one plain address (e.g. `"visitor@gmail.com"`). See [Reply-To](#reply-to) below. Omit it and replies come back to the sending mailbox. |
| `headers` | no | Threading headers for a reply you build yourself: only `In-Reply-To` and `References` are kept; every other header is dropped. A non-object is a `400` |
| `humanize`, `humanizeStyle`, `humanizePreviewId` | no | Per-send humanizer controls; see [Email Humanizer](#email-humanizer) and [Send Exactly What You Previewed](#send-exactly-what-you-previewed) |

Lease checks and attribution use the agent your API key is bound to (see `bindKey` under Register an agent), which wins over a header. Only a key with no bound agent needs `X-Agent-Id: <your agentId>` as a header (not in the body) on a direct call, and it is honoured only for an agent registered in your workspace that no API key is bound to. Any other value (an agent another key is bound to, an unknown id) is ignored: the send runs as no agent, so a lease held by anyone blocks it. Replies through the mailbox (`threads reply`, MCP `reply`) run as your key's own agent.

### Reply-To

By default a reply to your send goes to the mailbox it was sent from. Set `replyTo` when the reader should answer someone else: a website contact form sent to the site owner (the visitor's address as `replyTo`), a booking confirmation, or an introduction or hand-off to a person.

- **One plain address.** No display name (`Ada <ada@x.com>`), no list (`a@x.com, b@x.com`), no spaces or line breaks, at most 254 characters. Anything else is a `400` whose message names `replyTo`, and nothing is sent or stored.
- **Any domain.** The address does not have to be on your domain. The email is still sent from your mailbox (the From doesn't change), so SPF/DKIM/DMARC are unaffected. A mailbox-scoped key may set any `replyTo`: the scope decides which mailbox sends, not where replies go.
- **Audited, never held.** A `replyTo` that differs from the From address writes a `send.reply_to_external` audit event (the Reply-To's domain and whether it matches your sending domain, never the full address). It does not hold or block the send.
- **It sticks to the send.** A send held for approval, a scheduled send, a soft-bounce retry and a follow-up scheduled on it (`schedule-followup`) all keep it.
- **You can see it.** `GET /v1/agent/threads/:id` returns it as `replyTo` on the outbound message (`null` when none was set), and the portal's thread page shows it under the message ("Replies go to visitor@gmail.com").
- **Everywhere you send.** `replyTo` on `POST /v1/agent/request-send`, `POST /v1/agent/batch/request-send` (top level as the batch default, or per item in `sends[]` to override it), `POST /v1/agent/outbound/send`, `POST /v1/agent/outbound/reply` and `POST /v1/send/request` (which also takes `scheduledAt`; it refuses a `threadId` with `400 thread_id_unsupported`, so reply in a thread with `POST /v1/agent/request-send`). CLI: `--reply-to <address>` on `molted send`, `molted send batch` (and `"replyTo"` on a `--recipients` entry) and `molted threads reply`. MCP: `reply_to` on `send_email`, `reply` and `batch_send` (and on each `sends[]` item).

### Policy Rules Evaluated

Every send is checked against these rules (in order). If any fails, the send is blocked:

| Rule | Block Reason | Description |
|------|-------------|-------------|
| Tenant paused | `tenant_paused` | Emergency pause is active |
| Trial not activated | `trial_not_activated` | Trial plan not activated for sending |
| Subscription expired | `subscription_expired` | Subscription has expired |
| Free sending paused | `free_sends_paused` | Molted has paused sending for every Free-plan account (an operator stop during abuse on the shared infrastructure). Not about this send: retry later with a new `dedupeKey`. Paid plans are unaffected; journey steps and follow-ups wait and retry on their own |
| Template not approved | `template_not_approved` | Template requires approval and hasn't been approved |
| Template lint failed | `template_lint_failed` | Template has validation errors |
| Template not found | `template_not_found` | Specified `templateId` does not exist |
| Template render failed | `template_render_failed` | Template exists but rendering failed (e.g. missing required variable) |
| Suppression list | `suppressed` | Recipient is on a suppression list (hard bounce, complaint, legal request, role account, or manual do-not-contact -- see the suppression's own `reasonCode` for which) |
| No consent | `no_consent` | Only checked when the tenant setting `requireConsentForMarketing` is on (default off, see Tenant Settings above): a MARKETING template to a recipient with no active consent record (the latest record for that recipient with no `revokedAt` -- a future `revokedAt` still counts as withdrawn now). Transactional templates, `_default`, and `_`-bucket inline sends are always exempt. A list broadcast (`POST /v1/agent/lists/:id/send`) and a double opt-in confirmation email are also always exempt: the list subscription itself is the consent. |
| Disengaged | `disengaged` | Recipient is marked as disengaged |
| Active opportunity | `active_opportunity` | Contact has an active sales deal (demo, proposal, negotiation, contract) |
| Duplicate | `duplicate` | Same `dedupeKey` was already used |
| Cooldown | `cooldown` | Same template sent to same recipient from the same mailbox within 10 minutes (a reply to a message they sent you in the thread is exempt, once per message) |
| Hourly limit | `hourly_limit_exceeded` | Exceeded hourly send quota |
| Daily limit | `daily_limit_exceeded` | Exceeded daily send quota |
| Daily budget | `budget_exceeded` | Daily send quota exceeded |
| Monthly limit | `monthly_limit_exceeded` | Exceeded monthly send quota |
| Monthly budget | `monthly_budget_exceeded` | Monthly send quota exceeded |
| Overage cap | `overage_cap_exceeded` | Exceeded overage hard cap |
| Missing recipient email | `recipient_email_required` | Batch send entry had no `email`/`recipientEmail` — returned per-recipient in `results[]` so the rest of the batch still processes |
| Missing dedupe key | `dedupe_key_required` | Batch send entry had no `dedupeKey` (or it was empty/whitespace-only). Returned per-recipient in `results[]`. The CLI auto-generates a dedupeKey for batch entries that omit one; direct API callers must provide one explicitly. |
| Duplicate dedupeKey in batch | `duplicate_in_batch` | Two or more entries in the same batch shared a `dedupeKey`. The first occurrence is processed normally; subsequent ones are returned as `status: "error"` with this reason (and an empty `requestId`) so caller-side de-dup is unambiguous. |
| Negative signals | `negative_signal_budget_exceeded` | Too many bounces + complaints in 24h |
| Warmup limit | `warmup_limit` | Exceeded daily warmup limit (transactional sends / `deferOnWarmup: false`) |
| Warmup horizon exceeded | `warmup_horizon_exceeded` | Warmup defer horizon (30 days) cannot accommodate the send; response includes `projectedDate` |
| Domain throttled | `domain_throttled` | Exceeded per-recipient-domain hourly throttle |
| Sending-domain rate limit | `domain_minute_limit_exceeded`, `domain_hourly_limit_exceeded`, `domain_daily_limit_exceeded` | Exceeded a rate limit you set on the sending domain (`PATCH /v1/agent/domains/:id/rate-limits`) |
| Missing physical address | `missing_physical_address` | A marketing template send while the tenant has no physical (postal) address on file (CAN-SPAM); set `physicalAddress` in tenant settings |
| Lease conflict | `lease_conflict` | Another agent holds a lease on this contact |
| Canary violation | `canary_violation` | Canary token leaked in outbound payload |
| Mailbox not active | `mailbox_not_active` | Explicit mailbox is in provisioning/paused state |
| Mailbox paused | `mailbox_paused` | Mailbox auto-paused due to reputation threshold breach |
| Sender domain not verified | `sender_domain_not_verified` | The mailbox's domain is neither the shared domain nor verified for your account. Also enforced at send time for queued and approved sends |
| Autonomy level | `autonomy_level` | Mailbox autonomy level requires human approval for this send |
| Thread risk flagged | `thread_risk_flagged` | This is a reply (`threadId` set) on a thread whose inbound history was quarantined/rejected by the safety classifier, or scored high for prompt injection, so it's held for human approval instead of sent |
| Content check | `content_check` | The outbound content check flagged the rendered email (a phishing-like request for credentials, codes or payment, another person's data or text leaked from another thread, deceptive claims, or clear spam), so it's held for human approval. Only on accounts enrolled in the content-check preview, and only once holds are switched on for it; off by default |
| No verified domain | `no_verified_domain` | No verified domain available for sending |

---
