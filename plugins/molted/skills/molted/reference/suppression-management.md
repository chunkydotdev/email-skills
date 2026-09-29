<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Suppression Management

Manage suppression lists and consent records. Suppressions prevent sends at the policy layer.

### Add a Suppression

```
POST /v1/suppressions
```

```json
{
  "tenantId": "your-tenant-id",
  "recipientEmail": "bob@example.com",
  "scope": "tenant",
  "reasonCode": "manual_dnc",
  "source": "agent-retention"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `tenantId` | yes | Your tenant identifier |
| `recipientEmail` | yes | Email address to suppress |
| `scope` | yes | `tenant` or `campaign` |
| `reasonCode` | yes | Reason code (see table below) |
| `source` | no | Source identifier (e.g., agent name) |
| `campaignId` | no | Campaign ID (required when scope is `campaign`) |
| `sourceEventId` | no | ID of the event that triggered this suppression |
| `expiresAt` | no | ISO 8601 expiry timestamp. Permanent if omitted. |

| Scope | Description |
|-------|-------------|
| `tenant` | Suppressed for your tenant only |
| `campaign` | Recorded for a specific campaign. **Not enforced on sends yet (#1932):** no send path passes a campaign, so a campaign row never blocks a send. Use `tenant` to stop mail. |

Platform-wide (`global`) suppressions are reserved for automated
complaint/hard-bounce handling by Molted's webhook pipeline and cannot be
created via tenant API keys. Sending `scope: "global"` returns `403
global_scope_not_allowed`.

| Reason Code | Description |
|-------------|-------------|
| `complaint` | Spam complaint received |
| `hard_bounce` | Hard bounce on delivery |
| `manual_dnc` | Manually added do-not-contact |
| `legal_request` | GDPR/legal erasure request |
| `role_account` | Role-based address (info@, support@, etc.) |

### Check a Suppression

```
GET /v1/suppressions/check?tenantId=your-tenant-id&email=bob@example.com
GET /v1/suppressions/check?tenantId=your-tenant-id&domain=competitor.com
```

Answers with the send gate's own check and the same inputs a send uses, so it matches what a send would do: email and domain suppressions, tenant and platform-wide rows, and expiry (an expired row is clear; a domain row counts for every address at it; a campaign-scoped row is clear, since sends don't enforce those yet). Pass exactly one of `email` or `domain`, once (else `400 invalid_params`). If the lookup fails, the answer is `503 suppression_check_unavailable`, never "clear": don't send until it answers.

```json
{ "email": "bob@example.com", "suppressed": true, "reason": "manual_dnc", "matchedOn": "domain" }
```

`matchedOn` is `email` or `domain`, and `reason` the matching row's reason code; both are `null` when clear. Use this, not the list, to decide whether you can send.

### List Suppressions

```
GET /v1/suppressions?tenantId=your-tenant-id&recipientEmail=bob@example.com
GET /v1/suppressions?tenantId=your-tenant-id&limit=50&offset=100
```

Newest first. `limit` (1-500) and `offset` (0-1,000,000, digits only) page the list; with neither, it returns every row for `recipientEmail`, or the latest 100. `GET /v1/suppressed-domains` takes the same `limit` and `offset` (without them it returns every domain suppression). A bad value is `400 invalid_paging`.

### Remove a Suppression

```
DELETE /v1/suppressions/:id?tenantId=your-tenant-id
```

### Domain Suppressions

Suppress all addresses at a domain (e.g., block sends to `@competitor.com`):

```
POST /v1/suppressed-domains
```

```json
{
  "tenantId": "your-tenant-id",
  "domain": "competitor.com",
  "reasonCode": "manual_dnc",
  "source": "agent-cleanup"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `tenantId` | yes | Your tenant identifier |
| `domain` | yes | Domain to suppress (e.g., `competitor.com`) |
| `reasonCode` | yes | Same reason codes as email suppressions |
| `source` | no | Source identifier |

```
GET /v1/suppressed-domains?tenantId=your-tenant-id
```

```
DELETE /v1/suppressed-domains/competitor.com?tenantId=your-tenant-id
```

### Record Consent

```
POST /v1/consent
```

```json
{
  "tenantId": "your-tenant-id",
  "recipientEmail": "alice@example.com",
  "basis": "explicit_opt_in",
  "source": "signup-form",
  "jurisdiction": "EU"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `tenantId` | yes | Your tenant identifier |
| `recipientEmail` | yes | Contact email address |
| `basis` | yes | `explicit_opt_in`, `legitimate_interest`, `contractual`, or `legal_obligation` |
| `source` | no | Where consent was collected (e.g., `signup-form`) |
| `jurisdiction` | no | Legal jurisdiction (e.g., `EU`, `US-CA`) |
| `grantedAt` | no | ISO 8601 timestamp of when consent was granted. Defaults to now (server stamps the request time). |
| `revokedAt` | no | ISO 8601 timestamp if consent has been revoked. |

Response includes the full inserted record so callers can confirm the stored timestamps without an extra `consent check` round-trip:

```json
{
  "id": "consent-uuid",
  "tenantId": "your-tenant-id",
  "recipientEmail": "alice@example.com",
  "basis": "explicit_opt_in",
  "source": "signup-form",
  "jurisdiction": "EU",
  "grantedAt": "2026-04-20T17:30:00.000Z",
  "revokedAt": null,
  "createdAt": "2026-04-20T17:30:00.000Z"
}
```

### Check Consent

```
GET /v1/consent?tenantId=your-tenant-id&recipientEmail=alice@example.com
```

Recording and checking consent is always available, but by default it is only a ledger -- it does not by itself change what a send does. A tenant opts the policy engine into enforcing it via the `requireConsentForMarketing` tenant setting (see Tenant Settings above, default `false`); once on, a MARKETING template send without active consent is blocked with reason `no_consent` (see Policy Rules Evaluated above).

---
