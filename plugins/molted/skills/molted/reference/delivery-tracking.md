<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Delivery Tracking

### Decision Trace

Get the full send lifecycle for a request — policy decision, delivery events, and audit trail:

```
GET /v1/ops/trace/req_abc123?tenantId=your-tenant-id
```

Response:
```json
{
  "request": {
    "id": "req_abc123",
    "recipientEmail": "alice@example.com",
    "templateId": "onboarding-welcome",
    "status": "sent",
    "deliveryStatus": "delivered",
    "createdAt": "2026-02-25T10:00:00Z"
  },
  "policyDecision": {
    "allow": true,
    "auditEvents": [...]
  },
  "deliveryEvents": [
    { "eventType": "queued", "occurredAt": "2026-02-25T10:00:01Z" },
    { "eventType": "accepted", "occurredAt": "2026-02-25T10:00:02Z" },
    { "eventType": "delivered", "occurredAt": "2026-02-25T10:00:05Z" }
  ]
}
```

### Delivery Event Timeline

```
GET /v1/dashboard/request/req_abc123/timeline?tenantId=your-tenant-id
```

Returns delivery events in chronological order for a single request.

### Message Lifecycle Events

```
GET /v1/agent/messages/req_abc123/events?tenantId=your-tenant-id
```

Returns all lifecycle events for a message (send request) in chronological order. Events include sent, delivered, opened, clicked, bounced, complained, and failed.

Response:
```json
{
  "events": [
    {
      "id": "evt_1",
      "message_id": "req_abc123",
      "tenant_id": "your-tenant-id",
      "event_type": "sent",
      "payload": { "provider_name": "resend", "occurred_at": "2026-03-23T10:00:00Z" },
      "created_at": "2026-03-23T10:00:00Z"
    },
    {
      "id": "evt_2",
      "message_id": "req_abc123",
      "tenant_id": "your-tenant-id",
      "event_type": "delivered",
      "payload": { "provider_name": "resend", "occurred_at": "2026-03-23T10:00:05Z" },
      "created_at": "2026-03-23T10:00:05Z"
    }
  ]
}
```

### Delivery Status Values

| Status | Terminal? | Description |
|--------|-----------|-------------|
| `queued` | no | Job enqueued for delivery |
| `accepted` | no | Provider accepted the message |
| `sent` | no | Handed to provider |
| `delivered` | yes | Delivery confirmed |
| `deferred` | no | Provider soft-deferral, will retry |
| `bounced` | yes | Hard or soft bounce |
| `complained` | yes | Spam complaint received |
| `failed` | yes | Terminal failure |

---
