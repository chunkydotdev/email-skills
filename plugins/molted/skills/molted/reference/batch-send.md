<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Batch Send

Send to up to 500 recipients with per-recipient policy evaluation:

```
POST /v1/agent/batch/request-send
```

```json
{
  "templateId": "product-update",
  "mailboxId": "mbx_abc123",
  "sends": [
    {
      "recipientEmail": "alice@example.com",
      "dedupeKey": "update-v2-alice",
      "payload": { "firstName": "Alice" }
    },
    {
      "recipientEmail": "bob@example.com",
      "dedupeKey": "update-v2-bob",
      "payload": { "firstName": "Bob" }
    }
  ]
}
```

Optional `replyTo` (one plain address) sets where replies go for every item; an item's own `replyTo` overrides it. See [Reply-To](#reply-to).

Response:
```json
{
  "batchId": "batch_xyz",
  "total": 2,
  "queued": 1,
  "blocked": 1,
  "scheduled": 0,
  "errors": 0,
  "results": [
    { "recipientEmail": "alice@example.com", "requestId": "req_1", "status": "queued" },
    { "recipientEmail": "bob@example.com", "requestId": "req_2", "status": "blocked", "reason": "duplicate" }
  ]
}
```

Each result's `status` is `queued`, `scheduled` (with `scheduledAt`), `pending_approval` (held for a human, with `reason`), `blocked` (with `reason`) or `error` (an entry that couldn't be processed, e.g. `recipient_email_required`, `dedupe_key_required`, `duplicate_in_batch`). The top-level counts cover `queued`, `blocked`, `scheduled` and `errors`; a held item is in `results` only.

Every batch route (`batch/request-send`, `batch/classify-intent`, `batch/next-best-action`, `simulate-batch`) takes at most 500 items. Above that the whole request is a `400` with `{ "error": "batch_too_large", "field", "max": 500, "received" }` and nothing is processed; split it into batches of 500 or fewer.

---
