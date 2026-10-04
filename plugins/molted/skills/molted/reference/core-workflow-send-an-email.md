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
  "tenantId": "your-tenant-id",
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

**Important:** Blocked sends return HTTP 200 with `status: "blocked"`.
Always check `status` in the response body, not just the HTTP code.

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `tenantId` | yes | Your tenant identifier |
| `recipientEmail` | yes | Recipient email address |
| `templateId` | yes | Template slug (e.g. `welcome`) or template ID. An id starting with `_` (e.g. `_default`, `_followup`) paired with inline `payload.html`/`payload.text` is only the policy bucket (cooldown/dedupe grouping) -- it is never looked up as a stored template, and your inline content is what gets sent. An id without a leading `_` is always resolved as a stored template, even alongside inline `html`/`text`. |
| `dedupeKey` | yes | Idempotency key — same key = same send, never duplicated. Must be a non-empty, non-whitespace string (e.g. `"workflow-contactId-step"`). Empty strings are rejected with `400 dedupe_key_required`. |
| `payload` | yes | Template variables (object) |
| `sendReason` | no | Human-readable context for audit trail |
| `idempotencyKey` | no | Alias for `dedupeKey` |
| `mailboxId` | no | Mailbox to send from. When provided, the send is automatically projected into a thread for that contact — replies from the recipient are linked to the same thread. Use `GET /v1/agent/threads` to track the conversation. Recommended. |
| `threadId` | no | Explicit existing thread to project the send into, instead of matching one by `(mailboxId, recipientEmail)`. Must belong to your tenant, and its mailbox (if it has one) must be within your key's scope — a thread outside your tenant or mailbox scope returns `403 mailbox_scope_denied`. |
| `attachments` | no | Array of attachment refs: `[{ "id": "uuid", "filename": "report.pdf", "contentType": "application/pdf" }]`. Upload first via `POST /v1/attachments`. |
| `scheduledAt` | no | ISO 8601 timestamp to defer the send to a specific future time (e.g. `"2026-03-24T09:00:00Z"`). Must be in the future. When set, the send is enqueued with a delay and returns `status: "scheduled"`. |

### Policy Rules Evaluated

Every send is checked against these rules (in order). If any fails, the send is blocked:

| Rule | Block Reason | Description |
|------|-------------|-------------|
| Tenant paused | `tenant_paused` | Emergency pause is active |
| Trial not activated | `trial_not_activated` | Trial plan not activated for sending |
| Subscription expired | `subscription_expired` | Subscription has expired |
| Template not approved | `template_not_approved` | Template requires approval and hasn't been approved |
| Template lint failed | `template_lint_failed` | Template has validation errors |
| Template not found | `template_not_found` | Specified `templateId` does not exist |
| Template render failed | `template_render_failed` | Template exists but rendering failed (e.g. missing required variable) |
| Suppression list | `suppressed` | Recipient is on a suppression list (hard bounce, complaint, legal request, role account, or manual do-not-contact -- see the suppression's own `reasonCode` for which) |
| No consent | `no_consent` | Only checked when the tenant setting `requireConsentForMarketing` is on (default off, see Tenant Settings above): a MARKETING template to a recipient with no active consent record (the latest record for that recipient with no `revokedAt` -- a future `revokedAt` still counts as withdrawn now). Transactional templates, `_default`, and `_`-bucket inline sends are always exempt. A list broadcast (`POST /v1/agent/lists/:id/send`) and a double opt-in confirmation email are also always exempt: the list subscription itself is the consent. |
| Disengaged | `disengaged` | Recipient is marked as disengaged |
| Active opportunity | `active_opportunity` | Contact has an active sales deal (demo, proposal, negotiation, contract) |
| Duplicate | `duplicate` | Same `dedupeKey` was already used |
| Cooldown | `cooldown` | Same template sent to same recipient within 10 minutes |
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
