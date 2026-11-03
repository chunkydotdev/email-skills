<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Simulate Before Sending

Dry-run a send without persisting or sending anything. The dry run runs the
real send's own checks, in the same order: template and compliance, billing,
quota, warmup, per-domain limits, policy, the sender, a thread or contact a
human has taken over, another agent's lease, and the approval gates. It
writes nothing (no send record, no quota or warmup counter, no unsubscribe
token), and answers what the real send would answer:

```
POST /v1/agent/simulate-send
```

```json
{
  "recipientEmail": "alice@example.com",
  "templateId": "onboarding-welcome",
  "dedupeKey": "test-dry-run",
  "mailboxId": "mbx_abc123",
  "payload": { "name": "Alice" }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `tenantId` | no | Only on `api.molted.email`, where it is required; the base URL fills it in from your key |
| `recipientEmail` | yes | Recipient email |
| `templateId` | yes | Template slug or ID to check against |
| `dedupeKey` | no | Deduplication key (checks duplicate policy) |
| `mailboxId` | no | Mailbox to send from (default: your key's mailbox, or the account's first) |
| `payload` | no | Template variables; the dry run renders the template with them, as the send would |
| `threadId` | no | The thread this send would reply in. A reply to the thread's own contact skips the cooldown when they wrote since your last message to them there; every reply is checked for thread risk and for a human take-over. It is checked from the thread's mailbox (another `mailboxId` is `400 thread_mailbox_mismatch`, as on the send). A mailbox-scoped key may only name a thread in its own mailboxes (403 otherwise) |

What the answer means:

| Field | Meaning |
|-------|---------|
| `wouldAllow: false` | The send would be blocked. `reason` is exactly what the real send would say (e.g. `hourly_limit_exceeded`, `domain_throttled`, `warmup_limit`, `mailbox_paused`, `thread_taken_over`, `lease_conflict`); `blockingReasons` lists every block found, in check order, so you can fix them all in one pass |
| `wouldRequireApproval: true` | Nothing blocks, but the send would wait for a human first (the real send answers `pending_approval`). `approvalReason` is `autonomy_level`, `thread_risk_flagged` or `content_check` |
| `wouldDefer: true` | The send would be scheduled for a later day to fit the domain warmup cap: `scheduledFor` (date) and `scheduledAt` (timestamp) |
| `rendered` | The `subject`, `html` and `text` the send would deliver. An unsubscribe link in it is a placeholder that never resolves (a warning says so): the real send puts in the recipient's own link. With no `payload` at all (a policy-only check), a stored template whose variables can't be filled is not rendered: warning `content_not_rendered`, not a block. `simulate-batch` never renders content and returns policy results only |

Response (includes full policy debug info):
```json
{
  "wouldAllow": true,
  "simulation": true,
  "wouldRequireApproval": false,
  "wouldDefer": false,
  "rendered": { "subject": "Welcome, Alice", "html": "<p>Hi Alice</p>", "text": null },
  "resolvedFromAddress": "support@yourco.com",
  "resolvedMailboxId": "mbx_abc123",
  "rateLimited": false,
  "policyContext": {
    "hasDuplicate": false,
    "isCooldownHit": false,
    "isSuppressed": false,
    "isDisengaged": false,
    "hasActiveOpportunity": false,
    "isTenantPaused": false,
    "templateApproved": true,
    "templateLintPassed": true,
    "isBillingBlocked": false,
    "billingPlan": "solo"
  }
}
```

Or if blocked:
```json
{
  "wouldAllow": false,
  "reason": "suppressed",
  "suppressionInfo": {
    "scope": "global",
    "reasonCode": "hard_bounce"
  },
  "simulation": true,
  "resolvedFromAddress": "support@yourco.com",
  "rateLimited": false,
  "policyContext": {
    "hasDuplicate": false,
    "isCooldownHit": false,
    "isSuppressed": true,
    "isTenantPaused": false,
    "templateApproved": true,
    "templateLintPassed": true
  }
}
```

> Note: the dry run only reads the counters the real send increments. There
> is a small window between the dry run and the actual send in which other
> sends (or changes) can change the answer.

**Content check preview (`contentCheck`).** On accounts enrolled in the
content-check preview, a simulation with content to judge (inline
`subject`/`text`/`html`, or a stored template rendered with `payload`) also
returns a `contentCheck` object: the model's typed answers about the rendered
email (`deceptive_or_unsupported_claims`, `phishing_like_request`,
`contains_other_persons_data`, a 1-5 `spamLikeness`, and a `contentType` of
`commercial`, `transactional` or `reply_in_thread`), plus `wouldHold`,
`holdReasons`, `holdEnabled`, `modelVersion` and, if the check timed out or
failed, `fallbackReason`. It never changes `wouldAllow`, and `contentType` is
informational only: the template type still decides unsubscribe and
physical-address handling. The field is absent on every other account.

```json
"contentCheck": {
  "questionSetVersion": "outbound-content@1",
  "modelVersion": "jev-1.13.0",
  "wouldHold": false,
  "holdReasons": [],
  "holdEnabled": false,
  "contentType": "transactional",
  "spamLikeness": 1,
  "answers": { "phishing_like_request": { "type": "noul", "probability": 0.02 } }
}
```

### Batch Simulate

```
POST /v1/agent/simulate-batch
```

```json
{
  "templateId": "onboarding-welcome",
  "recipientEmails": ["alice@example.com", "bob@example.com"]
}
```

Response:
```json
{
  "total": 2,
  "wouldAllow": 1,
  "wouldBlock": 1,
  "wouldDefer": 0,
  "results": [
    { "recipientEmail": "alice@example.com", "wouldAllow": true },
    { "recipientEmail": "bob@example.com", "wouldAllow": false, "reason": "suppressed" }
  ]
}
```

Each result can also carry `cooldownExpiresAt`, `wouldRequireApproval` with `approvalReason`, and `wouldDefer` with `scheduledFor` (the warmup cap is projected across the whole batch; past the 30-day horizon a recipient is `wouldAllow: false`, `reason: "warmup_horizon_exceeded"`).

---
