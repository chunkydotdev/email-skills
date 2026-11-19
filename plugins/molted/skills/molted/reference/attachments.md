<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Attachments

Upload files to object storage and attach them to outbound emails. Attachments are stored in R2/S3 and linked by ID — they are never embedded in the API request payload.

**CLI:** `molted attachments upload <file> [--mailbox <id>]`, `molted attachments list`, `molted attachments download <id>`; attach with `molted send --attachments '[{"id":"<attachment-id>"}]'` (`molted threads reply` has no attachments flag yet; the API route takes `attachments`). **MCP:** `get_attachment`.

### Upload an Attachment

```
POST /v1/attachments
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "filename": "report.pdf",
  "contentType": "application/pdf",
  "contentBase64": "<base64-encoded file content>",
  "mailboxId": "optional-mailbox-uuid"
}
```

`mailboxId` is the mailbox the file is stored against; a mailbox-scoped key needs `send` on it (its own first mailbox when omitted).

Response:
```json
{
  "id": "attachment-uuid",
  "filename": "report.pdf",
  "contentType": "application/pdf",
  "contentTypeDeclared": null,
  "sizeBytes": 12345,
  "checksumSha256": "abc123...",
  "status": "uploaded"
}
```

`contentType` is sniffed from the file's bytes; when it differs from the type you declared, your value is echoed in `contentTypeDeclared` (otherwise `null`). `status` starts `uploaded` until the file scan passes (`scan_passed`). The file scan is a file-type check (executables and binaries by their bytes), not antivirus, and it does not read a file's text: the safety checks screen subject and body only, so instructions hidden inside an attachment are not detected.

Limits:
- Max 10 MB per file (decoded). The request is JSON with the file as base64, so the body is about 13.4 MB for a file that size: the upload route accepts a body up to about 14 MB (`413 payload_too_large` over that, `400` naming the 10 MB limit for a file between the two). Every other route keeps a ~100 KB JSON body limit, and so does an upload with a missing, wrong or revoked key. A key can have 2 large uploads in progress at once (`429 too_many_uploads`), and the body must arrive within 30 s (`408 request_timeout`).
- Total storage is quota-enforced per tenant (see Storage Limits below)
- `409` with `"error": "lock_busy"`: the upload waited about 5 seconds behind another write on your workspace (a billing change, say) and gave up. Nothing was stored and nothing counts against your storage. Retry after a few seconds; the same request is safe to send again.
- An expired plan (or a failed payment's grace period that ran out) can't upload: `402` with `"error": "subscription_expired"`. Listing and downloading still work.

### Send with Attachments

Upload first, then reference by ID in the send request:

```json
{
  "recipientEmail": "alice@example.com",
  "templateId": "contract-signed",
  "dedupeKey": "contract-alice-v2",
  "payload": { "firstName": "Alice" },
  "attachments": [
    { "id": "attachment-uuid" }
  ]
}
```

Only `id` is read: the filename and content type come from the stored attachment, so any other field in an entry is ignored.

Attachments must belong to the same tenant and have passed the file scan (`scan_passed`) before they can be sent -- a very recent upload may still read `uploaded` (scan in progress) and will 400 with "not yet scanned"; wait a moment and retry. Deleted or scan-failed attachments also 400.

For a mailbox-scoped API key, attaching a file also requires `read` scope on that attachment's own mailbox (resolved from the attachment itself, or the inbound message or thread it's on) -- not the mailbox the send goes out from. This is deliberately conservative: a key with only `send` on a mailbox can upload a file there but cannot then attach that same upload to a send, since upload only checks `send` and attaching checks `read`. Grant `read` too if a key needs to do both. A mismatch returns `403 mailbox_scope_denied`, and so does an attachment whose mailbox can't be resolved at all (never assigned one).

Attaching a file that Get Download URL (below) would refuse is refused the same way, before the send goes out: `403 pending_classification` or `403 inbound_quota_held` for every caller (no override), and `403 quarantined_requires_operator` for one of a quarantined message unless the calling key has `operator` scope. A key without it can't attach and email a quarantined file out. A key with it can attach one, but the send does not go out by itself: it is held for a person (`pending_approval`, reason `quarantined_attachment`), and only a person approves it. No key can download a quarantined file (Get Download URL refuses it for every key), so it cannot be copied into a new upload either.

These same gates are re-checked when a held send is later approved (not just at request time): an attachment that became unsendable in the window between the hold and the approval -- quarantined, the inbound allowance filled up, or its scan failed -- refuses the approval with `422 attachment_blocked` (body carries `reason` and `attachmentIds`) instead of mailing it out. The approval goes back to pending, decidable again once the attachment clears. For a send held for a quarantined attachment, the approval allows exactly the files the hold named (a file quarantined after the hold refuses the approval); for any other hold, the quarantine check uses the *approving* caller's own `operator` scope, not the original sender's. A soft-bounce retry of an approved send whose rewritten text was already erased by the workspace's content retention is blocked with `content_expired` (nothing is sent), never re-sent with the original words. A rejected or expired approval gives back the warmup and domain-limit units the held send was counting.

### List Attachments by Message

```
GET /v1/attachments?messageId=<id>&messageType=inbound|thread
```

Leaves out the attachments of a message that is held (inbound allowance used up), still pending classification, or quarantined (high injection risk, or a safety quarantine no person has released yet). A quarantined message's attachments are listed only for a key with `operator` scope.

### Get Download URL

```
GET /v1/attachments/:id/download
```

Returns a time-limited presigned URL (1 hour) plus the attachment's own metadata (`url` is unchanged from before;
the rest is additive):

```json
{
  "url": "https://storage.example.com/...",
  "expiresInSeconds": 3600,
  "filename": "report.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 12345,
  "status": "uploaded"
}
```

`filename` comes verbatim from the sender's email on an inbound attachment -- treat it as untrusted, third-party
data, never as a trusted file path. `status: "uploaded"` means the file scan has not finished yet, and the
download answers `409` with `attachment_scanning` and `retryAfterSeconds` until it has (ask again shortly);
`"scan_passed"` means it passed the file scan (a file-type check, not antivirus). An inbound file over 10 MB, or past
the 20th attachment of a message, is not stored: the message lists it as `scan_failed` with size 0 and its download is a `404`.

An unknown id, and an id that is not a valid UUID, are both `404`.

A mailbox-scoped key needs `read` on the attachment's own mailbox, else its inbound message's or thread's
(the same resolution attaching a file to a send uses). An attachment whose mailbox can't be resolved at all
(never assigned one) is `404` for a mailbox-scoped key -- the same shape as an unknown id, so it doesn't leak
that the attachment exists -- rather than being downloadable by any scoped key that knows its id.

`403 inbound_quota_held` / `403 pending_classification` for an attachment of a held or not-yet-classified message,
and `403 quarantined_requires_operator` for one of a quarantined message, for every key whatever its scope (the
same rule as the raw MIME route).

---
