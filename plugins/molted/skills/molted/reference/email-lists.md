<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Email Lists

Manage subscription-based email lists for newsletters, announcements, and marketing campaigns.

### Create a List

```
POST /v1/agent/lists
```

```json
{
  "tenantId": "your-tenant-id",
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
GET /v1/agent/lists?tenantId=your-tenant-id&limit=50&offset=0
GET /v1/agent/lists/:id?tenantId=your-tenant-id
PATCH /v1/agent/lists/:id      -- update name, description, type, doubleOptIn, status
DELETE /v1/agent/lists/:id     -- archive (soft delete)
```

Response includes `subscriberCount` (denormalized count of active subscribers).

### List Statuses

| Status | Description |
|--------|-------------|
| `active` | Accepting subscriptions and sends |
| `paused` | Temporarily disabled |
| `archived` | Soft-deleted, hidden from list queries |

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
  "tenantId": "your-tenant-id",
  "email": "subscriber@example.com",
  "source": "api"
}
```

- If the list has `doubleOptIn: true`, subscription status starts as `pending`.
- If `doubleOptIn: false`, status goes straight to `active`.
- `source` is optional, defaults to `"api"`. Valid values: `api`, `import`, `form`, `manual`.
- If the contact doesn't exist, it is auto-created.

#### Unsubscribe a contact

```
POST /v1/agent/lists/:id/unsubscribe
```

```json
{
  "tenantId": "your-tenant-id",
  "email": "subscriber@example.com"
}
```

#### List subscribers

```
GET /v1/agent/lists/:id/subscribers?tenantId=your-tenant-id&limit=50&offset=0
```

Returns subscribers with contact details (email, name, subscription status, dates).

#### Bulk subscribe

```
POST /v1/agent/lists/:id/subscribers/bulk
```

```json
{
  "tenantId": "your-tenant-id",
  "emails": ["a@example.com", "b@example.com"],
  "source": "import"
}
```

Returns `{ "subscribed": 2, "pending": 0, "failed": 0 }`.

#### Send broadcast

```
POST /v1/agent/lists/:id/send
```

```json
{
  "tenantId": "your-tenant-id",
  "templateId": "template-uuid"
}
```

Queues a broadcast to all active subscribers. Returns the send record. Exempt from the `requireConsentForMarketing` consent gate regardless of the tenant setting -- an active list subscription (with the list's own opt-in and unsubscribe) is the consent for a send to that list, so no separate `consent_records` row is needed. A list's double opt-in confirmation email is exempt the same way.

#### List sends

```
GET /v1/agent/lists/:id/sends?tenantId=your-tenant-id
```

Returns send history with delivery metrics (same format as stats/sends).

---
