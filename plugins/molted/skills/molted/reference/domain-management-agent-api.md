<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Domain Management (Agent API)

Manage sending domains and set up DNS records via the agent API. All endpoints use Bearer token auth.

### Add a Domain

```
POST /v1/agent/domains
```

```json
{
  "tenantId": "your-tenant-id",
  "domain": "notifications.example.com"
}
```

Response:
```json
{
  "id": "dom_abc123",
  "domain": "notifications.example.com",
  "status": "pending",
  "dnsRecords": [
    { "type": "TXT", "name": "notifications.example.com", "value": "v=spf1 include:..." },
    { "type": "CNAME", "name": "resend._domainkey.notifications.example.com", "value": "..." },
    { "type": "TXT", "name": "_dmarc.notifications.example.com", "value": "v=DMARC1; p=none; ..." }
  ]
}
```

### List Domains

```
GET /v1/agent/domains?tenantId=your-tenant-id
```

### Get Domain Details

```
GET /v1/agent/domains/:domainId?tenantId=your-tenant-id
```

When the parent `status` is terminal (`failed` or `verified`), per-record `dnsRecords[*].status` values stuck at `pending` / `not_started` are reconciled to match the parent status, and the response includes `"dnsRecordsStale": true` so callers know the per-record statuses were inferred from the cached snapshot rather than read live from the provider. To force a live re-check, call `POST /v1/agent/domains/:id/verify`.

### Check One-Click DNS Setup (Domain Connect)

Check if the user's DNS provider supports one-click setup via the [Domain Connect](https://www.domainconnect.org/) protocol. If supported, returns a redirect URL the user can click to automatically configure all DNS records — no manual copy-pasting required.

Supported providers include Cloudflare, Vercel, and other Domain Connect-compatible providers.

```
GET /v1/agent/domains/:domainId/domain-connect?tenantId=your-tenant-id
```

If supported:
```json
{
  "supported": true,
  "redirectUrl": "https://dash.cloudflare.com/cdn-cgi/access/domain-connect/v2/domainTemplates/..."
}
```

If not supported:
```json
{
  "supported": false,
  "reason": "DNS provider does not support Domain Connect"
}
```

**Recommended flow:** If `supported` is `true`, send the `redirectUrl` to the user so they can approve DNS changes with a single click. After they approve, call the verify endpoint. If `supported` is `false`, share the DNS records from the domain details and guide the user through manual setup.

### Verify Domain

After the user has configured DNS records (via Domain Connect or manually), trigger verification:

```
POST /v1/agent/domains/:domainId/verify
```

```json
{
  "tenantId": "your-tenant-id"
}
```

Once the response shows `"status": "verified"`, the domain is ready to send from.

### Remove Domain

```
DELETE /v1/agent/domains/:domainId?tenantId=your-tenant-id
```

### Get Domain Warmup Status

Check the warmup progress for a domain. New domains have daily send limits that gradually increase over ~28 days to build sender reputation.

```
GET /v1/agent/domains/:domainId/warmup?tenantId=your-tenant-id
Authorization: Bearer <api-key>
```

Response:
```json
{
  "domainId": "dom_abc123",
  "domain": "notifications.example.com",
  "warmupActive": true,
  "skipped": false,
  "firstSendAt": "2026-03-10T12:00:00.000Z",
  "currentDay": 13,
  "dailyLimit": 500,
  "sendsToday": 142
}
```

Warmup schedule: day 0-6 → 100/day, day 7-13 → 500/day, day 14-27 → 2,000/day, day 28+ → 10,000/day. If `skipped` is `true`, warmup limits are bypassed.

#### Deferring over-limit sends (`deferOnWarmup`)

When a marketing send would exceed today's warmup cap, the API schedules it to the earliest future day that still has capacity instead of blocking, returning `status: 'scheduled'` with `reason: 'warmup_defer'` (`warmup_defer`). Transactional sends (template id starts with `_`, or `templates.type = 'transactional'`) are still hard-rejected with `warmup_limit` so they don't get silently delayed.

- Pass `deferOnWarmup: true` on `POST /v1/agent/request-send` to force deferral for any over-limit send.
- Pass `deferOnWarmup: false` to force hard-reject.
- Omit the flag to use the default: marketing defers, transactional blocks. `POST /v1/agent/batch/request-send` defaults every item to deferral.
- If the caller also passes `scheduledAt`, the explicit schedule wins and the send is still hard-rejected on over-limit (we don't auto-shift explicit schedules).

Deferred responses look like:
```json
{
  "requestId": "req_...",
  "status": "scheduled",
  "scheduledAt": "2026-04-18T09:00:00.000Z",
  "reason": "warmup_defer"
}
```

If the reservation would land more than 30 days out, the API returns a block instead:
```json
{
  "requestId": "req_...",
  "status": "blocked",
  "reason": "warmup_horizon_exceeded",
  "projectedDate": "2026-05-16"
}
```

Use `/v1/agent/simulate-send` or `/v1/agent/simulate-batch` to preview the projected slot before committing; they return `wouldDefer: true` and `scheduledFor: "YYYY-MM-DD"` for over-cap recipients.

### Skip Domain Warmup

Skip the warmup schedule for an established domain. This immediately removes daily send limits imposed by the warmup system.

```
POST /v1/agent/domains/:domainId/warmup/skip
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "tenantId": "your-tenant-id"
}
```

Response:
```json
{
  "domainId": "dom_abc123",
  "domain": "notifications.example.com",
  "warmupSkipped": true
}
```

### Get Domain Rate Limits

View the current rate limit configuration and usage for a specific domain. All fields are `null` if no custom limits have been set (the global tenant limits apply instead).

```
GET /v1/agent/domains/:domainId/rate-limits?tenantId=your-tenant-id
Authorization: Bearer mm_live_...
```

Response:
```json
{
  "maxPerMinute": 100,
  "maxPerHour": 1000,
  "maxPerDay": 10000,
  "perMinute": { "used": 12, "limit": 100, "remaining": 88 },
  "perHour": { "used": 340, "limit": 1000, "remaining": 660 },
  "perDay": { "used": 1200, "limit": 10000, "remaining": 8800 }
}
```

The top-level `maxPerMinute|maxPerHour|maxPerDay` fields mirror the configuration returned by `PATCH /rate-limits` so the same field name works whether you're configuring a limit or observing usage. The per-window object is `null` when no custom limit is configured for that window.

### Update Domain Rate Limits

Set per-domain sending rate limits. Pass `null` to remove a custom limit and fall back to the global tenant default. All fields are optional — only provided fields are updated.

```
PATCH /v1/agent/domains/:domainId/rate-limits
Authorization: Bearer mm_live_...
Content-Type: application/json

{
  "tenantId": "your-tenant-id",
  "maxPerMinute": 100,
  "maxPerHour": 1000,
  "maxPerDay": null
}
```

Response:
```json
{
  "id": "dom_abc123",
  "domain": "notifications.example.com",
  "maxPerMinute": 100,
  "maxPerHour": 1000,
  "maxPerDay": null
}
```

### Update Domain Tracking

Enable or disable open and click tracking for a domain. Both are **off by default**. All fields are optional — only provided fields are updated.

Tracking only becomes active once a tracking subdomain CNAME (e.g. `links.example.com`) is added to DNS and verified. When you enable tracking without specifying `trackingSubdomain`, it defaults to `links`. The refreshed `dnsRecords` in the response will include the new `Tracking` CNAME you need to add — verify it with `POST /v1/agent/domains/:domainId/verify`.

```
PATCH /v1/agent/domains/:domainId/tracking
Authorization: Bearer mm_live_...
Content-Type: application/json

{
  "tenantId": "your-tenant-id",
  "openTracking": true,
  "clickTracking": true,
  "trackingSubdomain": "links"
}
```

Response:
```json
{
  "id": "dom_abc123",
  "domain": "notifications.example.com",
  "status": "pending",
  "openTracking": true,
  "clickTracking": true,
  "trackingSubdomain": "links",
  "dnsRecords": [
    { "type": "CNAME", "name": "links.notifications.example.com", "value": "links1.resend-dns.com", "status": "not_started" }
  ]
}
```

Tracking can also be enabled at creation time by passing `openTracking`, `clickTracking`, and/or `trackingSubdomain` to `POST /v1/agent/domains`.

> **Note:** Click tracking rewrites every link in your emails to redirect through your tracking subdomain, which can affect deliverability — leave it off for purely transactional mail unless you need click metrics. A tracking subdomain can be changed but never removed once set, and Resend limits changes to once per 24 hours.

---
