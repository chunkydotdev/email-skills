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

**Address already unsubscribed from this list**: capture keeps it unsubscribed (does not reactivate it) and does not send the confirmation/notification email even if `subject` is set:
```json
{
  "contactId": "uuid",
  "listId": "uuid",
  "subscriptionStatus": "unsubscribed",
  "reason": "previously_unsubscribed",
  "emailStatus": null,
  "requestId": null
}
```

### Behavior

1. **Resolves the contact** the same way list subscribe/unsubscribe do: matched case/whitespace-insensitively, with `+alias`/Gmail-dot variants collapsing to one contact (whichever was seen first). Merges name, tags, and metadata onto that contact. The email is stored lowercased and trimmed.
2. **Resolves list** by slug. Auto-creates if not found (`type: newsletter`).
3. **Subscribes** contact (idempotent - skips if already subscribed; stays unsubscribed if it previously unsubscribed from this list -- see above).
4. **Sends email** via `_default` template if subject provided, unless the address stayed unsubscribed. Dedupe key: `capture:{list}:{email}`.
5. Returns combined result, including `reason` when the subscribe outcome needs explaining.

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
