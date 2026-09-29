<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Alert Destinations

Configure where delivery alerts (bounces, complaints, anomalies) are sent. Supports webhook URLs and Slack incoming webhooks. All endpoints use Bearer token auth.

Alerts are evaluated on a schedule (about once a minute) for every tenant with at least one active destination -- you don't need to poll `GET /v1/agent/alerts/status` to trigger a notification, though doing so still notifies too if one hasn't gone out recently.

A destination is notified when the set of firing conditions *changes* (new condition, cleared condition, or a severity change), not on every evaluation; an unchanged firing state gets at most one reminder per day. This state is persisted per destination and survives restarts, so the schedule and any status check never double-send or double-suppress.

### Create an Alert Destination

```
POST /v1/agent/alerts/destinations
Authorization: Bearer mm_live_...
Content-Type: application/json

{
  "tenantId": "your-tenant-id",
  "type": "webhook",
  "url": "https://example.com/alerts"
}
```

`type` must be `"webhook"` or `"slack"`. The `url` must use `http` or `https`, and must not point at a private, loopback, link-local, or otherwise internal address (see "URL Requirements (SSRF Protection)" under Webhooks below -- the same rule applies here).

Response:
```json
{
  "id": "uuid",
  "tenant_id": "your-tenant-id",
  "type": "webhook",
  "url": "https://example.com/alerts",
  "is_active": true,
  "created_at": "2026-03-22T10:00:00Z"
}
```

### List Alert Destinations

```
GET /v1/agent/alerts/destinations?tenantId=your-tenant-id
Authorization: Bearer mm_live_...
```

Returns an array of all configured alert destinations for your tenant.

### Delete an Alert Destination

```
DELETE /v1/agent/alerts/destinations/:id?tenantId=your-tenant-id
Authorization: Bearer mm_live_...
```

Response:
```json
{ "deleted": true }
```

Returns 404 if the destination does not exist or does not belong to your tenant.

### Send a Test Alert

```
POST /v1/agent/alerts/destinations/:id/test?tenantId=your-tenant-id
Authorization: Bearer mm_live_...
```

Sends a clearly-labelled test alert to verify the destination is reachable. Bypasses the change-based notification logic (a test send never suppresses, or is suppressed by, a real alert), but is itself throttled to one per destination per 30 seconds; a request within that window gets a `429`.

Response:
```json
{
  "success": true,
  "responseCode": 200,
  "error": null,
  "deliveryId": "uuid"
}
```

### List Delivery Attempts

```
GET /v1/agent/alerts/destinations/:id/deliveries?tenantId=your-tenant-id
Authorization: Bearer mm_live_...
```

Returns recent delivery attempts (real and test) for that destination, newest first, each with `status` (`success` or `failure`), `responseCode`, `error`, and `createdAt`.

---
