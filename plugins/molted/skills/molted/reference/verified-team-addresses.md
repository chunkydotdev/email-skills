<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Verified Team Addresses

Sends to your own team are free on every plan, Free included (#1470): a send whose recipient is a **verified team address** doesn't count toward the monthly or daily send limits, the paid trial's total, or overage. It still goes through the hourly limit, dedupe, cooldown, suppression, consent and approvals like any other send, so an alert storm is still capped. This is how an agent emails its owner when something breaks.

A verified team address is either a workspace member's own verified email (always included) or a **notification address** you add here and someone confirms through the signed link emailed to it (valid 72 hours). An added but unconfirmed address counts like any other recipient. Caps (members' verified emails plus notification addresses, and addresses removed in the last 30 days): Free 3, Solo 10, Team 25. The cap also applies at send time: after a downgrade, members' emails stay free and only the oldest confirmed notification addresses that fit the new cap do. Confirmation emails are limited to 5 per workspace per day and 1 per address per hour (429 `confirmation_rate_limited`), and a workspace whose sends are blocked (no plan yet, expired) can't add addresses (403 `sends_blocked`). These endpoints need a key for the whole workspace (not limited to some mailboxes): a mailbox-scoped key gets 403 `mailbox_scope_denied`.

`GET /v1/agent/budget` reports `teamAddressSends: { used }` for the month.

### List Team Addresses

```
GET /v1/agent/notification-addresses?tenantId=your-tenant-id
Authorization: Bearer mm_live_...
```

Response:
```json
{
  "addresses": [
    { "id": null, "email": "owner@acme.com", "source": "member", "status": "confirmed", "confirmedAt": null, "confirmExpiresAt": null, "createdAt": null },
    { "id": "uuid", "email": "oncall@acme.com", "source": "notification", "status": "pending", "confirmedAt": null, "confirmExpiresAt": "2026-10-01T10:00:00Z", "createdAt": "2026-09-28T10:00:00Z" }
  ],
  "cap": 3,
  "used": 2
}
```

`status` is `confirmed`, `pending` (link sent, not used yet) or `expired` (add it again for a new link).

### Add a Notification Address

```
POST /v1/agent/notification-addresses
Authorization: Bearer mm_live_...
Content-Type: application/json

{ "tenantId": "your-tenant-id", "email": "oncall@acme.com" }
```

Response (201): the address with `status: "pending"` and `confirmationSent: true`. Adding a pending address again sends a fresh link; adding a confirmed address or a member's own verified email changes nothing. Over the cap: `403 { "error": "team_address_cap_reached", "cap": 3 }`.

### Remove a Notification Address

```
DELETE /v1/agent/notification-addresses/:id?tenantId=your-tenant-id
Authorization: Bearer mm_live_...
```

Response: `{ "deleted": true }` (404 when it doesn't exist).

---
