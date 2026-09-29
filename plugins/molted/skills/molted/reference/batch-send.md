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
  "tenantId": "your-tenant-id",
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

Response:
```json
{
  "batchId": "batch_xyz",
  "total": 2,
  "queued": 1,
  "blocked": 1,
  "results": [
    { "recipientEmail": "alice@example.com", "requestId": "req_1", "status": "queued" },
    { "recipientEmail": "bob@example.com", "requestId": "req_2", "status": "blocked", "reason": "duplicate" }
  ]
}
```

Every batch route (`batch/request-send`, `batch/classify-intent`, `batch/next-best-action`, `simulate-batch`) takes at most 500 items. Above that the whole request is a `400` with `{ "error": "batch_too_large", "field", "max": 500, "received" }` and nothing is processed; split it into batches of 500 or fewer.

---
