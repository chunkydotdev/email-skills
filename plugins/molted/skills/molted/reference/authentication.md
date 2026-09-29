<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Authentication

Every request requires a Bearer token and your tenant ID:

```
Authorization: Bearer mm_live_...
```

Include `tenantId` in the request body (POST) or query string (GET/DELETE) for every call.

Keys can be scoped to specific mailboxes with granular permissions:

| Permission | Capabilities |
|------------|-------------|
| `read` | View emails, threads, metrics for the mailbox |
| `send` | Send and propose emails from the mailbox |
| `manage` | Update settings, approve/reject approval queue, archive emails |

A key with no mailbox scopes has access to all mailboxes (wildcard). New keys created in the portal default to explicit mailbox scoping.

Example: An onboarding agent's key might have `read` + `send` on the support mailbox only, while a monitoring key has `read` on all mailboxes.

### List API keys

```
GET /v1/agent/keys?tenantId=your-tenant-id
Authorization: Bearer mm_live_...
```

Needs a key with access to all mailboxes: a mailbox-scoped key gets 403 `mailbox_scope_denied`.

### Create an API key

```
POST /v1/agent/keys
Authorization: Bearer mm_live_...
Content-Type: application/json

{ "tenantId": "your-tenant-id", "label": "worker-2" }
```

Mint a **scoped** key by adding `scopeAllMailboxes` or `mailboxScopes`. You may
only scope a key to mailboxes your own tenant owns — the API returns `403
mailbox_not_owned` otherwise. The raw key is returned once in the `rawKey`
field; store it then.

A key mints only keys within its own scope: a label-only key is an all-mailbox
admin key, so a scoped key must pass `mailboxScopes` within its own. Anything
wider is a human decision (`403 human_decision_required`, see
[Agents may tighten, never loosen](#agents-may-tighten-never-loosen)).

```
{ "tenantId": "your-tenant-id", "label": "sender",
  "mailboxScopes": [{ "mailboxId": "mbx_...", "permissions": ["read", "send"] }] }
```

CLI (routes through the mailbox automatically — no tenantId needed):

```
molted auth keys create --label sender --mailbox mbx_... --permissions read,send
molted auth keys create --label ops --scope-all
molted auth keys create --label multi --scope mbx_a:read,send --scope mbx_b:read
molted auth keys update <id> --mailbox mbx_... --permissions manage
molted auth keys list
molted auth keys revoke <id>
```

### Update API key scopes

An agent may only narrow itself or a key it minted; widening a key is a human decision.

```
PATCH /v1/agent/keys/:id
Authorization: Bearer mm_live_...
Content-Type: application/json

{ "tenantId": "your-tenant-id", "scopeAllMailboxes": false, "mailboxScopes": [{ "mailboxId": "mbx_...", "permissions": ["read", "send"] }] }
```

### Revoke an API key

An agent may revoke itself or a key it minted; revoking any other key is a human decision.

```
DELETE /v1/agent/keys/:id?tenantId=your-tenant-id
Authorization: Bearer mm_live_...
```
