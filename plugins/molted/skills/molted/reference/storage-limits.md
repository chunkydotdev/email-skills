<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Storage Limits

Per-tenant storage quotas by plan:

| Plan | Storage Limit | Retention | Max Mailboxes | Custom Domains |
|------|--------------|-----------|---------------|----------------|
| Trial | 50 MB | 7 days | 3 | 0 before billing, 1 on a paid plan's trial |
| Free | 100 MB | 14 days | 3 | 0 |
| Solo | 3 GB | 30 days | 10 | 3 |
| Team | 10 GB | 90 days | 50 | 10 |
| Enterprise | Unlimited | 365 days | Unlimited | Unlimited |

Storage usage (body + attachments) is tracked separately and included in the billing status response:

```
GET /v1/billing/my-status
```

Response includes:
```json
{
  "storage": {
    "messageBodyBytes": 4096,
    "attachmentBytes": 102400,
    "totalBytes": 106496,
    "limitBytes": 1073741824,
    "retentionDays": 30
  },
  "mailboxes": {
    "used": 2,
    "limit": 3
  }
}
```

When the storage limit is reached, attachment uploads return a 403 error. Expired attachments are automatically cleaned up based on the retention window.

---
