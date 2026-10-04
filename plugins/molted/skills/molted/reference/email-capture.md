<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Email Capture

One-call contact collection: upsert contact, subscribe to list, and optionally send a confirmation email.

```
POST /v1/agent/capture
```

```json
{
  "tenantId": "your-tenant-id",
  "email": "user@example.com",
  "list": "waitlist",
  "subject": "You're on the waitlist!",
  "html": "<p>Thanks for signing up. We'll notify you when we launch.</p>",
  "text": "Thanks for signing up.",
  "name": "Jane Smith",
  "tags": ["early-access", "landing-page"],
  "doubleOptIn": true,
  "source": "form",
  "metadata": { "referrer": "producthunt" }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `email` | Yes | Recipient email address |
| `list` | Yes | List slug - subscribes contact to this list. Creates the list if it doesn't exist |
| `subject` | No | Confirmation email subject. If omitted, no email is sent (silent capture) |
| `html` | No | Email HTML body (required if subject is set) |
| `text` | No | Email plaintext body (fallback) |
| `name` | No | Contact display name |
| `tags` | No | Array of string tags stored in contact metadata |
| `doubleOptIn` | No | If true and list is new, subscription starts as `pending`. Existing lists use their own setting. Default: false |
| `source` | No | Attribution source: `form`, `api`, `import`, `manual`. Default: `api` |
| `metadata` | No | Arbitrary JSON merged into contact metadata |

**Success** (200):
```json
{
  "contactId": "uuid",
  "listId": "uuid",
  "subscriptionStatus": "active",
  "emailStatus": "queued",
  "requestId": "uuid"
}
```

**Silent capture** (no subject):
```json
{
  "contactId": "uuid",
  "listId": "uuid",
  "subscriptionStatus": "active",
  "emailStatus": null,
  "requestId": null
}
```

**Double opt-in**:
```json
{
  "contactId": "uuid",
  "listId": "uuid",
  "subscriptionStatus": "pending",
  "emailStatus": "queued",
  "requestId": "uuid"
}
```

### Behavior

1. **Upserts contact** by `(tenant_id, email)`. Merges name, tags, and metadata.
2. **Resolves list** by slug. Auto-creates if not found (`type: newsletter`).
3. **Subscribes** contact (idempotent - skips if already subscribed).
4. **Sends email** via `_default` template if subject provided. Dedupe key: `capture:{list}:{email}`.
5. Returns combined result.

### CLI

```bash
# Silent capture (no email)
molted capture --email user@example.com --list waitlist

# With confirmation email
molted capture --email user@example.com --list waitlist \
  --subject "Welcome!" --body "<p>Thanks!</p>"

# With tags and metadata
molted capture --email user@example.com --list waitlist \
  --tags early-access,landing-page \
  --metadata '{"referrer": "producthunt"}'
```

---
