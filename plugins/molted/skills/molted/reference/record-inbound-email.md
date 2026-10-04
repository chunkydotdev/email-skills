<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Record Inbound Email

Manually record an inbound email for classification and routing:

```
POST /v1/agent/record-inbound
```

```json
{
  "tenantId": "your-tenant-id",
  "fromEmail": "alice@example.com",
  "toEmail": "support@yourco.com",
  "subject": "Re: Welcome to Acme",
  "bodyText": "Thanks, I would love a demo!",
  "bodyHtml": "<p>Thanks, I would love a demo!</p>",
  "inReplyTo": "<msg-id@provider.com>",
  "providerMessageId": "provider-msg-123",
  "mailboxId": "mbx_abc123"
}
```

Response:
```json
{
  "messageId": "msg_abc123",
  "threadId": "thd_abc123",
  "isNewThread": true,
  "linkedRequestId": "req_xyz789",
  "classificationJobId": "job_456"
}
```

The response includes the `threadId` for the created or matched thread. Use this ID with `threads reply` to respond to the inbound email.

If `mailboxId` is omitted, the system auto-resolves it by matching `toEmail` against active mailbox addresses.

| Field | Required | Description |
|-------|----------|-------------|
| `tenantId` | yes | Your tenant identifier |
| `fromEmail` | yes | Sender's email address |
| `toEmail` | yes | Recipient email (your domain) |
| `subject` | no | Email subject line |
| `bodyText` | no | Plain-text body |
| `bodyHtml` | no | HTML body |
| `inReplyTo` | no | Message-ID header for thread linking |
| `referencesHeader` | no | References header for thread linking |
| `providerMessageId` | no | Provider's message identifier |
| `mailboxId` | no | Mailbox that received this email. Auto-resolved from `toEmail` if not provided. |
| `threadId` | no | Explicit thread ID to link to an existing thread |

After recording, the email is automatically queued for intent classification and routing.

---
