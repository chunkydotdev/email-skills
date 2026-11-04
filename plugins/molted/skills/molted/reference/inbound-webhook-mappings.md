<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Inbound Webhook Mappings

Inbound webhook mappings let you receive webhooks from external services (Clerk, Stripe, Supabase Auth, etc.) and automatically route the data into Molted features -- sync contacts, subscribe to lists, or trigger journeys. No code required. An app connected through OAuth cannot create or change mappings (`403 oauth_forbidden`).

**CLI:** `molted inbound-hooks create|list|get|update|delete|logs|test`. No MCP tool.

### Create an Inbound Webhook Mapping

```
POST /v1/agent/inbound-hooks
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

`requireConfirmation` on `subscribe_to_list` is optional (default `false`). This endpoint is a public, token-authenticated form URL, so two safeguards always apply regardless of the setting: an unsubscribed address is never reactivated by a resubmission (with confirmation on, it starts a fresh confirmation cycle instead), in any spelling the Lists API treats as the same address and even after the contact was deleted and recreated or renamed, and a suppressed address is never activated. With confirmation on, a new or reactivating address goes to `pending` and emits a `list.subscribe.pending` journey event (same event the Lists API uses) instead of subscribing immediately -- configure a journey on that event to send the confirmation email. The public response never reveals which case occurred. A third safeguard: an archived list (see [Archive a list](#list--get--update--archive-lists)) refuses this action the same way it refuses `POST /v1/agent/lists/:id/subscribers` -- the action fails as if the list did not exist.

Response includes a `urlToken` field. The webhook receiver URL is:
```
POST /v1/hooks/{urlToken}
```

Paste this URL into your external provider's webhook settings.

The token is a credential. `GET /v1/agent/inbound-hooks` and `GET /v1/agent/inbound-hooks/:id` return it only when the key's creator is an admin or the owner; for a member's or a viewer's key, `urlToken` is `null`. Keep the token from the create response.

**Security model:** the receiver endpoint is authenticated by the URL token alone -- there is no provider-side signature verification in this MVP. Treat tokens as secrets and rotate them (delete + recreate) if a URL leaks. Per-token rate limit: 120 requests per 60 seconds; excess deliveries return `429`.

### List Inbound Webhook Mappings

```
GET /v1/agent/inbound-hooks
```

### Get Inbound Webhook Mapping

```
GET /v1/agent/inbound-hooks/:id
```

### Update Inbound Webhook Mapping

```
PATCH /v1/agent/inbound-hooks/:id
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
DELETE /v1/agent/inbound-hooks/:id
```

### View Delivery Logs

```
GET /v1/agent/inbound-hooks/:id/logs?limit=50
```

Returns recent delivery logs with status (`processed`, `partial`, `failed`, `rejected`), per-action execution results, error messages, and (since #1643) the extracted `extractedEmail` / `extractedFields` and a `payloadHash` of the raw delivery. This log row itself never stores the raw payload -- only what was extracted (each field capped at 2000 bytes) plus the hash, so a delivery can be understood and, given the original payload again (a support ticket, the sender's own copy), verified byte-for-byte. Note this is narrower than "the raw payload is never stored anywhere": a `trigger_journey` action still passes the full raw payload into the journey event it creates, same as before this change, so journey `trigger_conditions` can match against it.

### Test an Inbound Webhook Mapping (Dry Run)

```
POST /v1/agent/inbound-hooks/:id/test
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
| `sync_contact` | Upsert contact with mapped fields: finds the contact by any spelling of the address (case, `+tag`, Gmail dots, display name) and updates it, or creates it in the canonical form | None |
| `subscribe_to_list` | Add contact to a list | `listId` (required), `requireConfirmation` (optional, default `false`) |
| `trigger_journey` | Fire an event to start a journey | `eventName` (required) |

Actions execute sequentially. Failed actions are logged but don't block subsequent actions.
