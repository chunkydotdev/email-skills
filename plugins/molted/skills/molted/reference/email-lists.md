<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Email Lists

Manage subscription-based email lists for newsletters, announcements, and marketing campaigns. For one-call lead capture (upsert the contact, subscribe, optionally confirm) see `POST /v1/agent/capture` (`molted capture`).

**CLI:** `molted lists create --name <n> [--type] [--double-opt-in] [--description] [--metadata]`, `molted lists list|get|update|archive`, `molted lists subscribe|unsubscribe <listId> --email <e>`, `molted lists subscribers <listId>`, `molted lists import <listId> --file <path.csv|.json>` (bulk subscribe in chunks of 500), `molted lists send <listId> --template <slug> [--payload] [--mailbox] --yes`, `molted lists sends <listId>`, `molted lists stats <listId> [--growth [--period]] [--sends]`. **MCP:** `create_list`, `list_lists`, `get_list`, `update_list`, `archive_list`, `subscribe_to_list`, `unsubscribe_from_list`, `list_subscribers`, `import_subscribers`, `send_to_list`, `list_sends`, `list_stats`.

### Create a List

```
POST /v1/agent/lists
```

```json
{
  "name": "Weekly Newsletter",
  "description": "Product updates and tips",
  "type": "newsletter",
  "doubleOptIn": false,
  "metadata": {}
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | yes | - | List display name |
| `description` | string | no | null | List description |
| `type` | string | no | `newsletter` | One of: `newsletter`, `announcement`, `marketing` |
| `doubleOptIn` | boolean | no | `false` | Require email confirmation before activating subscriptions |
| `defaultTemplateId` | string | no | null | Default template for sends |
| `metadata` | object | no | `{}` | Custom key-value metadata |

**Errors:**

| Status | Code | Meaning |
|---|---|---|
| 409 | `list_name_conflict` | A non-archived list with this `name` already exists for the tenant. The response body includes the conflicting `name`. |

### List / Get / Update / Archive Lists

```
GET /v1/agent/lists?limit=50&offset=0
GET /v1/agent/lists/:id
PATCH /v1/agent/lists/:id      -- update name, description, type, doubleOptIn, status
DELETE /v1/agent/lists/:id     -- archive (soft delete)
```

Response includes `subscriberCount` (denormalized count of active subscribers).

**Archiving has no undo.** A list a person archived from `/app/lists` (or that you archived yourself through `DELETE`) cannot be reactivated through `PATCH /v1/agent/lists/:id`: any `status` value other than `archived` on an already-archived list is refused with `409 { "error": "list_archived" }`. Create a new list instead.

**Errors (PATCH):**

| Status | Code | Meaning |
|---|---|---|
| 409 | `list_archived` | The list is archived. `status` can only stay `archived`; every other field in the same request is refused too, not just `status`. |

### List Statuses

| Status | Description |
|--------|-------------|
| `active` | Accepting subscriptions and sends |
| `paused` | Temporarily disabled |
| `archived` | Soft-deleted, hidden from list queries. Terminal: `PATCH .../:id` refuses to change `status` away from `archived` (409 `list_archived`) |

### List Analytics

#### Stats snapshot

```
GET /v1/agent/lists/:id/stats
```

Returns current subscriber counts and send summary:

```json
{
  "subscriberCount": 1250,
  "pendingCount": 23,
  "unsubscribedCount": 87,
  "totalSends": 14,
  "lastSentAt": "2026-03-20T10:00:00Z"
}
```

#### Subscriber growth over time

```
GET /v1/agent/lists/:id/stats/growth?period=30d
```

Returns daily subscribe/unsubscribe counts. Supported periods: `7d`, `30d`, `90d`, `all`.

```json
[
  { "date": "2026-03-01", "subscribed": 12, "unsubscribed": 2, "net": 10 },
  { "date": "2026-03-02", "subscribed": 8, "unsubscribed": 1, "net": 7 }
]
```

#### Send performance

```
GET /v1/agent/lists/:id/stats/sends
```

Returns per-send delivery metrics (most recent 50 sends):

```json
[
  {
    "sendId": "send-uuid",
    "sentAt": "2026-03-20T10:00:00Z",
    "subscriberCount": 1250,
    "status": "completed",
    "templateId": "tpl-uuid",
    "delivered": 1240,
    "bounced": 3,
    "opened": 820,
    "clicked": 145
  }
]
```

### Subscriber Management

#### Subscribe a contact

```
POST /v1/agent/lists/:id/subscribers
```

```json
{
  "email": "subscriber@example.com",
  "source": "api"
}
```

- If the list has `doubleOptIn: true`, subscription status starts as `pending`.
- If `doubleOptIn: false`, status goes straight to `active`.
- `source` is optional, defaults to `"api"`. Valid values: `api`, `import`, `form`, `manual`.
- The address is matched case/whitespace-insensitively, and `+alias`/Gmail-dot variants (e.g. `bob+news@x.com`, `b.o.b@gmail.com`) resolve to the same contact as `bob@x.com` -- whichever of those addresses was seen first. If the contact doesn't exist under any variant, it is auto-created and stored in one canonical form: the bare address (a display name like `Bob <bob@x.com>` is dropped), lowercased and trimmed, with the domain in ASCII (a Unicode or fullwidth domain converted, a trailing dot dropped).
- `gmail.com` and `googlemail.com` are one mailbox on a list. Subscribing `jane@googlemail.com` while `jane@gmail.com` is already `active` on the list adds no second subscription: the response is the existing active row (with the gmail.com contact's `contactId`). On a double opt-in list, the same while the other spelling is still `pending`: no second row and no second confirmation.
- **Once an address has unsubscribed from a list, subscribing it again through this endpoint never reactivates it** -- not even the exact same address, not after deleting and recreating the contact, and not as the other Gmail domain (`jane@googlemail.com` after `jane@gmail.com` unsubscribed, and the reverse; they stay separate contacts, the unsubscribe is copied onto the second one). The response is `{ "status": "unsubscribed", "reason": "previously_unsubscribed", ... }` instead of a normal `active`/`pending` row. The only way back onto a **double opt-in** list is the confirmation email (`GET /v1/lists/confirm`) -- resubscribing re-opens the row as `pending` and re-sends the confirmation (only once per still-pending state), but it still won't go `active` without a click-through. A non-double-opt-in list has no way back in through this endpoint at all once unsubscribed.

#### Unsubscribe a contact

```
POST /v1/agent/lists/:id/unsubscribe
```

```json
{
  "email": "subscriber@example.com"
}
```

Unsubscribes every `active` or `pending` subscription of that mailbox on the list: any spelling of the address (case, `+tag`, Gmail dots, display name) and the other Gmail domain (`jane@gmail.com` also unsubscribes `jane@googlemail.com`, and the reverse). The hosted unsubscribe link in a broadcast does the same.

#### List subscribers

```
GET /v1/agent/lists/:id/subscribers?limit=50&offset=0
```

Returns subscribers with contact details (email, name, subscription status, dates).

#### Bulk subscribe

```
POST /v1/agent/lists/:id/subscribers/bulk
```

```json
{
  "emails": ["a@example.com", "b@example.com"],
  "source": "import"
}
```

Returns `{ "subscribed": 2, "pending": 0, "skipped": 0, "failed": 0, "skippedReasons": {} }`. `skipped` counts addresses that were suppressed or had previously unsubscribed from this list (not reactivated); `skippedReasons` breaks that down, e.g. `{ "suppressed": 1, "previously_unsubscribed": 1 }`.

#### Send broadcast

```
POST /v1/agent/lists/:id/send
```

```json
{
  "templateId": "template-uuid"
}
```

Optional: `mailboxId` (the mailbox to send from) and `payload` (template variables for every copy).

Queues a broadcast to all active subscribers, one copy per mailbox: two active subscriptions of the same mailbox (`jane@gmail.com` and `jane@googlemail.com`, or a `+tag` or Gmail-dot variant) get one email, and `subscriberCount` on the send record counts mailboxes. Returns the send record. Exempt from the `requireConsentForMarketing` consent gate regardless of the tenant setting -- an active list subscription (with the list's own opt-in and unsubscribe) is the consent for a send to that list, so no separate `consent_records` row is needed. A list's double opt-in confirmation email is exempt the same way.

#### List sends

```
GET /v1/agent/lists/:id/sends
```

Returns send history with delivery metrics (same format as stats/sends).

---
