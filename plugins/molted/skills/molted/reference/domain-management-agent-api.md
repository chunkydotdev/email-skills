<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Domain Management (Agent API)

Manage sending domains and set up DNS records via the agent API. All endpoints use Bearer token auth. Reads need only a valid key; add, verify, remove, skip warmup, rate limits and tracking need a key that reaches every mailbox with the `manage` scope (`403 mailbox_scope_denied` / `insufficient_scope` otherwise).

**CLI:** `molted domains add <domain> [--open-tracking] [--click-tracking] [--tracking-subdomain <name>]`, `molted domains list|get <id>|verify <id>|dns-check <id>|remove <id>`, `molted domains warmup <id>`, `molted domains warmup skip <id>`, `molted domains rate-limits <id>`, `molted domains rate-limits set <id> [--max-per-minute <n> | --no-max-per-minute] [...hour, ...day]`, `molted domains tracking <id> [--open|--no-open] [--click|--no-click] [--subdomain <name>]`. **MCP:** `list_domains` (read-only).

### Add a Domain

```
POST /v1/agent/domains
```

```json
{
  "domain": "notifications.example.com"
}
```

Response (abridged):
```json
{
  "id": "domain-uuid",
  "domain": "notifications.example.com",
  "status": "pending",
  "dnsRecords": [
    { "type": "MX", "name": "send.notifications.example.com", "value": "...", "priority": 10, "status": "not_started" },
    { "type": "TXT", "name": "resend._domainkey.notifications.example.com", "value": "...", "status": "not_started" }
  ],
  "openTracking": false,
  "clickTracking": false,
  "trackingSubdomain": null,
  "maxPerMinute": null,
  "maxPerHour": null,
  "maxPerDay": null,
  "dmarc": {
    "address": "...",
    "rua": "mailto:...",
    "record": { "type": "TXT", "name": "_dmarc.notifications.example.com", "value": "v=DMARC1; p=none; rua=mailto:..." }
  }
}
```

`dnsRecords` are the records the email provider asks for (shown as returned). `dmarc.record` is the optional DMARC record that routes aggregate reports to Molted (`p=none`, changes nothing about delivery). Errors: `400` for the shared sending domain or a subdomain of it, `409` when the domain already exists in your workspace or is not available to your account.

### List Domains

```
GET /v1/agent/domains
```

### Get Domain Details

```
GET /v1/agent/domains/:domainId
```

When the parent `status` is terminal (`failed` or `verified`), per-record `dnsRecords[*].status` values stuck at `pending` / `not_started` are reconciled to match the parent status, and the response includes `"dnsRecordsStale": true` so callers know the per-record statuses were inferred from the cached snapshot rather than read live from the provider. To force a live re-check, call `POST /v1/agent/domains/:id/verify`.

### Check One-Click DNS Setup (Domain Connect)

Check if the user's DNS provider supports one-click setup via the [Domain Connect](https://www.domainconnect.org/) protocol. If supported, returns a redirect URL the user can click to automatically configure all DNS records — no manual copy-pasting required.

Supported providers include Cloudflare, Vercel, and other Domain Connect-compatible providers.

```
GET /v1/agent/domains/:domainId/domain-connect
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

Other `reason` values: `Domain is already verified`, `Domain Connect is not configured`, `Could not fetch provider settings`, `Could not map DNS records to template variables`.

**Recommended flow:** If `supported` is `true`, send the `redirectUrl` to the user so they can approve DNS changes with a single click. After they approve, call the verify endpoint. If `supported` is `false`, share the DNS records from the domain details and guide the user through manual setup.

### Verify Domain

After the user has configured DNS records (via Domain Connect or manually), trigger verification:

```
POST /v1/agent/domains/:domainId/verify
Content-Type: application/json

{}
```

Once the response shows `"status": "verified"`, the domain is ready to send from.

### Remove Domain

```
DELETE /v1/agent/domains/:domainId
```

Response: `{ "deleted": true }`.

### Get Domain Warmup Status

Check the warmup progress for a domain. New domains have daily send limits that gradually increase over ~28 days to build sender reputation.

```
GET /v1/agent/domains/:domainId/warmup
Authorization: Bearer <api-key>
```

Response:
```json
{
  "domainId": "domain-uuid",
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

If the domain isn't verified yet (or is otherwise not usable as a sender), `warmupActive` is `false` and the response adds a `reason` field, e.g. `"reason": "domain_not_verified"` — there's no real warmup to report because no send can go out from the domain yet. Verify the domain first (`POST /v1/agent/domains/:domainId/verify`), then check warmup again.

#### Deferring over-limit sends (`deferOnWarmup`)

When a marketing send would exceed today's warmup cap, the API schedules it to the earliest future day that still has capacity instead of blocking, returning `status: 'scheduled'` with `reason: 'warmup_defer'` (`warmup_defer`). Transactional sends (template id starts with `_`, or `templates.type = 'transactional'`) are still hard-rejected with `warmup_limit` so they don't get silently delayed.

- The rule is fixed by the template type today: marketing defers, transactional blocks, on `POST /v1/agent/request-send` and on every item of `POST /v1/agent/batch/request-send`.
- `deferOnWarmup` (`true` to force deferral, `false` to force a hard reject) is accepted on `POST /v1/agent/request-send` but **not yet honoured** (#1300): any value is ignored and the default above applies.
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

Skip the warmup schedule for an established domain. This immediately removes daily send limits imposed by the warmup system, and can't be undone -- a loosening, gated per [Agents may tighten, never loosen](#agents-may-tighten-never-loosen) (`kind: "domain-warmup"`, `id`: the domain id).

```
POST /v1/agent/domains/:domainId/warmup/skip
Authorization: Bearer <api-key>
Content-Type: application/json

{}
```

Response:
```json
{
  "domainId": "domain-uuid",
  "domain": "notifications.example.com",
  "warmupSkipped": true
}
```

### Get Domain Rate Limits

View the current rate limit configuration and usage for a specific domain. All fields are `null` if no custom limits have been set (the global tenant limits apply instead).

```
GET /v1/agent/domains/:domainId/rate-limits
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

Set per-domain sending rate limits. Pass `null` to remove a custom limit and fall back to the global tenant default. All fields are optional — only provided fields are updated. Raising a limit, or clearing one to unlimited (`null`) where one was set, is a loosening, gated per [Agents may tighten, never loosen](#agents-may-tighten-never-loosen) (`kind: "domain-rate-limits"`, `id`: the domain id); lowering a limit, or setting one where none existed, always works. A single request touching several fields is a loosening if any one of them loosens.

```
PATCH /v1/agent/domains/:domainId/rate-limits
Authorization: Bearer mm_live_...
Content-Type: application/json

{
  "maxPerMinute": 100,
  "maxPerHour": 1000,
  "maxPerDay": null
}
```

Response:
```json
{
  "id": "domain-uuid",
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
  "openTracking": true,
  "clickTracking": true,
  "trackingSubdomain": "links"
}
```

Response:
```json
{
  "id": "domain-uuid",
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
