<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Inbound Webhook Mappings

Inbound webhook mappings let you receive webhooks from external services (Clerk, Stripe, Supabase Auth, etc.) and automatically route the data into Molted features -- sync contacts, subscribe to lists, or trigger journeys. No code required.

### Create an Inbound Webhook Mapping

```
POST /v1/agent/inbound-hooks?tenantId=T
```

Body:
```json
{
  "name": "Clerk Signups",
  "source": "clerk",
  "emailPath": "data.email_addresses[0].email_address",
  "fieldMappings": {
    "name": "data.first_name",
    "clerkId": "data.id"
  },
  "actions": [
    { "type": "sync_contact" },
    { "type": "subscribe_to_list", "listId": "lst_abc", "requireConfirmation": true }
  ]
}
```

`requireConfirmation` on `subscribe_to_list` is optional (default `false`). This endpoint is a public, token-authenticated form URL, so two safeguards always apply regardless of the setting: an unsubscribed address is never reactivated by a resubmission (with confirmation on, it starts a fresh confirmation cycle instead), and a suppressed address is never activated. With confirmation on, a new or reactivating address goes to `pending` and emits a `list.subscribe.pending` journey event (same event the Lists API uses) instead of subscribing immediately -- configure a journey on that event to send the confirmation email. The public response never reveals which case occurred.

Response includes a `urlToken` field. The webhook receiver URL is:
```
POST /v1/hooks/{urlToken}
```

Paste this URL into your external provider's webhook settings.

**Security model:** the receiver endpoint is authenticated by the URL token alone -- there is no provider-side signature verification in this MVP. Treat tokens as secrets and rotate them (delete + recreate) if a URL leaks. Per-token rate limit: 120 requests per 60 seconds; excess deliveries return `429`.

### List Inbound Webhook Mappings

```
GET /v1/agent/inbound-hooks?tenantId=T
```

### Get Inbound Webhook Mapping

```
GET /v1/agent/inbound-hooks/:id?tenantId=T
```

### Update Inbound Webhook Mapping

```
PATCH /v1/agent/inbound-hooks/:id?tenantId=T
```

Body (all fields optional):
```json
{
  "name": "Updated name",
  "emailPath": "data.email",
  "fieldMappings": { "name": "data.name" },
  "actions": [{ "type": "sync_contact" }],
  "enabled": false
}
```

### Delete Inbound Webhook Mapping

```
DELETE /v1/agent/inbound-hooks/:id?tenantId=T
```

### View Delivery Logs

```
GET /v1/agent/inbound-hooks/:id/logs?tenantId=T&limit=50
```

Returns recent delivery logs with status (`processed`, `partial`, `failed`, `rejected`), per-action execution results, error messages, and (since #1643) the extracted `extractedEmail` / `extractedFields` and a `payloadHash` of the raw delivery. This log row itself never stores the raw payload -- only what was extracted (each field capped at 2000 bytes) plus the hash, so a delivery can be understood and, given the original payload again (a support ticket, the sender's own copy), verified byte-for-byte. Note this is narrower than "the raw payload is never stored anywhere": a `trigger_journey` action still passes the full raw payload into the journey event it creates, same as before this change, so journey `trigger_conditions` can match against it.

### Test an Inbound Webhook Mapping (Dry Run)

```
POST /v1/agent/inbound-hooks/:id/test?tenantId=T
```

Body:
```json
{ "payload": { "data": { "email": "a@b.com", "first_name": "Ada" } } }
```

Runs the same email/field extraction as a real delivery against the sample payload and reports what it *would* do, with no side effects: no contact upsert, no list subscription, no journey event, and no delivery log row written. Response:
```json
{
  "wouldSucceed": true,
  "enabled": true,
  "extracted": { "email": "a@b.com", "fields": { "name": "Ada" } },
  "actions": [
    { "type": "sync_contact", "description": "Upsert contact with mapped fields" },
    { "type": "trigger_journey", "eventName": "signup", "description": "Fire event \"signup\" to start any journey that triggers on it" }
  ]
}
```

If the sample payload's `emailPath` doesn't resolve to a valid address, `wouldSucceed` is `false` and `actions` is empty -- matching what a real delivery would do (no actions run when the email can't be extracted). If the mapping is disabled, `wouldSucceed` is `false` and `enabled` is `false` -- a real delivery would be rejected (`422`) before any action runs.

### Receive a Webhook (External Providers)

```
POST /v1/hooks/:token
```

This is the public receiver endpoint -- no auth required. External services (Clerk, Stripe, etc.) POST their webhook payloads here. Molted extracts the email, maps fields, and executes configured actions.

### Email Path Syntax

Use dot notation with array index support:

| Provider | emailPath |
|----------|----------|
| Clerk | `data.email_addresses[0].email_address` |
| Stripe | `data.object.email` |
| Supabase Auth | `record.email` |

### Action Types

| Action | Description | Parameter |
|--------|------------|-----------|
| `sync_contact` | Upsert contact with mapped fields | None |
| `subscribe_to_list` | Add contact to a list | `listId` (required), `requireConfirmation` (optional, default `false`) |
| `trigger_journey` | Fire an event to start a journey | `eventName` (required) |

Actions execute sequentially. Failed actions are logged but don't block subsequent actions.
