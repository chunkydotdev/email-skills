<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Simulate Before Sending

Dry-run a send without persisting or sending anything:

```
POST /v1/agent/simulate-send
```

```json
{
  "tenantId": "your-tenant-id",
  "recipientEmail": "alice@example.com",
  "templateId": "onboarding-welcome",
  "dedupeKey": "test-dry-run",
  "mailboxId": "mbx_abc123",
  "payload": { "name": "Alice" }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `tenantId` | yes | Tenant identifier |
| `recipientEmail` | yes | Recipient email |
| `templateId` | yes | Template slug or ID to check against |
| `dedupeKey` | no | Deduplication key (checks duplicate policy) |
| `mailboxId` | no | Mailbox to resolve sender from |
| `payload` | no | Template variables (passed to policy engine for validation) |

Response (includes full policy debug info):
```json
{
  "wouldAllow": true,
  "simulation": true,
  "resolvedFromAddress": "support@yourco.com",
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

> Note: Rate limit checks in simulation use non-blocking peek. There is a
> small TOCTOU window between simulation and actual send.

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
  "tenantId": "your-tenant-id",
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
  "results": [
    { "recipientEmail": "alice@example.com", "wouldAllow": true },
    { "recipientEmail": "bob@example.com", "wouldAllow": false, "reason": "dnc" }
  ]
}
```

---
