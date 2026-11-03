<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Suppression Management

Manage suppression lists and consent records. Suppressions prevent sends at the policy layer. Adding one (a tightening) is open to a mailbox-scoped key that holds `send` or `manage` on at least one mailbox; removing one needs a key that reaches every mailbox with the `manage` scope, and for an agent it is a human decision (see below).

**CLI:** `molted suppressions add --email <e> --reason <code> [--scope tenant|campaign]`, `molted suppressions list [--email] [--limit] [--offset]`, `molted suppressions check --email <e> | --domain <d>`, `molted suppressions remove <id>`, `molted suppressions add-domain|list-domains|remove-domain`, `molted suppressions import --file <csv|json> [--dry-run] [--skip-invalid]`, `molted consent record|check`. **MCP:** `add_suppression`, `check_suppression`, `list_suppressions`, `remove_suppression`, `record_consent`, `check_consent`.

### Add a Suppression

```
POST /v1/suppressions
```

```json
{
  "recipientEmail": "bob@example.com",
  "scope": "tenant",
  "reasonCode": "manual_dnc",
  "source": "agent-retention"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `tenantId` | no | Only on `api.molted.email`, where it is required; the base URL fills it in from your key |
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
| `campaign` | Recorded against `campaignId`. Currently blocks every send to that address from your tenant, the same as `tenant` scope (#1932): it is not yet limited to just the named campaign (tracked in #1984). |

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
| `domain_suppressed` | Entire domain is suppressed |
| `no_engagement` | Contact hasn't engaged (consider pairing with `expiresAt`) |

### Bulk Add Suppressions

For migrating bounces/unsubscribes from another provider. Unlike `POST /v1/suppressions` above, this route takes an array and is agent-key only (Bearer, not cookie):

```
POST /v1/ops/suppressions/bulk
Authorization: Bearer mm_live_...
```

```json
{
  "entries": [
    { "recipientEmail": "a@example.com", "scope": "tenant", "reasonCode": "hard_bounce" },
    { "recipientEmail": "b@example.com", "scope": "tenant", "reasonCode": "manual_dnc", "source": "provider-migration" }
  ]
}
```

Response: `{ "added": 2, "results": [{ "id": "..." }, { "id": "..." }] }`

Caveats (the CLI's `suppressions import` handles all of these for you):
- Almost no request-body validation: only that `entries` is an array (`400` otherwise) and that no entry uses the reserved `source: "portal_keep_away"` (`400 reserved_source`, checked before anything is written). Nothing checks that `recipientEmail` is present or that `scope`/`reasonCode` are accepted values -- a malformed entry can land a bad row. Validate `recipientEmail`, `scope`, `reasonCode`, and that `campaignId` is set when `scope` is `campaign`, yourself before sending.
- `scope: "global"` still 403s (`global_scope_not_allowed`), but it does so **partway through the array**: entries before it in the same request are already committed since each row is inserted individually, not in one transaction (tracked in #1907). Filter out `global` entries first.
- No cap on `entries` length, but the request body is capped by the API's ~100 KB JSON limit and the mailbox proxy's 30s timeout -- chunk large imports (the CLI uses 500 rows per request).

### Check a Suppression

```
GET /v1/suppressions/check?email=bob@example.com
GET /v1/suppressions/check?domain=competitor.com
```

Answers with the send gate's own check and the same inputs a send uses, so it matches what a send would do: email and domain suppressions, tenant and platform-wide rows, and expiry (an expired row is clear; a domain row counts for every address at it; a campaign-scoped row blocks the same as a tenant-scoped one, #1932). Pass exactly one of `email` or `domain`, once (else `400 invalid_params`). If the lookup fails, the answer is `503 suppression_check_unavailable`, never "clear": don't send until it answers.

```json
{ "email": "bob@example.com", "suppressed": true, "reason": "manual_dnc", "matchedOn": "domain" }
```

`matchedOn` is `email` or `domain`, and `reason` the matching row's reason code; both are `null` when clear. Use this, not the list, to decide whether you can send.

### List Suppressions

```
GET /v1/suppressions?recipientEmail=bob@example.com
GET /v1/suppressions?limit=50&offset=100
```

Newest first. `limit` (1-500) and `offset` (0-1,000,000, digits only) page the list; with neither, it returns every row for `recipientEmail`, or the latest 100. `GET /v1/suppressed-domains` takes the same `limit` and `offset` (without them it returns every domain suppression). A bad value is `400 invalid_paging`.

### Remove a Suppression

```
DELETE /v1/suppressions/:id
```

Loosening -- see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen). Adding a suppression stays open.

Removes one row. An address can have more than one (a tenant-scoped row plus one or more campaign-scoped rows, all enforced the same way, #1932): removing this id does not mean the contact can receive email again if another row for it still exists. List every row for the address (`GET /v1/suppressions?recipientEmail=...`), remove each one, then confirm with the check endpoint before sending.

### Domain Suppressions

Suppress all addresses at a domain (e.g., block sends to `@competitor.com`):

```
POST /v1/suppressed-domains
```

```json
{
  "domain": "competitor.com",
  "reasonCode": "manual_dnc",
  "source": "agent-cleanup"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `tenantId` | no | Only on `api.molted.email`, where it is required; the base URL fills it in from your key |
| `domain` | yes | Domain to suppress (e.g., `competitor.com`) |
| `reasonCode` | yes | Same reason codes as email suppressions |
| `source` | no | Source identifier |

```
GET /v1/suppressed-domains
```

```
DELETE /v1/suppressed-domains/competitor.com
```

Loosening, the same as removing a single suppression -- see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen).

### Record Consent

```
POST /v1/consent
```

```json
{
  "recipientEmail": "alice@example.com",
  "basis": "explicit_opt_in",
  "source": "signup-form",
  "jurisdiction": "EU"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `tenantId` | no | Only on `api.molted.email`, where it is required; the base URL fills it in from your key |
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
GET /v1/consent?recipientEmail=alice@example.com
```

Recording and checking consent is always available, but by default it is only a ledger -- it does not by itself change what a send does. A tenant opts the policy engine into enforcing it via the `requireConsentForMarketing` tenant setting (see Tenant Settings above, default `false`); once on, a MARKETING template send without active consent is blocked with reason `no_consent` (see Policy Rules Evaluated above).

---
