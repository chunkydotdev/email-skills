<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Attachments

Upload files to object storage and attach them to outbound emails. Attachments are stored in R2/S3 and linked by ID — they are never embedded in the API request payload.

### Upload an Attachment

```
POST /v1/attachments
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "tenantId": "your-tenant-id",
  "filename": "report.pdf",
  "contentType": "application/pdf",
  "contentBase64": "<base64-encoded file content>"
}
```

Response:
```json
{
  "id": "att_uuid",
  "filename": "report.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 12345,
  "checksumSha256": "abc123..."
}
```

Limits:
- Max 10 MB per file (decoded)
- Total storage is quota-enforced per tenant (see Storage Limits below)
- An expired plan (or a failed payment's grace period that ran out) can't upload: `402` with `"error": "subscription_expired"`. Listing and downloading still work.

### Send with Attachments

Upload first, then reference by ID in the send request:

```json
{
  "tenantId": "your-tenant-id",
  "recipientEmail": "alice@example.com",
  "templateId": "contract-signed",
  "dedupeKey": "contract-alice-v2",
  "payload": { "firstName": "Alice" },
  "attachments": [
    { "id": "att_uuid", "filename": "contract.pdf", "contentType": "application/pdf" }
  ]
}
```

Attachments must belong to the same tenant and be in a usable state (`uploaded` or `scan_passed`). Deleted or failed attachments will return a 400 error.

### List Attachments by Message

```
GET /v1/attachments?tenantId=<id>&messageId=<id>&messageType=inbound|thread
```

Leaves out the attachments of a message that is held (inbound allowance used up), still pending classification, or quarantined for high injection risk. A quarantined message's attachments are listed only for a key with `operator` scope.

### Get Download URL

```
GET /v1/attachments/:id/download?tenantId=<id>
```

Returns a time-limited presigned URL (1 hour) for downloading the file. `403 inbound_quota_held` / `403 pending_classification` for an attachment of a held or not-yet-classified message, and `403 quarantined_requires_operator` for one of a quarantined message unless the key has `operator` scope (the same rule as the raw MIME route).

---
